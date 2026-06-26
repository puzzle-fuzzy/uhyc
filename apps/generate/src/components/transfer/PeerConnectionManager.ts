// ---------------------------------------------------------------------------
// PeerConnectionManager — WebRTC 连接管理 + DataChannel 分片传输
//
// 每笔传输使用独立的 RTCPeerConnection（状态隔离）。
// 信令通过外部 relay 函数走 WS，不直接依赖 WS 实例。
// ---------------------------------------------------------------------------

const CHUNK_SIZE = 65536 // 64 KB
const OFFER_TIMEOUT = 5000 // 5s 等不到 answer 视为对方离线

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// DataChannel 消息类型
const MT = {
  META: 0x01,
  CHUNK: 0x02,
  COMPLETE: 0x03,
  PROGRESS: 0x04,
} as const

/* ------------------------------------------------------------------ */
/*  类型定义                                                           */
/* ------------------------------------------------------------------ */

export interface SignalPayload {
  type: 'signal'
  transferId: string
  to: string
  from?: string
  sdp?: string
  candidate?: RTCIceCandidateInit
  label: 'offer' | 'answer' | 'ice'
}

export interface TransferOffer {
  type: 'transfer-offer'
  transferId: string
  to: string
  from?: string
  fileName: string
  fileSize: number
  mimeType: string
}

export interface TransferAnswer {
  type: 'transfer-answer'
  transferId: string
  to: string
  from?: string
  accepted: true
}

export interface TransferReject {
  type: 'transfer-reject'
  transferId: string
  to: string
  from?: string
}

export type SignalingMessage =
  | SignalPayload
  | TransferOffer
  | TransferAnswer
  | TransferReject

export interface TransferHandle {
  transferId: string
  fileName: string
  fileSize: number
  peerUserId: string
  peerName: string
  direction: 'send' | 'receive'
  status: 'connecting' | 'transferring' | 'done' | 'failed'
  progress: number // 0-1
  abort: () => void
}

type SignalRelay = (msg: SignalingMessage) => void

interface TransferState {
  handle: TransferHandle
  pc: RTCPeerConnection | null
  dc: RTCDataChannel | null
  chunks: ArrayBuffer[]
  receivedBytes: number
  totalChunks: number
  abortFlag: boolean
}

/* ------------------------------------------------------------------ */
/*  Manager                                                           */
/* ------------------------------------------------------------------ */

export class PeerConnectionManager {
  private transfers = new Map<string, TransferState>()
  private pendingOffers_: TransferOffer[] = []
  signalRelay: SignalRelay

  /* ---- 事件回调 ---- */

  /** 收到新传输邀约（接收方展示用） */
  onIncomingRequest: ((offers: TransferOffer[]) => void) | null = null

  /** 接收方完成时拿到 Blob */
  onComplete:
    | ((transferId: string, blob: Blob, fileName: string) => void)
    | null = null

  /** 进度更新 */
  onProgress:
    | ((transferId: string, bytesDone: number, total: number) => void)
    | null = null

  /** 传输失败 / 对方拒绝 */
  onError: ((transferId: string, error: string) => void) | null = null

  get pendingOffers(): readonly TransferOffer[] {
    return this.pendingOffers_
  }

  constructor(signalRelay: SignalRelay) {
    this.signalRelay = signalRelay
  }

  /* ---------------------------------------------------------------- */
  /*  发送方                                                          */
  /* ---------------------------------------------------------------- */

  async initiateTransfer(
    peerUserId: string,
    peerName: string,
    file: File,
  ): Promise<TransferHandle> {
    const transferId = crypto.randomUUID()
    const state = this.createState(
      transferId,
      file.name,
      file.size,
      peerUserId,
      peerName,
      'send',
    )

    try {
      // Phase 1: 发送 transfer-offer，等接收方点击接受
      this.signalRelay({
        type: 'transfer-offer',
        transferId,
        to: peerUserId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })
      await this.waitForAnswer(transferId) // resolves on transfer-answer

      // Phase 2: 接收方已接受，开始 WebRTC 建连
      const pc = new RTCPeerConnection(RTC_CONFIG)
      state.pc = pc

      const dc = pc.createDataChannel('file-transfer')
      state.dc = dc
      this.bindDataChannel(dc, state, file)

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.signalRelay({
            type: 'signal',
            transferId,
            to: peerUserId,
            candidate: e.candidate.toJSON(),
            label: 'ice',
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'failed' ||
          pc.connectionState === 'disconnected'
        ) {
          this.failTransfer(transferId, `连接断开: ${pc.connectionState}`)
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // 等 ICE gathering 完成
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') resolve()
        else {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve()
          }
          setTimeout(resolve, 2000)
        }
      })

      this.signalRelay({
        type: 'signal',
        transferId,
        to: peerUserId,
        sdp: pc.localDescription?.sdp,
        label: 'offer',
      })

      // 等 signal(answer) 回到 sender
      await this.waitForSignalAnswer(transferId)

      return state.handle
    } catch (e) {
      const msg = e instanceof Error ? e.message : '发起传输失败'
      this.failTransfer(transferId, msg)
      throw e
    }
  }

  /* ---------------------------------------------------------------- */
  /*  接收方：显式接受 / 拒绝                                          */
  /* ---------------------------------------------------------------- */

  acceptOffer(transferId: string): void {
    const offer = this.pendingOffers_.find((o) => o.transferId === transferId)
    if (!offer) return
    this.pendingOffers_ = this.pendingOffers_.filter(
      (o) => o.transferId !== transferId,
    )

    // 发送 answer 通知发送方
    this.signalRelay({
      type: 'transfer-answer',
      transferId,
      to: offer.from!,
      accepted: true,
    })

    // 创建接收方的 transfer state（待 handleOffer 填充 pc/dc）
    this.createState(
      transferId,
      offer.fileName,
      offer.fileSize,
      offer.from!,
      '未知',
      'receive',
    )

    this.onIncomingRequest?.(this.pendingOffers_)
  }

  rejectOffer(transferId: string): void {
    const offer = this.pendingOffers_.find((o) => o.transferId === transferId)
    if (!offer) return
    this.pendingOffers_ = this.pendingOffers_.filter(
      (o) => o.transferId !== transferId,
    )

    this.signalRelay({
      type: 'transfer-reject',
      transferId,
      to: offer.from!,
    })

    this.onIncomingRequest?.(this.pendingOffers_)
  }

  /* ---------------------------------------------------------------- */
  /*  信令入口                                                        */
  /* ---------------------------------------------------------------- */

  handleSignal(msg: SignalingMessage): void {
    switch (msg.type) {
      case 'signal': {
        const { transferId, label, sdp, candidate, from } = msg as SignalPayload
        if (label === 'offer' && sdp) {
          this.handleOffer(transferId, sdp, from!)
          return
        }
        if (label === 'answer' && sdp) {
          this.handleAnswer(transferId, sdp)
          this.resolveSignalAnswer(transferId)
          return
        }
        if (label === 'ice' && candidate) {
          this.handleIceCandidate(transferId, candidate)
          return
        }
        break
      }

      case 'transfer-offer': {
        const offer = msg as TransferOffer
        this.pendingOffers_ = [...this.pendingOffers_, offer]
        this.onIncomingRequest?.(this.pendingOffers_)
        break
      }

      case 'transfer-answer': {
        // 发送方收到 → 接收方已点击接受
        this.resolveAnswer(msg.transferId)
        break
      }

      case 'transfer-reject': {
        this.failTransfer(msg.transferId, '对方拒绝了文件')
        break
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  状态查询 / 清理                                                  */
  /* ---------------------------------------------------------------- */

  getTransfers(): TransferHandle[] {
    return Array.from(this.transfers.values()).map((s) => s.handle)
  }

  dispose(): void {
    for (const [, state] of this.transfers) {
      state.dc?.close()
      state.pc?.close()
    }
    this.transfers.clear()
    this.pendingOffers_ = []
  }

  /* ---------------------------------------------------------------- */
  /*  内部 — 接收方处理 offer                                          */
  /* ---------------------------------------------------------------- */

  private async handleOffer(
    transferId: string,
    sdp: string,
    fromUserId: string,
  ) {
    const pc = new RTCPeerConnection(RTC_CONFIG)

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.signalRelay({
          type: 'signal',
          transferId,
          to: fromUserId,
          candidate: e.candidate.toJSON(),
          label: 'ice',
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected'
      ) {
        this.failTransfer(transferId, `连接断开: ${pc.connectionState}`)
      }
    }

    pc.ondatachannel = (e) => {
      const dc = e.channel
      const state = this.transfers.get(transferId)
      if (state) {
        state.dc = dc
        state.pc = pc
      }
      this.bindDataChannel(
        dc,
        state ||
          this.createState(transferId, '接收中…', 0, fromUserId, '未知', 'receive'),
      )
    }

    await pc.setRemoteDescription({ type: 'offer', sdp })

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    this.signalRelay({
      type: 'signal',
      transferId,
      to: fromUserId,
      sdp: answer.sdp,
      label: 'answer',
    })
  }

  private async handleAnswer(transferId: string, sdp: string) {
    const state = this.transfers.get(transferId)
    if (!state?.pc) return
    await state.pc.setRemoteDescription({ type: 'answer', sdp })
  }

  private async handleIceCandidate(
    transferId: string,
    candidateInit: RTCIceCandidateInit,
  ) {
    const state = this.transfers.get(transferId)
    if (!state?.pc) return
    try {
      await state.pc.addIceCandidate(new RTCIceCandidate(candidateInit))
    } catch {
      // 忽略无效 candidate
    }
  }

  /* ---------------------------------------------------------------- */
  /*  内部 — DataChannel 绑定 + 分片传输                               */
  /* ---------------------------------------------------------------- */

  private bindDataChannel(
    dc: RTCDataChannel,
    state: TransferState,
    file?: File,
  ) {
    dc.binaryType = 'arraybuffer'

    dc.onopen = () => {
      if (state.handle.direction === 'send' && file) {
        state.handle.status = 'transferring'
        this.sendFile(dc, state, file)
      }
    }

    dc.onclose = () => {
      if (
        state.handle.status !== 'done' &&
        state.handle.status !== 'failed'
      ) {
        this.failTransfer(state.handle.transferId, '连接已关闭')
      }
    }

    dc.onmessage = (e) => {
      if (state.handle.direction === 'receive') {
        this.receiveChunk(e.data as ArrayBuffer, state)
      }
    }
  }

  /* ---- 发送分片 ---- */

  private async sendFile(
    dc: RTCDataChannel,
    state: TransferState,
    file: File,
  ) {
    const chunkCount = Math.ceil(file.size / CHUNK_SIZE)

    const meta = this.encodeMessage(
      MT.META,
      JSON.stringify({
        transferId: state.handle.transferId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        chunkCount,
      }),
    )
    dc.send(meta)
    state.totalChunks = chunkCount

    for (let i = 0; i < chunkCount; i++) {
      if (state.abortFlag) return

      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = await file.slice(start, end).arrayBuffer()

      const header = new Uint8Array(4)
      new DataView(header.buffer).setUint32(0, i)
      const payload = new Uint8Array(1 + 4 + chunk.byteLength)
      payload[0] = MT.CHUNK
      payload.set(header, 1)
      payload.set(new Uint8Array(chunk), 5)
      dc.send(payload.buffer)

      state.handle.progress = (i + 1) / chunkCount
      this.onProgress?.(state.handle.transferId, end, file.size)

      if (dc.bufferedAmount > 1024 * 1024) {
        await new Promise<void>((r) => {
          dc.onbufferedamountlow = () => r()
        })
      }
    }

    dc.send(
      this.encodeMessage(
        MT.COMPLETE,
        JSON.stringify({ transferId: state.handle.transferId }),
      ),
    )
    state.handle.status = 'done'
    this.onProgress?.(state.handle.transferId, file.size, file.size)
  }

  /* ---- 接收重组 ---- */

  private receiveChunk(buf: ArrayBuffer, state: TransferState) {
    const view = new Uint8Array(buf)
    const type = view[0]
    const payload = view.slice(1)

    switch (type) {
      case MT.META: {
        const meta = JSON.parse(new TextDecoder().decode(payload))
        state.handle.fileName = meta.fileName
        state.handle.fileSize = meta.fileSize
        state.chunks = new Array(meta.chunkCount)
        state.totalChunks = meta.chunkCount
        state.receivedBytes = 0
        state.handle.status = 'transferring'
        break
      }

      case MT.CHUNK: {
        const index = new DataView(payload.buffer).getUint32(0)
        const data = payload.slice(4)
        if (!state.chunks[index]) {
          state.chunks[index] = data.buffer
          state.receivedBytes += data.byteLength
          state.handle.progress = state.receivedBytes / state.handle.fileSize
          this.onProgress?.(
            state.handle.transferId,
            state.receivedBytes,
            state.handle.fileSize,
          )
        }
        break
      }

      case MT.COMPLETE: {
        const blob = new Blob(state.chunks, {
          type: 'application/octet-stream',
        })
        state.handle.status = 'done'
        state.handle.progress = 1
        this.onComplete?.(
          state.handle.transferId,
          blob,
          state.handle.fileName,
        )
        break
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  内部 — 辅助方法                                                  */
  /* ---------------------------------------------------------------- */

  private createState(
    transferId: string,
    fileName: string,
    fileSize: number,
    peerUserId: string,
    peerName: string,
    direction: 'send' | 'receive',
  ): TransferState {
    const state: TransferState = {
      handle: {
        transferId,
        fileName,
        fileSize,
        peerUserId,
        peerName,
        direction,
        status: 'connecting',
        progress: 0,
        abort: () => {
          state.abortFlag = true
          state.dc?.close()
          state.pc?.close()
          this.transfers.delete(transferId)
        },
      },
      pc: null,
      dc: null,
      chunks: [],
      receivedBytes: 0,
      totalChunks: 0,
      abortFlag: false,
    }
    this.transfers.set(transferId, state)
    return state
  }

  private failTransfer(transferId: string, error: string) {
    const state = this.transfers.get(transferId)
    if (!state) return
    state.handle.status = 'failed'
    state.dc?.close()
    state.pc?.close()
    this.onError?.(transferId, error)

    // 从 pending 中移除（防止卡住）
    this.pendingOffers_ = this.pendingOffers_.filter(
      (o) => o.transferId !== transferId,
    )
  }

  private waitForAnswer(transferId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.answerResolvers.delete(transferId)
        reject(new Error('对方不在线或未响应'))
      }, OFFER_TIMEOUT)

      this.answerResolvers.set(transferId, () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  private answerResolvers = new Map<string, () => void>()
  private signalAnswerResolvers = new Map<string, () => void>()

  private resolveAnswer(transferId: string) {
    this.answerResolvers.get(transferId)?.()
    this.answerResolvers.delete(transferId)
  }

  private waitForSignalAnswer(transferId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.signalAnswerResolvers.delete(transferId)
        reject(new Error('WebRTC 连接超时'))
      }, 10000)

      this.signalAnswerResolvers.set(transferId, () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }

  private resolveSignalAnswer(transferId: string) {
    this.signalAnswerResolvers.get(transferId)?.()
    this.signalAnswerResolvers.delete(transferId)
  }

  private encodeMessage(type: number, json: string): ArrayBuffer {
    const encoded = new TextEncoder().encode(json)
    const buf = new Uint8Array(1 + encoded.byteLength)
    buf[0] = type
    buf.set(encoded, 1)
    return buf.buffer
  }
}

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

export type SignalingMessage = SignalPayload | TransferOffer | TransferAnswer

export interface TransferHandle {
  transferId: string
  fileName: string
  fileSize: number
  peerUserId: string
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
  signalRelay: SignalRelay

  /** 收到传输邀约（接收方展示通知用） */
  onIncomingRequest: ((offer: TransferOffer) => void) | null = null

  /** 接收方完成时拿到 Blob */
  onComplete:
    | ((transferId: string, blob: Blob, fileName: string) => void)
    | null = null

  /** 任一方进度更新 */
  onProgress:
    | ((transferId: string, bytesDone: number, total: number) => void)
    | null = null

  /** 传输失败 */
  onError: ((transferId: string, error: string) => void) | null = null

  constructor(signalRelay: SignalRelay) {
    this.signalRelay = signalRelay
  }

  /* ---------------------------------------------------------------- */
  /*  发送方                                                          */
  /* ---------------------------------------------------------------- */

  async initiateTransfer(
    peerUserId: string,
    file: File,
  ): Promise<TransferHandle> {
    const transferId = crypto.randomUUID()
    const state = this.createState(transferId, file.name, file.size, peerUserId, 'send')

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG)
      state.pc = pc

      // DataChannel — 接收方通过 ondatachannel 事件拿到同一 channel
      const dc = pc.createDataChannel('file-transfer')
      state.dc = dc
      this.bindDataChannel(dc, state, file)

      // ICE 候选 → 经 WS 转发
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

      // 创建 offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // 等 ICE gathering 完成再发 offer（减少 ICE 候选交换次数）
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') resolve()
        else pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') resolve()
        }
        // 兜底：最多等 2s
        setTimeout(resolve, 2000)
      })

      // 发 offer（含完整 SDP + ICE candidates）
      this.signalRelay({
        type: 'signal',
        transferId,
        to: peerUserId,
        sdp: pc.localDescription?.sdp,
        label: 'offer',
      })

      // 等 answer（超时处理）
      await this.waitForAnswer(transferId)

      return state.handle
    } catch (e) {
      const msg = e instanceof Error ? e.message : '发起传输失败'
      this.failTransfer(transferId, msg)
      throw e
    }
  }

  /* ---------------------------------------------------------------- */
  /*  信令入口                                                        */
  /* ---------------------------------------------------------------- */

  handleSignal(msg: SignalingMessage): void {
    switch (msg.type) {
      case 'signal': {
        const { transferId, label, sdp, candidate, from } = msg as SignalPayload
        // 接收方收到 offer → 建连
        if (label === 'offer' && sdp) {
          this.handleOffer(transferId, sdp, from!)
          return
        }
        // 发送方收到 answer
        if (label === 'answer' && sdp) {
          this.handleAnswer(transferId, sdp)
          return
        }
        // ICE 候选
        if (label === 'ice' && candidate) {
          this.handleIceCandidate(transferId, candidate)
          return
        }
        break
      }

      case 'transfer-offer': {
        const offer = msg as TransferOffer
        this.onIncomingRequest?.(offer)
        // 自动应答
        this.signalRelay({
          type: 'transfer-answer',
          transferId: offer.transferId,
          to: offer.from!,
          accepted: true,
        })
        break
      }

      case 'transfer-answer': {
        const answer = msg as TransferAnswer
        this.resolveAnswer(answer.transferId)
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
  }

  /* ---------------------------------------------------------------- */
  /*  内部 — 接收方处理 offer                                          */
  /* ---------------------------------------------------------------- */

  private async handleOffer(
    transferId: string,
    sdp: string,
    fromUserId: string,
  ) {
    // 从 incoming request 中找到对应 offer 的信息
    // 这里用 temp 名称，等拿到 offer 对象后更新
    const tempName = `接收中...`
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

    // DataChannel 由发送方创建，接收方通过 ondatachannel 事件接收
    pc.ondatachannel = (e) => {
      const dc = e.channel
      // 此时还不知道文件名/大小，等第一个 META 消息
      const pendingState = this.transfers.get(transferId)
      if (pendingState) {
        pendingState.dc = dc
        pendingState.pc = pc
      }
      this.bindDataChannel(dc, pendingState || this.createState(transferId, tempName, 0, fromUserId, 'receive'))
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

  private async handleIceCandidate(transferId: string, candidateInit: RTCIceCandidateInit) {
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
      if (state.handle.status !== 'done' && state.handle.status !== 'failed') {
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

    // 0x01: 元数据
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

    // 0x02: 分片
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

      // 背压控制
      if (dc.bufferedAmount > 1024 * 1024) {
        await new Promise<void>((r) => { dc.onbufferedamountlow = () => r() })
      }
    }

    // 0x03: 完成
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
        this.onComplete?.(state.handle.transferId, blob, state.handle.fileName)
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
    direction: 'send' | 'receive',
  ): TransferState {
    const state: TransferState = {
      handle: {
        transferId,
        fileName,
        fileSize,
        peerUserId,
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
  }

  /** 等 answer 的 Promise，带超时 */
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

  private resolveAnswer(transferId: string) {
    this.answerResolvers.get(transferId)?.()
    this.answerResolvers.delete(transferId)
  }

  private encodeMessage(type: number, json: string): ArrayBuffer {
    const encoded = new TextEncoder().encode(json)
    const buf = new Uint8Array(1 + encoded.byteLength)
    buf[0] = type
    buf.set(encoded, 1)
    return buf.buffer
  }
}

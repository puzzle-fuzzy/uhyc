import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react'
import { usePresence, type PresenceUser } from '@uhyc/shared'
import { PeerConnectionManager, type TransferHandle, type TransferOffer } from './transfer/PeerConnectionManager'

// ---------------------------------------------------------------------------
// PresenceBridge
// ---------------------------------------------------------------------------

interface PresenceCallbacks {
  onTaskUpdated?: (task: Record<string, unknown>) => void
  onDisconnect?: () => void
}

interface PresenceCtxValue {
  onlineUsers: PresenceUser[]
  setCallbacks: (cbs: PresenceCallbacks) => void
  showAll: boolean
  setShowAll: (v: boolean) => void
  /** 发起 P2P 文件传输 */
  startTransfer: (peerUserId: string, peerName: string, file: File) => Promise<TransferHandle>
  /** 所有活跃传输的快照 */
  transfers: TransferHandle[]
  /** 待接收的文件邀约列表 */
  pendingOffers: readonly TransferOffer[]
  /** 接受文件 */
  acceptOffer: (transferId: string) => void
  /** 拒绝文件 */
  rejectOffer: (transferId: string) => void
  /** 传输完成回调（接收方拿到 Blob 时触发） */
  setOnTransferComplete: (fn: ((transferId: string, blob: Blob, fileName: string) => void) | null) => void
}

const PresenceCtx = createContext<PresenceCtxValue>({
  onlineUsers: [],
  setCallbacks: () => {},
  showAll: false,
  setShowAll: () => {},
  startTransfer: async () => { throw new Error('PresenceBridge not ready') },
  transfers: [],
  pendingOffers: [],
  acceptOffer: () => {},
  rejectOffer: () => {},
  setOnTransferComplete: () => {},
})

export function usePresenceCtx() {
  return useContext(PresenceCtx)
}

export function useSetPresenceCallbacks() {
  return useContext(PresenceCtx).setCallbacks
}

export function useDevMode() {
  const { showAll, setShowAll } = useContext(PresenceCtx)
  return { showAll, setShowAll }
}

export function useFileTransfer() {
  const { startTransfer, transfers, pendingOffers, acceptOffer, rejectOffer, setOnTransferComplete } =
    useContext(PresenceCtx)
  return { startTransfer, transfers, pendingOffers, acceptOffer, rejectOffer, setOnTransferComplete }
}

export function PresenceBridge({ children }: { children: ReactNode }) {
  const callbacksRef = useRef<PresenceCallbacks>({})
  const [showAll, setShowAll] = useState(false)
  const [transfers, setTransfers] = useState<TransferHandle[]>([])
  const [pendingOffers, setPendingOffers] = useState<readonly TransferOffer[]>([])
  const onTransferCompleteRef = useRef<
    ((transferId: string, blob: Blob, fileName: string) => void) | null
  >(null)
  const [onlineUsers, setOnlineUsersState] = useState<PresenceUser[]>([])

  const pcmRef = useRef<PeerConnectionManager | null>(null)
  if (!pcmRef.current) {
    pcmRef.current = new PeerConnectionManager(() => {
      // signalRelay will be set when WS is ready
    })
  }
  const pcm = pcmRef.current

  // WS 消息 → PCM
  const handleWsMessage = useCallback(
    (msg: Record<string, unknown>) => {
      const type = msg.type as string | undefined
      if (type === 'signal' || type === 'transfer-offer' || type === 'transfer-answer' || type === 'transfer-reject') {
        pcm.handleSignal(msg as unknown as Parameters<typeof pcm.handleSignal>[0])
        setTransfers(pcm.getTransfers())
        setPendingOffers(pcm.pendingOffers)
      }
    },
    [pcm],
  )

  // WS 就绪 → PCM relay
  const handleWsOpen = useCallback(
    (send: (data: unknown) => void) => {
      pcm.signalRelay = (msg) => send(msg)
    },
    [pcm],
  )

  const presenceResult = usePresence({
    onTaskUpdated: (task) => callbacksRef.current.onTaskUpdated?.(task),
    onDisconnect: () => callbacksRef.current.onDisconnect?.(),
    onMessage: handleWsMessage,
    onWsOpen: handleWsOpen,
  })

  // 同步 onlineUsers 到本组件 state（用于查用户名）
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const onlineUsersFromPresence = presenceResult.onlineUsers
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const prevOnlineUsersRef = useRef(onlineUsersFromPresence)
  if (prevOnlineUsersRef.current !== onlineUsersFromPresence) {
    prevOnlineUsersRef.current = onlineUsersFromPresence
    setOnlineUsersState(onlineUsersFromPresence)
  }

  // PCM 回调注册
  pcm.onProgress = () => {
    setTransfers(pcm.getTransfers())
  }
  pcm.onComplete = (_transferId, blob, fileName) => {
    setTransfers(pcm.getTransfers())
    onTransferCompleteRef.current?.(_transferId, blob, fileName)
  }
  pcm.onError = () => {
    setTransfers(pcm.getTransfers())
  }
  pcm.onIncomingRequest = () => {
    setPendingOffers(pcm.pendingOffers)
  }

  const setCallbacks = (cbs: PresenceCallbacks) => {
    callbacksRef.current = cbs
  }

  const startTransfer = useCallback(
    async (peerUserId: string, peerName: string, file: File) => {
      const handle = await pcm.initiateTransfer(peerUserId, peerName, file)
      setTransfers(pcm.getTransfers())
      return handle
    },
    [pcm],
  )

  const acceptOffer = useCallback(
    (transferId: string) => {
      pcm.acceptOffer(transferId)
      setPendingOffers(pcm.pendingOffers)
      setTransfers(pcm.getTransfers())
    },
    [pcm],
  )

  const rejectOffer = useCallback(
    (transferId: string) => {
      pcm.rejectOffer(transferId)
      setPendingOffers(pcm.pendingOffers)
    },
    [pcm],
  )

  const setOnTransferComplete = useCallback(
    (fn: ((transferId: string, blob: Blob, fileName: string) => void) | null) => {
      onTransferCompleteRef.current = fn
    },
    [],
  )

  return (
    <PresenceCtx.Provider
      value={{
        onlineUsers,
        setCallbacks,
        showAll,
        setShowAll,
        startTransfer,
        transfers,
        pendingOffers,
        acceptOffer,
        rejectOffer,
        setOnTransferComplete,
      }}
    >
      {children}
    </PresenceCtx.Provider>
  )
}

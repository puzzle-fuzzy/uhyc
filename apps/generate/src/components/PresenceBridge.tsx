import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react'
import { usePresence, type PresenceUser } from '@uhyc/shared'
import { PeerConnectionManager, type TransferHandle } from './transfer/PeerConnectionManager'

// ---------------------------------------------------------------------------
// PresenceBridge — 将 usePresence + 开发模式 + P2P 传输放在路由布局层
//
// 架构问题：
//   AppLayout（顶栏）需要渲染 AvatarStack + DEV 徽章，但 usePresence / showAll
//   原先在子路由（Studio）中调用，顶栏拿不到数据。
//
// 解法：
//   把共享状态提升到 PresenceBridge 中（包裹 AppLayout），
//   子路由通过 usePresenceCtx / useDevMode / useFileTransfer 读写。
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
  startTransfer: (peerUserId: string, file: File) => Promise<TransferHandle>
  /** 所有活跃传输的快照 */
  transfers: TransferHandle[]
  /** 注册传输事件回调 */
  onTransferComplete: ((transferId: string, blob: Blob, fileName: string) => void) | null
  setOnTransferComplete: (fn: ((transferId: string, blob: Blob, fileName: string) => void) | null) => void
}

const PresenceCtx = createContext<PresenceCtxValue>({
  onlineUsers: [],
  setCallbacks: () => {},
  showAll: false,
  setShowAll: () => {},
  startTransfer: async () => { throw new Error('PresenceBridge not ready') },
  transfers: [],
  onTransferComplete: null,
  setOnTransferComplete: () => {},
})

/** 供子路由（Studio / CreativityPage）获取 onlineUsers */
export function usePresenceCtx() {
  return useContext(PresenceCtx)
}

/** 供子路由注册 WS 推送回调（task_updated / disconnect） */
export function useSetPresenceCallbacks() {
  return useContext(PresenceCtx).setCallbacks
}

/** 供子路由或顶栏读写开发模式（showAll） */
export function useDevMode() {
  const { showAll, setShowAll } = useContext(PresenceCtx)
  return { showAll, setShowAll }
}

/** 供子路由发起 P2P 文件传输和读取传输状态 */
export function useFileTransfer() {
  const { startTransfer, transfers, onTransferComplete, setOnTransferComplete } = useContext(PresenceCtx)
  return { startTransfer, transfers, onTransferComplete, setOnTransferComplete }
}

export function PresenceBridge({ children }: { children: ReactNode }) {
  const callbacksRef = useRef<PresenceCallbacks>({})
  const [showAll, setShowAll] = useState(false)
  const [transfers, setTransfers] = useState<TransferHandle[]>([])
  const onTransferCompleteRef = useRef<
    ((transferId: string, blob: Blob, fileName: string) => void) | null
  >(null)

  // 稳定引用：PeerConnectionManager 只创建一次
  const pcmRef = useRef<PeerConnectionManager | null>(null)
  if (!pcmRef.current) {
    pcmRef.current = new PeerConnectionManager(() => {
      // SignalRelay 会在 usePresence 就绪后被赋值
    })
  }
  const pcm = pcmRef.current

  // WS 消息处理：转发信令给 PCM
  const handleWsMessage = useCallback((msg: Record<string, unknown>) => {
    const type = msg.type as string | undefined
    if (type === 'signal' || type === 'transfer-offer' || type === 'transfer-answer') {
      pcm.handleSignal(msg as unknown as Parameters<typeof pcm.handleSignal>[0])
      // 更新传输状态快照
      setTransfers(pcm.getTransfers())
    }
  }, [pcm])

  // WS 连接就绪后，把 send 函数注入 PCM 的 signalRelay
  const handleWsOpen = useCallback((send: (data: unknown) => void) => {
    pcm.signalRelay = (msg) => send(msg)
  }, [pcm])

  const { onlineUsers } = usePresence({
    onTaskUpdated: (task) => callbacksRef.current.onTaskUpdated?.(task),
    onDisconnect: () => callbacksRef.current.onDisconnect?.(),
    onMessage: handleWsMessage,
    onWsOpen: handleWsOpen,
  })

  // 注册 PCM 回调
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

  const setCallbacks = (cbs: PresenceCallbacks) => {
    callbacksRef.current = cbs
  }

  const startTransfer = useCallback(
    async (peerUserId: string, file: File) => {
      const handle = await pcm.initiateTransfer(peerUserId, file)
      setTransfers(pcm.getTransfers())
      return handle
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
        onTransferComplete: onTransferCompleteRef.current,
        setOnTransferComplete,
      }}
    >
      {children}
    </PresenceCtx.Provider>
  )
}

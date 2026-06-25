declare module 'ali-oss' {
  interface OSSOptions {
    region: string
    accessKeyId: string
    accessKeySecret: string
    bucket: string
    endpoint?: string
    internal?: boolean
    secure?: boolean
    timeout?: number
  }

  interface PutOptions {
    mime?: string
    headers?: Record<string, string>
  }

  interface PutResult {
    name: string
    url: string
    res: {
      status: number
      headers: Record<string, string>
    }
  }

  class OSS {
    constructor(options: OSSOptions)

    put(
      name: string,
      content: Buffer | Uint8Array | string | Blob,
      options?: PutOptions,
    ): Promise<PutResult>

    get(name: string): Promise<{
      content: Buffer
      res: { status: number; headers: Record<string, string> }
    }>

    delete(name: string): Promise<{ res: { status: number } }>

    generateObjectUrl(name: string): string
  }

  export default OSS
}

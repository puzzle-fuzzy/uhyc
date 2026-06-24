import { describe, expect, it } from 'bun:test'
import { filenameFromUrl, extractVideoResultUrl } from '../../src/modules/generate/storage'

// ---------------------------------------------------------------------------
// filenameFromUrl — extract the last path segment from a URL
// ---------------------------------------------------------------------------

describe('filenameFromUrl', () => {
  it('extracts filename from a standard URL', () => {
    const name = filenameFromUrl(
      'https://dashscope-result.oss-cn-beijing.aliyuncs.com/abc123/video.mp4?Expires=123456',
    )
    expect(name).toBe('video.mp4')
  })

  it('extracts filename without query string', () => {
    const name = filenameFromUrl(
      'https://example.com/path/to/image.png',
    )
    expect(name).toBe('image.png')
  })

  it('extracts filename with complex path', () => {
    const name = filenameFromUrl(
      'https://cdn.example.com/a/b/c/d/e/result_001.mp4',
    )
    expect(name).toBe('result_001.mp4')
  })

  it('returns a fallback name for empty path', () => {
    const name = filenameFromUrl('https://example.com/')
    // Falls back to `file-<timestamp>` pattern
    expect(name).toMatch(/^file-\d+$/)
  })

  it('handles OSS signed URLs correctly', () => {
    const name = filenameFromUrl(
      'https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx&OSSAccessKeyId=xxx',
    )
    expect(name).toBe('xxx.mp4')
  })
})

// ---------------------------------------------------------------------------
// extractVideoResultUrl — extract video_url from query output
// ---------------------------------------------------------------------------

describe('extractVideoResultUrl', () => {
  it('extracts video_url from a successful query result', () => {
    const output = {
      task_id: 'abc-123',
      task_status: 'SUCCEEDED',
      video_url: 'https://example.com/video.mp4',
      orig_prompt: 'a cat',
    }
    expect(extractVideoResultUrl(output)).toBe('https://example.com/video.mp4')
  })

  it('returns null when video_url is missing', () => {
    const output = {
      task_id: 'abc-123',
      task_status: 'FAILED',
      code: 'SomethingWentWrong',
      message: 'error',
    }
    expect(extractVideoResultUrl(output)).toBeNull()
  })

  it('returns null when video_url is not a string', () => {
    expect(extractVideoResultUrl({ video_url: 123 })).toBeNull()
  })

  it('returns null for non-object input', () => {
    expect(extractVideoResultUrl('not an object')).toBeNull()
    expect(extractVideoResultUrl(null)).toBeNull()
    expect(extractVideoResultUrl(undefined)).toBeNull()
  })

  it('returns null for an empty object', () => {
    expect(extractVideoResultUrl({})).toBeNull()
  })
})

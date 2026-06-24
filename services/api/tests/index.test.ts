import { describe, expect, it } from 'bun:test'
import app, { type App } from '../src/index'
import { treaty } from '@elysia/eden'

const api = treaty<App>(app)

describe('Elysia', () => {
    it('返回响应', async () => {
        const { data } = await api.get()
        expect(data).toBe('Hello Elysia')
    })
})
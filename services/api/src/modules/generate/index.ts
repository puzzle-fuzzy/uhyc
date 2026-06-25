import { Elysia, t } from 'elysia'

import { authPlugin } from '../../plugins/jwt'
import { GenerateService, isStatusReturn } from './service'
import {
  CreateTaskBody,
  TaskListResponse,
  TaskResponse,
  ValidationErrorResponse,
} from './model'

export const generateModule = new Elysia({ prefix: '/generate' })
  .use(authPlugin)
  .get(
    '/catalog',
    () => GenerateService.catalog(),
    {
      detail: { summary: 'List all generation models (drives the frontend form)' },
    },
  )
  .post(
    '/tasks',
    async ({ body, currentUser }) => {
      const result = await GenerateService.create(currentUser.id, body)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      body: CreateTaskBody,
      response: {
        200: t.Object({ task: TaskResponse }),
        422: ValidationErrorResponse,
      },
      detail: { summary: 'Create a generation task' },
    },
  )
  .get(
    '/tasks',
    ({ currentUser, query }) => GenerateService.list(currentUser.id, 50, query.all === 'true'),
    {
      isAuth: true,
      response: { 200: TaskListResponse },
      detail: { summary: 'List current user task history' },
    },
  )
  .get(
    '/tasks/:id',
    async ({ params, currentUser }) => {
      const result = await GenerateService.findOneAndSync(
        currentUser.id,
        params.id,
      )
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      response: {
        200: t.Object({ task: TaskResponse }),
        404: ValidationErrorResponse,
      },
      detail: { summary: 'Get a task and sync its status from Bailian' },
    },
  )
  .delete(
    '/tasks/:id',
    async ({ params, currentUser }) => {
      const result = await GenerateService.delete(currentUser.id, params.id)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      response: {
        200: t.Object({ ok: t.Boolean() }),
        404: ValidationErrorResponse,
        400: ValidationErrorResponse,
      },
      detail: { summary: 'Delete a FAILED task' },
    },
  )

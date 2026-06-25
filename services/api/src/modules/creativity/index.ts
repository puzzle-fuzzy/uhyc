import { Elysia, t } from 'elysia'

import { authPlugin } from '../../plugins/jwt'
import { CreativityService, isStatusReturn } from './service'
import {
  CreateTaskBody,
  CreativityTaskResponse,
  TaskListResponse,
} from './model'

export const creativityModule = new Elysia({ prefix: '/creativity' })
  .use(authPlugin)

  .post(
    '/tasks',
    async ({ body, currentUser }) => {
      const result = await CreativityService.create(currentUser.id, body)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      body: CreateTaskBody,
      response: { 200: t.Object({ task: CreativityTaskResponse }) },
      detail: { summary: 'Create a creativity analysis task' },
    },
  )

  .get(
    '/tasks',
    ({ currentUser }) => CreativityService.list(currentUser.id),
    {
      isAuth: true,
      response: { 200: TaskListResponse },
      detail: { summary: 'List creativity task history' },
    },
  )

  .get(
    '/tasks/:id',
    async ({ params, currentUser }) => {
      const result = await CreativityService.findOne(currentUser.id, params.id)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      response: { 200: t.Object({ task: CreativityTaskResponse }), 404: t.Object({ error: t.String(), errors: t.Array(t.Any()) }) },
      detail: { summary: 'Get a creativity task' },
    },
  )

  .delete(
    '/tasks/:id',
    async ({ params, currentUser }) => {
      const result = await CreativityService.delete(currentUser.id, params.id)
      if (isStatusReturn(result)) return result
      return result
    },
    {
      isAuth: true,
      response: { 200: t.Object({ ok: t.Boolean() }), 400: t.Object({ error: t.String() }), 404: t.Object({ error: t.String(), errors: t.Array(t.Any()) }) },
      detail: { summary: 'Delete a FAILED creativity task' },
    },
  )

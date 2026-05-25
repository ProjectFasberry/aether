import { Elysia } from 'elysia'
import vike from '@vikejs/elysia'
import type { Server } from 'vike/types'

const app = new Elysia()
vike(app)

export default {
  fetch: app.fetch
} satisfies Server
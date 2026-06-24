import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema'
import { table } from './schema'

export * from './schema'

const connectionString =
  process.env.DATABASE_URL || 'postgres://uhyc:uhyc_dev@localhost:5432/uhyc'

// Re-use one pool per process so hot-reloads don't leak connections.
const globalForDb = globalThis as unknown as {
  __uhycPgPool?: pg.Pool
}

const pool =
  globalForDb.__uhycPgPool ??
  new pg.Pool({
    connectionString,
    max: 10,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__uhycPgPool = pool
}

/** Drizzle instance bound to the node-postgres pool. */
export const db = drizzle(pool, { schema })

export { table, schema, pool }

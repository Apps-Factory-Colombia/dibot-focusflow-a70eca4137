import 'dotenv/config'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

let database: ReturnType<typeof drizzle> | undefined

/**
 * Keep Turso configuration server-only and lazy. This lets /api/health work
 * during container boot before the platform has injected database secrets.
 */
export function getDb() {
  if (database) return database

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url || !authToken) {
    throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Configure the server environment first.')
  }

  database = drizzle({ client: createClient({ url, authToken }) })
  return database
}

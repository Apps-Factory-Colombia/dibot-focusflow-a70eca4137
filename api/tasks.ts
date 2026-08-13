import { desc, eq } from 'drizzle-orm'
import { getDb } from './db/client'
import { focusSessions, tasks } from './db/schema'

type TaskInput = { id: string; title: string; description?: string; isPrimary?: boolean }
type CompletionInput = { completed: boolean }
type FocusInput = { id: string; taskId: string; durationSeconds?: number }

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return await request.json() as T
  } catch {
    return null
  }
}

export async function listTasks() {
  return getDb().select().from(tasks).orderBy(desc(tasks.createdAt))
}

export async function createTask(input: TaskInput) {
  const now = new Date()
  const db = getDb()
  if (input.isPrimary) await db.update(tasks).set({ isPrimary: false, updatedAt: now }).where(eq(tasks.isPrimary, true))
  return db.insert(tasks).values({ id: input.id, title: input.title, description: input.description, isPrimary: input.isPrimary ?? false, createdAt: now, updatedAt: now }).returning()
}

export async function setTaskCompleted(id: string, completed: boolean) {
  const now = new Date()
  return getDb().update(tasks).set({ completed, completedAt: completed ? now : null, updatedAt: now }).where(eq(tasks.id, id)).returning()
}

export async function deleteTask(id: string) {
  return getDb().delete(tasks).where(eq(tasks.id, id))
}

export async function startFocusSession(input: { id: string; taskId: string }) {
  return getDb().insert(focusSessions).values({ id: input.id, taskId: input.taskId, startedAt: new Date(), status: 'active' }).returning()
}

export async function completeFocusSession(id: string) {
  return getDb().update(focusSessions).set({ endedAt: new Date(), status: 'completed' }).where(eq(focusSessions.id, id)).returning()
}

export async function createCompletedFocusSession(input: { id: string; taskId: string; durationSeconds?: number }) {
  const now = new Date()
  return getDb().insert(focusSessions).values({ id: input.id, taskId: input.taskId, startedAt: new Date(now.getTime() - (input.durationSeconds ?? 1500) * 1000), endedAt: now, durationSeconds: input.durationSeconds ?? 1500, status: 'completed' }).returning()
}

/** Framework-neutral handlers for the Bun adapter. Keep database access server-side. */
export async function handleTasksRequest(request: Request) {
  const url = new URL(request.url)
  if (request.method === 'GET') return Response.json(await listTasks())
  if (request.method === 'POST') {
    const input = await readJson<TaskInput>(request)
    if (!input?.id || !input.title?.trim()) return Response.json({ error: 'Task id and title are required' }, { status: 400 })
    return Response.json(await createTask({ ...input, title: input.title.trim(), description: input.description?.trim() || undefined }), { status: 201 })
  }
  if (request.method === 'PATCH') {
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'Missing task id' }, { status: 400 })
    const body = await readJson<CompletionInput>(request)
    if (typeof body?.completed !== 'boolean') return Response.json({ error: 'Completed must be boolean' }, { status: 400 })
    const result = await setTaskCompleted(id, body.completed)
    if (!result.length) return Response.json({ error: 'Task not found' }, { status: 404 })
    return Response.json(result)
  }
  if (request.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'Missing task id' }, { status: 400 })
    await deleteTask(id)
    return new Response(null, { status: 204 })
  }
  return new Response('Method not allowed', { status: 405 })
}

export async function handleFocusRequest(request: Request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const input = await readJson<FocusInput>(request)
  if (!input?.id || !input.taskId) return Response.json({ error: 'Session id and task id are required' }, { status: 400 })
  if (input.durationSeconds !== undefined && (!Number.isInteger(input.durationSeconds) || input.durationSeconds <= 0)) {
    return Response.json({ error: 'Duration must be a positive integer' }, { status: 400 })
  }
  return Response.json(await createCompletedFocusSession(input), { status: 201 })
}

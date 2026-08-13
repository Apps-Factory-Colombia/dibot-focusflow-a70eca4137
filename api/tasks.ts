import { desc, eq } from 'drizzle-orm'
import { db } from './db/client'
import { focusSessions, tasks } from './db/schema'

export async function listTasks() {
  return db.select().from(tasks).orderBy(desc(tasks.createdAt))
}

export async function createTask(input: { id: string; title: string; description?: string; isPrimary?: boolean }) {
  const now = new Date()
  if (input.isPrimary) await db.update(tasks).set({ isPrimary: false, updatedAt: now }).where(eq(tasks.isPrimary, true))
  return db.insert(tasks).values({ id: input.id, title: input.title, description: input.description, isPrimary: input.isPrimary ?? false, createdAt: now, updatedAt: now }).returning()
}

export async function setTaskCompleted(id: string, completed: boolean) {
  const now = new Date()
  return db.update(tasks).set({ completed, completedAt: completed ? now : null, updatedAt: now }).where(eq(tasks.id, id)).returning()
}

export async function deleteTask(id: string) {
  return db.delete(tasks).where(eq(tasks.id, id))
}

export async function startFocusSession(input: { id: string; taskId: string }) {
  return db.insert(focusSessions).values({ id: input.id, taskId: input.taskId, startedAt: new Date(), status: 'active' }).returning()
}

export async function completeFocusSession(id: string) {
  return db.update(focusSessions).set({ endedAt: new Date(), status: 'completed' }).where(eq(focusSessions.id, id)).returning()
}

export async function createCompletedFocusSession(input: { id: string; taskId: string; durationSeconds?: number }) {
  const now = new Date()
  return db.insert(focusSessions).values({ id: input.id, taskId: input.taskId, startedAt: new Date(now.getTime() - (input.durationSeconds ?? 1500) * 1000), endedAt: now, durationSeconds: input.durationSeconds ?? 1500, status: 'completed' }).returning()
}

/** Framework-neutral handlers for the Bun adapter. Keep database access server-side. */
export async function handleTasksRequest(request: Request) {
  const url = new URL(request.url)
  if (request.method === 'GET') return Response.json(await listTasks())
  if (request.method === 'POST') {
    const input = await request.json() as { id: string; title: string; description?: string; isPrimary?: boolean }
    return Response.json(await createTask(input), { status: 201 })
  }
  if (request.method === 'PATCH') {
    const id = url.searchParams.get('id')
    if (!id) return Response.json({ error: 'Missing task id' }, { status: 400 })
    const body = await request.json() as { completed: boolean }
    return Response.json(await setTaskCompleted(id, body.completed))
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
  const input = await request.json() as { id: string; taskId: string; durationSeconds?: number }
  return Response.json(await createCompletedFocusSession(input), { status: 201 })
}

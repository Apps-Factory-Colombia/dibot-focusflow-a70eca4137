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

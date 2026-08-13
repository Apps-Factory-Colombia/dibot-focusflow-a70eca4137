import { join, normalize, resolve } from 'node:path'

const port = Number(process.env.API_PORT ?? 8787)
const distRoot = resolve(process.cwd(), 'dist')

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' }

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: jsonHeaders,
  })
}

async function apiResponse(request: Request, pathname: string) {
  try {
    if (pathname === '/api/health' && request.method === 'GET') {
      return Response.json({ ok: true })
    }

    if (pathname === '/api/tasks') {
      const { handleTasksRequest } = await import('./api/tasks.ts')
      return handleTasksRequest(request)
    }

    if (pathname === '/api/focus') {
      const { handleFocusRequest } = await import('./api/tasks.ts')
      return handleFocusRequest(request)
    }

    return jsonError('API route not found', 404)
  } catch (error) {
    console.error('API request failed', error)
    return jsonError('Internal server error')
  }
}

async function staticResponse(pathname: string) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname
  const filePath = normalize(join(distRoot, requestedPath))
  const insideDist = filePath === distRoot || filePath.startsWith(`${distRoot}/`)

  if (insideDist) {
    const file = Bun.file(filePath)
    if (await file.exists()) return new Response(file)
  }

  // Client-side routes must resolve to the built app, but missing assets stay 404.
  if (!pathname.includes('.') && await Bun.file(join(distRoot, 'index.html')).exists()) {
    return new Response(Bun.file(join(distRoot, 'index.html')))
  }

  return new Response('Not found', { status: 404 })
}

const server = Bun.serve({
  hostname: '0.0.0.0',
  port,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return apiResponse(request, url.pathname)
    return staticResponse(url.pathname)
  },
})

console.log(`FocusFlow server listening on ${server.hostname}:${server.port}`)

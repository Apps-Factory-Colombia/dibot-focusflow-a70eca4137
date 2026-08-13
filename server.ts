import { join, normalize, resolve } from 'node:path'

const configuredPort = Number(process.env.API_PORT ?? 8787)
const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 8787
const distRoot = resolve(process.cwd(), 'dist')

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' }
const corsHeaders = {
  ...jsonHeaders,
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
}

function jsonError(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: corsHeaders,
  })
}

async function apiResponse(request: Request, pathname: string) {
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

    if (pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders })
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
  let requestedPath = pathname === '/' ? '/index.html' : pathname
  try {
    requestedPath = decodeURIComponent(requestedPath)
  } catch {
    return new Response('Not found', { status: 404 })
  }
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
    if (url.pathname.startsWith('/api/')) {
      const response = await apiResponse(request, url.pathname)
      const headers = new Headers(response.headers)
      Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value))
      return new Response(response.body, { status: response.status, headers })
    }
    return staticResponse(url.pathname)
  },
})

console.log(`FocusFlow server listening on ${server.hostname}:${server.port}`)

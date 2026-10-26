import { preview } from 'vite'

// Serve the production build in-process, avoiding orphan shell processes on Windows.
export default async function serve() {
  const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } })
  return async () => {
    if ('closeAllConnections' in server.httpServer) server.httpServer.closeAllConnections()
    await new Promise<void>((resolve, reject) => {
      server.httpServer.close((error) => error ? reject(error) : resolve())
    })
  }
}

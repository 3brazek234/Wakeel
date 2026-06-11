import { io } from 'socket.io-client'

let socket = null

// Initialize and return a singleton socket instance
export function initSocket(apiUrl, token) {
  if (socket) return socket
  // pass token both as auth and query to support different server guards
  socket = io(apiUrl, { path: '/socket.io', auth: { token }, query: { token } })
  return socket
}

export function getSocket() {
  if (!socket) throw new Error('Socket not initialized. Call initSocket(apiUrl, token)')
  return socket
}

export function disconnectSocket() {
  if (socket) {
    try { socket.disconnect() } catch (e) { /* ignore */ }
    socket = null
  }
}

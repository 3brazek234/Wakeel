import React, { useEffect, useState } from 'react'
import { getToken } from '../auth'
import { initSocket, getSocket, disconnectSocket } from '../lib/socket'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Chat({ jobId }) {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) return

    // initialize global socket once
    const s = initSocket(API, token)

    // ensure handlers registered only once per socket
    const onConnect = () => {
      setConnected(true)
      s.emit('join_room', { room: `job:${jobId}` })
    }
    const onDisconnect = () => setConnected(false)
    const onHistory = (payload) => setMessages(payload.messages || [])
    const onMessage = (m) => setMessages((prev) => [...prev, m])

    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    s.on('history', onHistory)
    s.on('message', onMessage)
    s.on('error', (e) => console.error('socket error', e))

    // Save for cleanup, but do not disconnect global socket on unmount
    return () => {
      try {
        s.off('connect', onConnect)
        s.off('disconnect', onDisconnect)
        s.off('history', onHistory)
        s.off('message', onMessage)
      } catch (e) {
        /* ignore */
      }
    }
  }, [jobId])

  function send() {
    try {
      const s = getSocket()
      if (!body) return
      s.emit('send_message', { room: `job:${jobId}`, body, senderId: 'web-client' })
      setBody('')
    } catch (e) {
      console.error('Send failed', e)
    }
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white max-w-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Chat</h3>
        <span className={`text-sm ${connected ? 'text-green-600' : 'text-gray-400'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="h-48 overflow-auto border rounded p-2 mb-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-sm text-gray-500">No messages yet</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="mb-2">
              <div className="text-xs text-gray-500">{m.senderId} • {new Date(m.sentAt).toLocaleTimeString()}</div>
              <div className="text-sm">{m.body}</div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message..."
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={send}>Send</button>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { post } from '../api'
import { saveToken } from '../auth'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit(e) {
    e.preventDefault()
    const r = await post('/auth/login', { email, password })
    if (!r || r.error) return alert(r?.message || 'Login failed')
    saveToken(r.token)
    location.reload()
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 360 }}>
      <div>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
      </div>
      <div>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" />
      </div>
      <div>
        <button>Login</button>
      </div>
    </form>
  )
}

import React from 'react'
import { getToken } from './auth'
import { Login } from './pages/Login'
import { JobsList } from './pages/JobsList'

export default function App() {
  const token = getToken()
  return (
    <div style={{ padding: 20, fontFamily: 'Inter, system-ui, Arial' }}>
      <h1>Wakeel</h1>
      {!token ? <Login /> : <JobsList />}
    </div>
  )
}

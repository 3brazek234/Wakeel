import React, { useEffect, useState } from 'react'
import { get } from '../api'
import { getToken } from '../auth'

export function JobsList() {
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    async function load() {
      const t = getToken()
      const res = await get('/jobs', t)
      if (!res || res.error) return alert(res?.message || 'Failed')
      setJobs(res.jobs || [])
    }
    load()
  }, [])

  return (
    <div>
      <h2>Jobs</h2>
      <ul>
        {jobs.map(j => (
          <li key={j.id}>
            <strong>{j.title}</strong> — {j.court_name} — {j.fee} — <a href={`/job/${j.id}`}>Details</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

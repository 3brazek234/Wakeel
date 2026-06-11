import React, { useEffect, useState } from 'react'
import { get, post } from '../api'
import { getToken } from '../auth'
import Chat from '../components/Chat'

export default function JobDetail({ jobId }) {
  const [job, setJob] = useState(null)
  useEffect(() => {
    async function load() {
      const res = await get(`/jobs/${jobId}`, getToken())
      if (!res || res.error) return alert(res?.message)
      setJob(res.job)
    }
    load()
  }, [jobId])

  async function apply() {
    const res = await post(`/jobs/${jobId}/applications`, { cover_note: 'Available' }, getToken())
    if (res.error) return alert(res.message)
    alert('Applied')
  }

  if (!job) return <div>Loading...</div>
  return (
    <div>
      <h2>{job.title}</h2>
      <p>{job.description}</p>
      <button onClick={apply}>Apply</button>
      <Chat jobId={jobId} />
    </div>
  )
}

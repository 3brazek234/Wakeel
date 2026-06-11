const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
function headers(token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}
export async function post(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body)
  })
  return res.json()
}
export async function get(path, token) {
  const res = await fetch(`${API}${path}`, { headers: headers(token) })
  return res.json()
}

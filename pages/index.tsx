import React from 'react'

export default function Index() {
  return (
    <main style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#18130E', color: '#fff'}}>
      <div style={{textAlign: 'center'}}>
        <h1 style={{fontSize: 28, marginBottom: 12}}>ZEITH</h1>
        <p style={{opacity: 0.85}}>Fallback index page (pages router). If you still see the 404, check Vercel runtime logs.</p>
      </div>
    </main>
  )
}

import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

type Particle = {
  cx: number // center of orbit
  cy: number
  radius: number // orbit radius
  angle: number
  angularSpeed: number
  size: number
  alpha: number
}

export default function BackgroundCognitive() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let dpr = Math.max(1, window.devicePixelRatio || 1)

    function resize() {
      dpr = Math.max(1, window.devicePixelRatio || 1)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function initParticles() {
      const w = window.innerWidth
      const h = window.innerHeight
      const max = Math.min(20, Math.round((w * h) / (800 * 450))) // scale with viewport but cap 20
      const count = Math.max(6, max)
      const arr: Particle[] = []
      for (let i = 0; i < count; i++) {
        const cx = Math.random() * w
        const cy = Math.random() * h
        const radius = 10 + Math.random() * Math.min(w, h) * 0.12
        const angle = Math.random() * Math.PI * 2
        const period = 10 + Math.random() * 10 // 10-20s per orbit
        const angularSpeed = (Math.PI * 2) / (period * 60) // per frame (approx 60fps)
        const size = 1 + Math.random() * 6
        const alpha = 0.06 + Math.random() * 0.18
        arr.push({ cx, cy, radius, angle, angularSpeed, size, alpha })
      }
      particlesRef.current = arr
    }

    let last = performance.now()

    function draw(now: number) {
      const dt = (now - last) / 1000
      last = now

      const w = canvas.width / dpr
      const h = canvas.height / dpr

      // clear
      ctx.clearRect(0, 0, w, h)

      // subtle background fill (keep transparent because page bg is set by CSS)

      // draw particles
      const particles = particlesRef.current
      for (let p of particles) {
        p.angle += p.angularSpeed * (dt * 60)
        const x = p.cx + Math.cos(p.angle) * p.radius
        const y = p.cy + Math.sin(p.angle) * p.radius

        ctx.beginPath()
        const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(8, p.size * 6))
        grad.addColorStop(0, `rgba(255,255,255,${p.alpha})`)
        grad.addColorStop(0.6, `rgba(255,255,255,${p.alpha * 0.35})`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = grad
        ctx.fillRect(x - p.size * 6, y - p.size * 6, p.size * 12, p.size * 12)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    function start() {
      resize()
      initParticles()
      last = performance.now()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(draw)
    }

    start()

    const onResize = () => {
      // small debounce
      clearTimeout((resize as any)._t)
      ;(resize as any)._t = setTimeout(() => {
        resize()
        initParticles()
      }, 120)
    }

    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      style={{ opacity: 0.2 }}
    >
      {/* gradient layer with subtle pulsing */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FA3100 0%, #00FAA8 100%)',
          mixBlendMode: 'overlay'
        }}
        initial={{ opacity: 0.08 }}
        animate={{ opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
      />

      {/* particles canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}

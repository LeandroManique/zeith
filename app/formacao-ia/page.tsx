"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

// ─── Brand palette ───────────────────────────────────────────────────────────
const C = {
  bg:      '#0A0905',
  bg2:     '#0E0C07',
  red:     '#FA3100',
  teal:    '#00FAA8',
  text:    '#F0EAD8',
  muted:   '#7A6E5E',
  border:  'rgba(250,49,0,0.12)',
  borderT: 'rgba(0,250,168,0.12)',
} as const

// ─── Particle engine ─────────────────────────────────────────────────────────
interface Vec2 { x: number; y: number }

class Particle {
  pos: Vec2 = { x: 0, y: 0 }
  vel: Vec2 = { x: 0, y: 0 }
  acc: Vec2 = { x: 0, y: 0 }
  target: Vec2 = { x: 0, y: 0 }
  closeEnough = 100
  maxSpeed = 1.0
  maxForce = 0.1
  isKilled = false
  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 0, g: 0, b: 0 }
  colorWeight = 0
  colorBlendRate = 0.01

  move() {
    const dx = this.target.x - this.pos.x
    const dy = this.target.y - this.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const prox = dist < this.closeEnough ? dist / this.closeEnough : 1
    const mag = dist || 1
    const tx = (dx / mag) * this.maxSpeed * prox
    const ty = (dy / mag) * this.maxSpeed * prox
    const sx = tx - this.vel.x
    const sy = ty - this.vel.y
    const sm = Math.sqrt(sx * sx + sy * sy) || 1
    this.acc.x += (sx / sm) * this.maxForce
    this.acc.y += (sy / sm) * this.maxForce
    this.vel.x += this.acc.x
    this.vel.y += this.acc.y
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.acc.x = 0
    this.acc.y = 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.colorWeight < 1) this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1)
    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight)
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight)
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(this.pos.x, this.pos.y, 2, 2)
  }

  kill(w: number, h: number) {
    if (this.isKilled) return
    const cx = w / 2, cy = h / 2
    const rx = Math.random() * w, ry = Math.random() * h
    const dx = rx - cx, dy = ry - cy
    const mag = Math.sqrt(dx * dx + dy * dy) || 1
    const d = (w + h) / 2
    this.target.x = cx + (dx / mag) * d
    this.target.y = cy + (dy / mag) * d
    this.startColor = {
      r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
      g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
      b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
    }
    this.targetColor = { r: 0, g: 0, b: 0 }
    this.colorWeight = 0
    this.isKilled = true
  }
}

// Alternates between brand red and teal for each word
const PALETTE = [
  { r: 250, g: 49,  b: 0   }, // #FA3100
  { r: 0,   g: 250, b: 168 }, // #00FAA8
  { r: 255, g: 120, b: 30  }, // warm amber
  { r: 0,   g: 250, b: 168 }, // teal
  { r: 250, g: 49,  b: 0   }, // red
]

const HERO_WORDS = ['CONSCIÊNCIA', 'PODER', 'IA', 'FUTURO', 'ZEITH']

function HeroCanvas() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const animRef     = useRef<number>()
  const particles   = useRef<Particle[]>([])
  const frameRef    = useRef(0)
  const wordIdx     = useRef(0)
  const colorIdx    = useRef(0)

  const spawnWord = useCallback((word: string, canvas: HTMLCanvasElement) => {
    const off = document.createElement('canvas')
    off.width = canvas.width
    off.height = canvas.height
    const ctx2 = off.getContext('2d')!
    const fs = Math.min(canvas.width / 5.5, 130)
    ctx2.fillStyle = 'white'
    ctx2.font = `800 ${fs}px Arial`
    ctx2.textAlign = 'center'
    ctx2.textBaseline = 'middle'
    ctx2.fillText(word, canvas.width / 2, canvas.height / 2)

    const { data: px } = ctx2.getImageData(0, 0, canvas.width, canvas.height)
    const newColor = PALETTE[colorIdx.current % PALETTE.length]
    colorIdx.current++

    const list = particles.current
    let pi = 0
    const coords: number[] = []
    for (let i = 0; i < px.length; i += 6 * 4) coords.push(i)
    for (let i = coords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[coords[i], coords[j]] = [coords[j], coords[i]]
    }

    for (const idx of coords) {
      if (px[idx + 3] === 0) continue
      const x = (idx / 4) % canvas.width
      const y = Math.floor(idx / 4 / canvas.width)
      let p: Particle
      if (pi < list.length) {
        p = list[pi]
        p.isKilled = false
        pi++
      } else {
        p = new Particle()
        const cx = canvas.width / 2, cy = canvas.height / 2
        const rx = Math.random() * canvas.width
        const ry = Math.random() * canvas.height
        const dx = rx - cx, dy = ry - cy
        const mag = Math.sqrt(dx * dx + dy * dy) || 1
        const d = (canvas.width + canvas.height) / 2
        p.pos.x = cx + (dx / mag) * d
        p.pos.y = cy + (dy / mag) * d
        p.maxSpeed = Math.random() * 6 + 4
        p.maxForce = p.maxSpeed * 0.05
        p.colorBlendRate = Math.random() * 0.0275 + 0.0025
        list.push(p)
      }
      p.startColor = {
        r: p.startColor.r + (p.targetColor.r - p.startColor.r) * p.colorWeight,
        g: p.startColor.g + (p.targetColor.g - p.startColor.g) * p.colorWeight,
        b: p.startColor.b + (p.targetColor.b - p.startColor.b) * p.colorWeight,
      }
      p.targetColor = newColor
      p.colorWeight = 0
      p.target.x = x
      p.target.y = y
    }
    for (let i = pi; i < list.length; i++) list[i].kill(canvas.width, canvas.height)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 1000
    canvas.height = 380

    spawnWord(HERO_WORDS[0], canvas)

    const animate = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = 'rgba(10,9,5,0.18)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const list = particles.current
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]
        p.move()
        p.draw(ctx)
        if (p.isKilled && (p.pos.x < 0 || p.pos.x > canvas.width || p.pos.y < 0 || p.pos.y > canvas.height)) {
          list.splice(i, 1)
        }
      }
      frameRef.current++
      if (frameRef.current % 240 === 0) {
        wordIdx.current = (wordIdx.current + 1) % HERO_WORDS.length
        spawnWord(HERO_WORDS[wordIdx.current], canvas)
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [spawnWord])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Animação de partículas formando palavras"
      style={{ width: '100%', aspectRatio: '1000/380' }}
    />
  )
}

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
}

function Reveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-70px' })
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Content ──────────────────────────────────────────────────────────────────
const MODULES = [
  {
    num: '01', icon: '◈',
    title: 'Fundamentos Estratégicos',
    desc:  'Como a IA funciona, onde está indo e o que isso significa para o seu setor. Nada de hype — só clareza e estratégia.',
  },
  {
    num: '02', icon: '⬡',
    title: 'Automação com Precisão',
    desc:  'Mapeie seus processos, identifique gargalos e automatize com ferramentas que realmente funcionam. Ganhe horas por semana.',
  },
  {
    num: '03', icon: '◇',
    title: 'Branding & Comunicação IA',
    desc:  'Use IA para criar, escalar e proteger sua identidade de marca sem perder autenticidade ou posicionamento.',
  },
  {
    num: '04', icon: '△',
    title: 'Decisão Baseada em Dados',
    desc:  'Transforme dados brutos em insights estratégicos. Aprenda a fazer as perguntas certas e obter respostas que movem negócios.',
  },
]

const OUTCOMES = [
  { title: 'Domínio de ferramentas',    desc: 'As ferramentas de IA que mais impactam negócios hoje — foco em resultado real.' },
  { title: 'Fluxos de automação',        desc: 'Crie automações que liberam tempo e eliminam trabalho manual repetitivo.' },
  { title: 'Branding escalável',         desc: 'Escale sua presença sem escalar seu time. IA a serviço da identidade.' },
  { title: 'Decisões com dados',         desc: 'Pare de operar no escuro. Use IA para enxergar o que os outros não veem.' },
  { title: 'Processos antifrágeis',      desc: 'Construa sistemas que melhoram sob pressão, à prova de obsolescência.' },
  { title: 'Vantagem competitiva real',  desc: 'Entre na seleta minoria que usa IA com consciência, intenção e estratégia.' },
]

const FOR_WHOM = [
  { label: 'Empreendedores',         desc: 'Que querem vantagem competitiva real, não apenas curiosidade sobre IA.' },
  { label: 'Gestores e líderes',     desc: 'Que precisam guiar equipes em uma transformação que já começou.' },
  { label: 'Profissionais criativos',desc: 'Que querem ampliar sua capacidade sem ampliar o time.' },
  { label: 'Especialistas de mercado',desc: 'Que não querem ser substituídos — querem ser insubstituíveis.' },
]

const FAQ = [
  {
    q: 'Preciso ter experiência técnica?',
    a: 'Não. A Formação IA da ZEITH foi desenhada para profissionais e empreendedores, não para programadores. O foco é estratégia e aplicação, não código.',
  },
  {
    q: 'Quanto tempo por semana precisarei dedicar?',
    a: 'Entre 3 e 5 horas semanais. O material é assíncrono e pode ser consumido no seu ritmo, sem prazo rígido.',
  },
  {
    q: 'As ferramentas ensinadas são pagas?',
    a: 'Algumas sim, algumas não. Você vai aprender a avaliar custo-benefício de cada ferramenta. A maioria tem planos gratuitos que já entregam resultados reais.',
  },
  {
    q: 'Como funciona o acesso ao conteúdo?',
    a: 'Acesso imediato após confirmação da matrícula. O conteúdo fica disponível por 12 meses, com atualizações periódicas conforme o mercado evolui.',
  },
  {
    q: 'Há suporte ou comunidade?',
    a: 'Sim. Todos os participantes têm acesso a um grupo exclusivo e a sessões ao vivo mensais para tirar dúvidas e discutir casos reais.',
  },
]

// ─── Page ────────────────────────────────────────────────────────────────────
export default function FormacaoIA() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const ff = (f: string) => ({ fontFamily: `var(${f})` })

  return (
    <div style={{ backgroundColor: C.bg, color: C.text, fontFamily: 'var(--font-jakarta, sans-serif)' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-14 h-[60px] flex items-center justify-between"
        style={{
          background: scrolled ? 'rgba(10,9,5,0.96)' : 'transparent',
          borderBottom: scrolled ? `1px solid ${C.border}` : 'none',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <img src="/brand/logo-zeith.png" alt="ZEITH" className="h-7 w-auto" />
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: C.muted }}>
          {[['#programa','Programa'],['#para-quem','Para quem'],['#faq','FAQ']].map(([href,label]) => (
            <a key={href} href={href}
              className="hover:text-white transition-colors"
              style={{ ...ff('--font-jakarta') }}
            >{label}</a>
          ))}
        </div>
        <a
          href="#inscricao"
          className="text-xs font-semibold px-5 py-2.5 rounded-sm transition-all hover:scale-105"
          style={{
            border: `1px solid ${C.red}`,
            color: C.red,
            ...ff('--font-syne'),
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = C.red; (e.target as HTMLElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = C.red }}
        >
          Garantir vaga
        </a>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 pb-12 px-4 overflow-hidden">
        {/* glow background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 900, height: 500, borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(250,49,0,0.08) 0%, transparent 70%)`,
          }} />
        </div>

        {/* canvas */}
        <div className="w-full max-w-5xl mx-auto">
          <HeroCanvas />
        </div>

        {/* headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center px-4 mt-6 max-w-4xl mx-auto"
        >
          <h1
            className="leading-none tracking-tight mb-5"
            style={{
              ...ff('--font-syne'),
              fontSize: 'clamp(2.8rem, 8vw, 6.5rem)',
              fontWeight: 800,
            }}
          >
            Consciência é{' '}
            <span style={{ color: C.red }}>poder.</span>
          </h1>
          <p
            className="text-lg md:text-xl mb-10 mx-auto max-w-xl leading-relaxed"
            style={{ color: C.muted }}
          >
            A inteligência artificial está reescrevendo as regras do mercado.{' '}
            Quem aprende a usá-la estrategicamente lidera.{' '}
            Os demais, seguem.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#inscricao"
              className="px-9 py-4 font-bold text-base text-white rounded-sm transition-all hover:scale-105"
              style={{
                background: C.red,
                boxShadow: `0 0 0 rgba(250,49,0,0)`,
                ...ff('--font-syne'),
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.boxShadow = '0 0 32px rgba(250,49,0,0.45)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.boxShadow = '0 0 0 rgba(250,49,0,0)' }}
            >
              Quero minha vaga →
            </a>
            <a
              href="#programa"
              className="px-9 py-4 font-medium text-base rounded-sm transition-all"
              style={{ border: `1px solid rgba(240,234,216,0.15)`, color: C.muted }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = C.text; (e.target as HTMLElement).style.borderColor = 'rgba(240,234,216,0.35)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = C.muted; (e.target as HTMLElement).style.borderColor = 'rgba(240,234,216,0.15)' }}
            >
              Ver o programa
            </a>
          </div>
        </motion.div>

        {/* scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div style={{ width: 1, height: 48, background: `linear-gradient(to bottom, transparent, ${C.red})` }} />
          <span className="text-xs tracking-[0.2em] uppercase" style={{ color: C.muted, ...ff('--font-mono') }}>scroll</span>
        </motion.div>
      </section>

      {/* ── MANIFESTO ───────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-6 md:px-14"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <div className="max-w-6xl mx-auto">
          <Reveal className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp}>
              <p className="text-xs tracking-[0.2em] uppercase mb-6" style={{ color: C.red, ...ff('--font-mono') }}>
                — O cenário
              </p>
              <h2
                className="leading-tight"
                style={{ ...ff('--font-syne'), fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
              >
                O hype acabou.
                <br />
                <span style={{ color: C.red }}>Chegou a hora</span>
                <br />
                de agir.
              </h2>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-8">
              <p className="text-lg leading-relaxed" style={{ color: C.muted }}>
                74% dos executivos acreditam que a IA vai revolucionar seus setores nos próximos 3 anos.
                Apenas 13% afirmam saber como implementá-la de forma estratégica.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: C.text }}>
                Essa lacuna é sua oportunidade. A ZEITH existe para fechá-la — com consciência, método e resultado real.
              </p>
              <div
                className="grid grid-cols-3 gap-6 pt-6"
                style={{ borderTop: `1px solid ${C.border}` }}
              >
                {[
                  { num: '74%', label: 'acreditam no impacto da IA' },
                  { num: '13%', label: 'sabem como agir' },
                  { num: '∞',   label: 'potencial para quem aprende' },
                ].map((s, i) => (
                  <div key={i}>
                    <div
                      className="text-3xl mb-1"
                      style={{ color: C.red, fontWeight: 800, ...ff('--font-syne') }}
                    >{s.num}</div>
                    <div className="text-xs leading-tight" style={{ color: C.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ── PROGRAMA ────────────────────────────────────────────────────────── */}
      <section id="programa" className="py-24 px-6 md:px-14" style={{ backgroundColor: C.bg2 }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <motion.div variants={fadeUp} className="mb-14">
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: C.teal, ...ff('--font-mono') }}>
                — O programa
              </p>
              <h2
                className="leading-tight mb-5"
                style={{ ...ff('--font-syne'), fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.8rem)' }}
              >
                Formação IA
                <span style={{ color: C.red }}> — ZEITH</span>
              </h2>
              <p className="text-lg max-w-2xl leading-relaxed" style={{ color: C.muted }}>
                Um programa intensivo de 8 semanas que transforma profissionais em estrategistas da inteligência artificial. Sem código. Sem jargão. Com resultado.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              {MODULES.map((m, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="group p-8 rounded-sm cursor-default transition-all duration-300"
                  style={{
                    backgroundColor: C.bg,
                    border: `1px solid ${C.border}`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(250,49,0,0.35)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border }}
                >
                  <div className="flex items-start justify-between mb-5">
                    <span
                      className="text-5xl transition-colors duration-300"
                      style={{ color: 'rgba(250,49,0,0.15)', fontWeight: 800, ...ff('--font-mono') }}
                    >{m.num}</span>
                    <span className="text-2xl" style={{ color: C.red }}>{m.icon}</span>
                  </div>
                  <h3
                    className="text-lg mb-3 transition-colors duration-300"
                    style={{ fontWeight: 700, ...ff('--font-syne') }}
                  >{m.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{m.desc}</p>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PARA QUEM ───────────────────────────────────────────────────────── */}
      <section id="para-quem" className="py-24 px-6 md:px-14" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="grid md:grid-cols-2 gap-16 items-start">
            <motion.div variants={fadeUp}>
              <p className="text-xs tracking-[0.2em] uppercase mb-6" style={{ color: C.red, ...ff('--font-mono') }}>
                — Para quem é
              </p>
              <h2
                className="leading-tight mb-6"
                style={{ ...ff('--font-syne'), fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.2rem)' }}
              >
                Para quem não tem medo{' '}
                <span style={{ color: C.teal }}>do futuro.</span>
              </h2>
              <p className="leading-relaxed" style={{ color: C.muted }}>
                A Formação IA não é para todos. É para os que entendem que consciência é vantagem — e estão prontos para agir com ela.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-3">
              {FOR_WHOM.map((item, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-5 rounded-sm transition-all"
                  style={{ border: `1px solid ${C.borderT}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,250,168,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderT }}
                >
                  <div className="w-0.5 flex-shrink-0 rounded-full self-stretch" style={{ backgroundColor: C.teal }} />
                  <div>
                    <div className="font-bold mb-1" style={{ ...ff('--font-syne') }}>{item.label}</div>
                    <div className="text-sm leading-relaxed" style={{ color: C.muted }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ── OUTCOMES ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-14" style={{ backgroundColor: C.bg2 }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: C.red, ...ff('--font-mono') }}>
                — O que você vai dominar
              </p>
              <h2
                className="leading-tight"
                style={{ ...ff('--font-syne'), fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
              >
                6 capacidades que vão<br />
                <span style={{ color: C.red }}>mudar como você opera</span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4">
              {OUTCOMES.map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="p-6 rounded-sm transition-all"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(250,49,0,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border }}
                >
                  <div className="text-xs mb-4" style={{ color: C.red, opacity: 0.5, ...ff('--font-mono') }}>
                    0{i + 1}
                  </div>
                  <h3 className="font-bold text-base mb-2" style={{ ...ff('--font-syne') }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6 md:px-14" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <motion.div variants={fadeUp} className="mb-14">
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: C.red, ...ff('--font-mono') }}>
                — Perguntas frequentes
              </p>
              <h2 style={{ ...ff('--font-syne'), fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
                Dúvidas comuns
              </h2>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-2">
              {FAQ.map((item, i) => (
                <div key={i} className="rounded-sm overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between"
                    style={{ background: openFaq === i ? 'rgba(250,49,0,0.04)' : 'transparent' }}
                  >
                    <span className="font-medium pr-4" style={{ color: C.text, ...ff('--font-syne') }}>
                      {item.q}
                    </span>
                    <span
                      className="flex-shrink-0 text-xl font-light"
                      style={{
                        color: C.red,
                        transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                        display: 'inline-block',
                      }}
                    >+</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="px-6 pb-5 pt-3 leading-relaxed text-sm" style={{ color: C.muted, borderTop: `1px solid ${C.border}` }}>
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────────── */}
      <section
        id="inscricao"
        className="py-32 px-6 md:px-14 relative overflow-hidden"
        style={{ backgroundColor: C.bg2 }}
      >
        {/* glow bottom */}
        <div
          className="absolute bottom-0 left-1/2 pointer-events-none"
          style={{
            transform: 'translateX(-50%)',
            width: 700, height: 350,
            background: `radial-gradient(ellipse at center bottom, rgba(250,49,0,0.14), transparent 70%)`,
          }}
          aria-hidden
        />
        <div className="max-w-3xl mx-auto text-center relative">
          <Reveal>
            <motion.p
              variants={fadeUp}
              className="text-xs tracking-[0.2em] uppercase mb-6"
              style={{ color: C.red, ...ff('--font-mono') }}
            >
              — Sua próxima etapa
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="leading-none mb-8"
              style={{ ...ff('--font-syne'), fontWeight: 800, fontSize: 'clamp(3rem, 10vw, 6rem)' }}
            >
              Você ainda<br />
              vai <span style={{ color: C.red }}>decidir?</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-lg mb-12 mx-auto max-w-lg leading-relaxed"
              style={{ color: C.muted }}
            >
              As vagas são limitadas. O mercado não espera.
              Quem agir agora, lidera. Quem esperar, segue.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4">
              {/* ⬇️ Atualize este href com seu link de inscrição / WhatsApp */}
              <a
                href="/"
                className="inline-flex items-center gap-3 px-12 py-5 font-bold text-lg text-white rounded-sm transition-all hover:scale-105"
                style={{
                  background: C.red,
                  ...ff('--font-syne'),
                  boxShadow: '0 0 0 rgba(250,49,0,0)',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.boxShadow = '0 0 48px rgba(250,49,0,0.5)' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.boxShadow = '0 0 0 rgba(250,49,0,0)' }}
              >
                Garantir minha vaga agora →
              </a>
              <span className="text-xs" style={{ color: C.muted }}>
                Lista de espera aberta · Turma limitada
              </span>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer
        className="py-10 px-6 md:px-14"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/brand/logo-zeith.png" alt="ZEITH" className="h-6 w-auto opacity-50" />
            <span className="text-xs" style={{ color: C.muted }}>Consciência é poder.</span>
          </div>
          <span className="text-xs" style={{ color: C.muted }}>
            © {new Date().getFullYear()} ZEITH. Todos os direitos reservados.
          </span>
        </div>
      </footer>
    </div>
  )
}

import type { Metadata } from 'next'
import { Syne, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jakarta',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Formação IA — ZEITH | Domine a Inteligência Artificial',
  description:
    'Aprenda a usar inteligência artificial como ferramenta estratégica. Formação intensiva para empreendedores e profissionais que querem liderar no mercado do futuro.',
}

export default function FormacaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${syne.variable} ${jakarta.variable} ${mono.variable}`}>
      {children}
    </div>
  )
}

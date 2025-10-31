import React from 'react'
import '../styles/globals.css'

export const metadata = {
  title: 'ZEITH — Experience IA',
  description: 'ZEITH — Experience IA'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Adding mobile-first meta tags for iOS/Android */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#18130E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" type="image/png" href="/brand/favicon.png" />
      </head>
      <body className="bg-[#18130E] text-neutral-100 antialiased h-screen-mobile">
        {/* header removido para evitar duplicidade de branding e logotipo */}
        {children}
      </body>
    </html>
  )
}

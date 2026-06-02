import type { Metadata } from 'next'
import { Poppins, Fira_Code } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
})

export const metadata: Metadata = {
  title: 'Whale Radar',
  description: '실시간 암호화폐 고래 추적 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark h-full overflow-hidden">
      <body className={`${poppins.variable} ${firaCode.variable} h-full overflow-hidden antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

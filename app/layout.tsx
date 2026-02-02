import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import { ThemeProvider } from '@/components/ThemeProvider'

const sarabun = Sarabun({ 
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sarabun',
})

export const metadata: Metadata = {
  title: 'EQAP - EduQuality Assessment Platform',
  description: 'ระบบประเมินคุณภาพสถานศึกษา',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning className={sarabun.variable}>
      <head>
        {/* บังคับใช้ Sarabun ทันที - inline style โหลดก่อน CSS อื่น */}
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body,*{font-family:'Sarabun',sans-serif !important}`,
          }}
        />
        {/* โหลด Sarabun จาก Google Fonts - ใช้ทั้งแอปผ่าน root layout */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* ตั้งค่า Dark/Light ก่อน React hydrate - default light mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}})();`,
          }}
        />
      </head>
      <body className={sarabun.variable} data-font="sarabun">
        <ThemeProvider>
          {children}
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  )
}

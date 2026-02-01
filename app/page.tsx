'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Light mode decorations */}
        <div className="dark:hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-secondary-200/40 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-secondary-100/60 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Dark mode decorations */}
        <div className="hidden dark:block">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-900/40 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-900/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-primary-800/30 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 animate-pulse-glow" />
        </div>
      </div>

      <div className="text-center space-y-8 relative z-10">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-secondary-500 mb-4 shadow-glow-purple animate-fadeIn">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold gradient-text animate-fadeIn">
          EQAP
        </h1>
        <p className="text-2xl md:text-3xl text-gray-700 dark:text-gray-200 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          EduQuality Assessment Platform
        </p>
        <p className="text-lg text-gray-600 dark:text-gray-400 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          ระบบประเมินคุณภาพสถานศึกษา
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          <Link
            href="/login"
            className="btn-primary px-8 py-4 text-lg"
          >
            เข้าสู่ระบบ
          </Link>
          <Link
            href="/signup"
            className="btn-secondary px-8 py-4 text-lg"
          >
            ลงทะเบียน
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="card p-6 bg-white/80 dark:bg-dark-card/80 backdrop-blur-lg hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 shadow-glow-purple">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-400 mb-2">
              Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              ดูภาพรวมและสถิติการประเมินแบบ Real-time
            </p>
          </div>
          
          <div className="card p-6 bg-white/80 dark:bg-dark-card/80 backdrop-blur-lg hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center mb-4 shadow-glow-blue">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-400 mb-2">
              Assessment
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              ประเมินคุณภาพ 47 ตัวชี้วัด พร้อม Auto-save
            </p>
          </div>
          
          <div className="card p-6 bg-white/80 dark:bg-dark-card/80 backdrop-blur-lg hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mb-4 shadow-glow-purple">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-400 mb-2">
              Reports
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              รายงาน Radar Graph และเปรียบเทียบหลายปี
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-center text-sm text-gray-500 dark:text-gray-500">
        <p>EQAP v1.0 | EduQuality Assessment Platform</p>
      </footer>
    </main>
  )
}

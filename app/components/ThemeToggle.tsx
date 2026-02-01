'use client'

import { useTheme } from './ThemeProvider'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center w-14 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-primary-600 to-secondary-600 shadow-glow-purple'
          : 'bg-gradient-to-r from-secondary-200 to-primary-200 shadow-md'
      } ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Track background */}
      <span className="sr-only">Toggle theme</span>
      
      {/* Sun icon */}
      <span
        className={`absolute left-1.5 transition-all duration-300 ${
          theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <svg
          className="w-5 h-5 text-yellow-300"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      </span>

      {/* Sliding circle */}
      <span
        className={`absolute w-6 h-6 rounded-full shadow-lg transition-all duration-300 ${
          theme === 'dark'
            ? 'translate-x-3 bg-dark-bg'
            : '-translate-x-3 bg-white'
        }`}
      />

      {/* Moon icon */}
      <span
        className={`absolute right-1.5 transition-all duration-300 ${
          theme === 'light' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <svg
          className="w-5 h-5 text-primary-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </span>
    </button>
  )
}

export default ThemeToggle

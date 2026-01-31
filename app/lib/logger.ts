// Logging utility for better error tracking and debugging

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  context?: any
  userId?: string
  requestId?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, context?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
    }

    // In development, use console
    if (this.isDevelopment) {
      const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
      }[level]

      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `${emoji} [${level.toUpperCase()}] ${message}`,
        context || ''
      )
    }

    // In production, you would send logs to a service like:
    // - CloudWatch (AWS)
    // - Stackdriver (GCP)
    // - Application Insights (Azure)
    // - Sentry, LogRocket, etc.
  }

  info(message: string, context?: any): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error | any, context?: any): void {
    this.log('error', message, {
      error: error?.message || error,
      stack: error?.stack,
      ...context,
    })
  }

  debug(message: string, context?: any): void {
    if (this.isDevelopment) {
      this.log('debug', message, context)
    }
  }

  // API request logging
  apiRequest(method: string, url: string, userId?: string): void {
    this.info(`API ${method} ${url}`, { userId })
  }

  // API response logging
  apiResponse(method: string, url: string, status: number, duration: number): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info'
    this.log(level, `API ${method} ${url} - ${status} (${duration}ms)`)
  }

  // Database query logging
  dbQuery(query: string, duration: number): void {
    if (this.isDevelopment) {
      this.debug(`DB Query (${duration}ms): ${query}`)
    }
  }
}

const logger = new Logger()

export default logger

// Helper function for API route error handling
export function handleAPIError(error: any, operation: string): {
  success: false
  message: string
} {
  logger.error(`${operation} failed`, error)

  // Don't expose internal errors to client
  const message = process.env.NODE_ENV === 'development'
    ? error.message
    : 'เกิดข้อผิดพลาดในการดำเนินการ'

  return {
    success: false,
    message,
  }
}

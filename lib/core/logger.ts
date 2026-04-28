type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: Error
}

function formatLog(entry: LogEntry): string {
  const base = {
    level: entry.level.toUpperCase(),
    timestamp: entry.timestamp,
    message: entry.message,
    ...(entry.context && { context: entry.context }),
    ...(entry.error && {
      error: entry.error.message,
      stack: entry.error.stack,
    }),
  }
  return JSON.stringify(base)
}

function shouldLog(level: LogLevel): boolean {
  const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel
  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }
  return levels[level] >= levels[envLevel]
}

function createLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    error,
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.debug(formatLog(createLogEntry('debug', message, context)))
    }
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.info(formatLog(createLogEntry('info', message, context)))
    }
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(formatLog(createLogEntry('warn', message, context)))
    }
  },
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    if (shouldLog('error')) {
      console.error(formatLog(createLogEntry('error', message, context, error)))
    }
  },
}

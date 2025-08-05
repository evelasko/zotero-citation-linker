import { Logger as ZoteroLogger } from 'zotero-plugin/logger'
import { PLUGIN_NAME } from '../config/constants'
import { ILogger } from './types'

/**
 * Logger wrapper for Zotero Citation Linker
 * Provides a consistent logging interface across all modules
 */
export class Logger implements ILogger {
  private zoteroLogger: ZoteroLogger
  private prefix: string

  constructor(module: string = '') {
    const loggerName = module ? `${PLUGIN_NAME} ${module}` : PLUGIN_NAME
    this.zoteroLogger = new ZoteroLogger(loggerName)
    this.prefix = module ? `[${module}]` : ''
  }

  /**
   * Log an info message
   */
  info(message: string): void {
    this.zoteroLogger.info(this.formatMessage(message))
  }

  /**
   * Log an error message
   */
  error(message: string): void {
    this.zoteroLogger.error(this.formatMessage(message))
  }

  /**
   * Log a debug message
   */
  debug(message: string): void {
    this.zoteroLogger.debug(this.formatMessage(message))
  }

  /**
   * Log a warning message
   */
  warn(message: string): void {
    // Use info for warnings if warn is not available on zotero-plugin logger
    try {
      (this.zoteroLogger as any).warn(this.formatMessage(message))
    } catch {
      this.zoteroLogger.info(`[WARN] ${this.formatMessage(message)}`)
    }
  }

  /**
   * Format message with prefix if available
   */
  private formatMessage(message: string): string {
    return this.prefix ? `${this.prefix} ${message}` : message
  }
}

// Create singleton instances for common modules
export const logger = new Logger()
export const apiLogger = new Logger('API')
export const serviceLogger = new Logger('Service')
export const utilLogger = new Logger('Util')
export const uiLogger = new Logger('UI')
import { IService } from '../core/types'
import { ServiceManager } from '../core/ServiceManager'
import { uiLogger as logger } from '../core/Logger'

export interface NotificationOptions {
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  timeout?: number
  buttons?: Array<{
    label: string
    callback: () => void
  }>
}

/**
 * Status notification service for user feedback
 * Provides various notification methods for the plugin
 */
export class StatusNotification implements IService {
  private initialized = false
  private serviceManager: ServiceManager

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing status notification service')

    try {
      this.initialized = true
      logger.info('Status notification service initialized successfully')
    } catch (error) {
      logger.error(`Error initializing status notification service: ${error}`)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up status notification service')

    try {
      this.initialized = false
      logger.info('Status notification service cleaned up')
    } catch (error) {
      logger.error(`Error cleaning up status notification service: ${error}`)
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Show a success notification
   * @param title - Notification title
   * @param message - Notification message
   * @param timeout - Timeout in milliseconds (default: 3000)
   */
  showSuccess(title: string, message: string, timeout: number = 3000): void {
    this.showNotification({
      title,
      message,
      type: 'success',
      timeout,
    })
  }

  /**
   * Show an error notification
   * @param title - Notification title
   * @param message - Notification message
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  showError(title: string, message: string, timeout: number = 5000): void {
    this.showNotification({
      title,
      message,
      type: 'error',
      timeout,
    })
  }

  /**
   * Show a warning notification
   * @param title - Notification title
   * @param message - Notification message
   * @param timeout - Timeout in milliseconds (default: 4000)
   */
  showWarning(title: string, message: string, timeout: number = 4000): void {
    this.showNotification({
      title,
      message,
      type: 'warning',
      timeout,
    })
  }

  /**
   * Show an info notification
   * @param title - Notification title
   * @param message - Notification message
   * @param timeout - Timeout in milliseconds (default: 3000)
   */
  showInfo(title: string, message: string, timeout: number = 3000): void {
    this.showNotification({
      title,
      message,
      type: 'info',
      timeout,
    })
  }

  /**
   * Show a notification with custom options
   * @param options - Notification options
   */
  showNotification(options: NotificationOptions): void {
    try {
      // Use Zotero's built-in progress window for notifications
      const progressWindow = new (Zotero as any).ProgressWindow()
      progressWindow.changeHeadline(options.title)
      const progressItem = new (Zotero as any).ProgressWindow.ItemProgress(
        this.getNotificationIcon(options.type || 'info'),
        options.message,
      )
      progressWindow.progress = progressItem
      progressWindow.show()

      // Auto-close after timeout
      const timeout = options.timeout || 3000
      const timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer)
      timer.initWithCallback(() => {
        progressWindow.close()
      }, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT)

      logger.debug(`Showed ${options.type || 'info'} notification: ${options.title} - ${options.message}`)
    } catch (error) {
      logger.error(`Error showing notification: ${error}`)
      // Fallback to logger
      logger.info(`[${options.type?.toUpperCase() || 'INFO'}] ${options.title}: ${options.message}`)
    }
  }

  /**
   * Show a progress notification that can be updated
   * @param title - Progress title
   * @param message - Initial message
   * @returns Progress controller object
   */
  showProgress(title: string, message: string): {
    update: (message: string, percentage?: number) => void // eslint-disable-line no-unused-vars
    close: () => void
  } {
    try {
      const progressWindow = new (Zotero as any).ProgressWindow()
      progressWindow.changeHeadline(title)
      const progressItem = new (Zotero as any).ProgressWindow.ItemProgress(
        'chrome://zotero/skin/arrow_refresh.png',
        message,
      )
      progressWindow.progress = progressItem
      progressWindow.show()

      return {
        update: (newMessage: string, percentage?: number) => {
          try {
            if (progressWindow.progress) {
              progressWindow.progress.setText(newMessage)
              if (typeof percentage === 'number') {
                progressWindow.progress.setProgress(percentage)
              }
            }
          } catch (error) {
            logger.error(`Error updating progress: ${error}`)
          }
        },
        close: () => {
          try {
            progressWindow.close()
          } catch (error) {
            logger.error(`Error closing progress: ${error}`)
          }
        },
      }
    } catch (error) {
      logger.error(`Error showing progress notification: ${error}`)
      // Return dummy controller
      return {
        update: () => {},
        close: () => {},
      }
    }
  }

  /**
   * Show a citation copy success notification
   * @param count - Number of citations copied
   */
  showCitationCopied(count: number): void {
    const message = count === 1
      ? 'Citation copied to clipboard'
      : `${count} citations copied to clipboard`

    this.showSuccess('Citation Linker', message)
  }

  /**
   * Show an API URL copy success notification
   * @param count - Number of URLs copied
   */
  showApiUrlCopied(count: number): void {
    const message = count === 1
      ? 'API URL copied to clipboard'
      : `${count} API URLs copied to clipboard`

    this.showSuccess('Citation Linker', message)
  }

  /**
   * Show a translation success notification
   * @param itemCount - Number of items processed
   * @param method - Translation method used
   */
  showTranslationSuccess(itemCount: number, method: string): void {
    const message = itemCount === 1
      ? `Successfully translated 1 item using ${method}`
      : `Successfully translated ${itemCount} items using ${method}`

    this.showSuccess('Citation Linker', message)
  }

  /**
   * Show a translation error notification
   * @param error - Error message
   */
  showTranslationError(error: string): void {
    this.showError('Translation Failed', error)
  }

  /**
   * Get notification icon based on type
   * @param type - Notification type
   * @returns Icon path
   */
  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'chrome://zotero/skin/tick.png'
      case 'error':
        return 'chrome://zotero/skin/cross.png'
      case 'warning':
        return 'chrome://zotero/skin/error.png'
      case 'info':
      default:
        return 'chrome://zotero/skin/information.png'
    }
  }
}
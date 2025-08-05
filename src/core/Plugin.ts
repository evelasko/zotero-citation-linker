import { DEFAULT_PREFERENCES } from '../config/constants'
import { ServiceManager } from './ServiceManager'
import { logger } from './Logger'

/**
 * Main Plugin orchestrator class for Zotero Citation Linker
 * Coordinates all services and manages plugin lifecycle
 */
export class Plugin {
  private initialized = false
  private notifierID: string | null = null
  private serviceManager: ServiceManager
  private build: number = 4

  constructor() {
    // Initialize the service manager
    this.serviceManager = new ServiceManager()
  }

  /**
   * Install and initialize the plugin
   * Called when the plugin is first loaded
   */
  async install(): Promise<void> {
    if (this.initialized) {
      logger.warn('Plugin already initialized')
      return
    }

    logger.info('Installing Zotero Citation Linker plugin with modular architecture')

    try {
      // Initialize preferences
      this.initializePreferences()

      // Initialize all services through ServiceManager
      await this.serviceManager.initialize()

      // Register Zotero notifier for item events
      this.notifierID = Zotero.Notifier.registerObserver(this, ['item'])

      this.initialized = true
      logger.info('Plugin installation completed successfully')
    } catch (error) {
      logger.error(`Error during plugin installation: ${error}`)
      // Cleanup any partially initialized services
      await this.cleanup()
      throw error
    }
  }

  /**
   * Uninstall and cleanup the plugin
   * Called when the plugin is being disabled or removed
   */
  async uninstall(): Promise<void> {
    logger.info('Uninstalling Zotero Citation Linker plugin')

    try {
      await this.cleanup()
      logger.info('Plugin uninstallation completed successfully')
    } catch (error) {
      logger.error(`Error during plugin uninstallation: ${error}`)
    }
  }

  /**
   * Startup method - called after installation
   * Can be used for post-initialization tasks
   */
  async startup(): Promise<void> {
    if (!this.initialized) {
      logger.warn('Plugin not initialized, calling install first')
      await this.install()
      return
    }

    logger.info('Plugin startup completed')
  }

  /**
   * Shutdown method - called before uninstallation
   * Can be used for pre-cleanup tasks
   */
  async shutdown(): Promise<void> {
    logger.info('Plugin shutdown initiated')
    // Currently no specific shutdown tasks needed
    logger.info('Plugin shutdown completed')
  }

  /**
   * Private cleanup method
   */
  private async cleanup(): Promise<void> {
    try {
      // Unregister notifier
      if (this.notifierID) {
        Zotero.Notifier.unregisterObserver(this.notifierID)
        this.notifierID = null
      }

      // Cleanup all services through ServiceManager
      await this.serviceManager.cleanup()

      this.initialized = false
      logger.info('Plugin cleanup completed')
    } catch (error) {
      logger.error(`Error during plugin cleanup: ${error}`)
    }
  }

  /**
   * Initialize plugin preferences with default values
   */
  private initializePreferences(): void {
    logger.info('Initializing plugin preferences')

    try {
      // Set default preferences if they don't exist
      Object.entries(DEFAULT_PREFERENCES).forEach(([key, value]) => {
        try {
          // Only set if preference doesn't already exist
          const existingValue = Zotero.Prefs.get(key)
          if (existingValue === undefined || existingValue === null) {
            Zotero.Prefs.set(key, Array.isArray(value) ? value.join(',') : value)
            logger.debug(`Set default preference: ${key} = ${value}`)
          }
        } catch (error) {
          logger.error(`Error setting preference ${key}: ${error}`)
        }
      })

      logger.info('Plugin preferences initialized')
    } catch (error) {
      logger.error(`Error initializing preferences: ${error}`)
    }
  }

  /**
   * Handle Zotero notifications
   * @param event - Notification event type
   * @param type - Object type
   * @param ids - Array of object IDs
   * @param extraData - Additional event data
   */
  notify(event: string, type: string, ids: number[]): void {
    try {
      // Log notifications for debugging
      logger.debug(`Notification received: ${event} ${type} [${ids.join(', ')}]`)

      // Handle item notifications if needed
      if (type === 'item') {
        // Future: Could trigger duplicate detection, metadata validation, etc.
        // For now, just log
        logger.debug(`Item notification: ${event} for ${ids.length} items`)
      }
    } catch (error) {
      logger.error(`Error handling notification: ${error}`)
    }
  }

  /**
   * Get the service manager instance
   * @returns ServiceManager instance
   */
  getServiceManager(): ServiceManager {
    return this.serviceManager
  }

  /**
   * Check if plugin is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get plugin status information
   * @returns Plugin status object
   */
  getStatus(): {
    build: number
    initialized: boolean
    notifierRegistered: boolean
    services: Record<string, boolean>
    ui: {
      initialized: boolean
      services: Array<{
        name: string
        initialized: boolean
        status: string
      }>
    }
    translators: {
      initialized: boolean
      services: Array<{
        name: string
        initialized: boolean
        status: string
      }>
    }
  } {
    return {
      build: this.build,
      initialized: this.initialized,
      notifierRegistered: this.notifierID !== null,
      services: this.serviceManager.getServicesStatus(),
      ui: this.serviceManager.uiManager.getUIStatus(),
      translators: this.serviceManager.translatorManager.getTranslatorStatus(),
    }
  }

  /**
   * Get plugin version information
   * @returns Version information
   */
  getVersion(): {
    version: string
    buildDate: string
    architecture: string
  } {
    return {
      version: '1.4.0', // Should match package.json
      buildDate: new Date().toISOString(),
      architecture: 'modular',
    }
  }

  /**
   * Show plugin status in a user-friendly way
   */
  showStatus(): void {
    const status = this.getStatus()
    const version = this.getVersion()

    const message = `
Zotero Citation Linker ${version.version}
Architecture: ${version.architecture}

Status:
- Plugin Initialized: ${status.initialized ? '✓' : '✗'}
- Notifier Registered: ${status.notifierRegistered ? '✓' : '✗'}
- Services: ${Object.values(status.services).filter(Boolean).length}/${Object.keys(status.services).length} active
- UI Services: ${status.ui.services.filter(s => s.initialized).length}/${status.ui.services.length} active
- Translator Services: ${status.translators.services.filter(s => s.initialized).length}/${status.translators.services.length} active

Build: ${status.build}
Build Date: ${version.buildDate}
    `.trim()

    // Use service manager to show notification
    if (this.initialized && this.serviceManager.uiManager.isInitialized()) {
      this.serviceManager.uiManager.showInfo('Plugin Status', message)
    } else {
      logger.info(message)
    }
  }

  /**
   * Restart the plugin (useful for development and troubleshooting)
   */
  async restart(): Promise<void> {
    logger.info('Restarting plugin')

    try {
      await this.uninstall()
      await this.install()
      logger.info('Plugin restart completed successfully')
    } catch (error) {
      logger.error(`Error restarting plugin: ${error}`)
      throw error
    }
  }
}
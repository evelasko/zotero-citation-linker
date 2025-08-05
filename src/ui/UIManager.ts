import { IService } from '../core/types'
import { ServiceManager } from '../core/ServiceManager'
import { uiLogger as logger } from '../core/Logger'
import { ContextMenu } from './ContextMenu'
import { KeyboardShortcuts } from './KeyboardShortcuts'
import { StatusNotification } from './StatusNotification'

/**
 * UI Manager service for coordinating all user interface components
 * Manages context menus, keyboard shortcuts, and notifications
 */
export class UIManager implements IService {
  private initialized = false
  private serviceManager: ServiceManager

  // UI Services
  public contextMenu: ContextMenu
  public keyboardShortcuts: KeyboardShortcuts
  public statusNotification: StatusNotification

  private uiServices: Map<string, IService> = new Map()

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager

    // Initialize UI services
    this.contextMenu = new ContextMenu(serviceManager)
    this.keyboardShortcuts = new KeyboardShortcuts(serviceManager)
    this.statusNotification = new StatusNotification(serviceManager)

    // Register services for lifecycle management
    this.uiServices.set('contextMenu', this.contextMenu)
    this.uiServices.set('keyboardShortcuts', this.keyboardShortcuts)
    this.uiServices.set('statusNotification', this.statusNotification)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing UI Manager service')

    try {
      // Initialize all UI services in parallel
      const initPromises = Array.from(this.uiServices.entries()).map(async ([name, service]) => {
        try {
          await service.initialize()
          logger.debug(`UI service '${name}' initialized successfully`)
        } catch (error) {
          logger.error(`Failed to initialize UI service '${name}': ${error}`)
          throw error
        }
      })

      await Promise.all(initPromises)

      this.initialized = true
      logger.info(`UI Manager service initialized successfully with ${this.uiServices.size} UI services`)
    } catch (error) {
      logger.error(`UIManager initialization failed: ${error}`)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up UI Manager service')

    try {
      // Cleanup all UI services in parallel
      const cleanupPromises = Array.from(this.uiServices.entries()).map(async ([name, service]) => {
        try {
          await service.cleanup()
          logger.debug(`UI service '${name}' cleaned up successfully`)
        } catch (error) {
          logger.error(`Error cleaning up UI service '${name}': ${error}`)
        }
      })

      await Promise.all(cleanupPromises)

      this.initialized = false
      logger.info('UI Manager service cleaned up')
    } catch (error) {
      logger.error(`UIManager cleanup failed: ${error}`)
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get UI service status
   * @returns Status information for all UI services
   */
  getUIStatus(): {
    initialized: boolean
    services: Array<{
      name: string
      initialized: boolean
      status: string
    }>
  } {
    const services = Array.from(this.uiServices.entries()).map(([name, service]) => ({
      name,
      initialized: service.isInitialized ? service.isInitialized() : false,
      status: service.isInitialized && service.isInitialized() ? 'active' : 'inactive',
    }))

    return {
      initialized: this.initialized,
      services,
    }
  }

  /**
   * Check if all UI services are initialized
   * @returns True if all services are initialized
   */
  areAllServicesInitialized(): boolean {
    return Array.from(this.uiServices.values()).every(service =>
      service.isInitialized ? service.isInitialized() : false,
    )
  }

  /**
   * Get UI service by name
   * @param name - Service name
   * @returns UI service or undefined
   */
  getUIService(name: string): IService | undefined {
    return this.uiServices.get(name)
  }

  /**
   * List all registered UI services
   * @returns Array of service names
   */
  listUIServices(): string[] {
    return Array.from(this.uiServices.keys())
  }

  /**
   * Show a success message using status notification
   * @param title - Message title
   * @param message - Message content
   */
  showSuccess(title: string, message: string): void {
    this.statusNotification.showSuccess(title, message)
  }

  /**
   * Show an error message using status notification
   * @param title - Message title
   * @param message - Message content
   */
  showError(title: string, message: string): void {
    this.statusNotification.showError(title, message)
  }

  /**
   * Show a warning message using status notification
   * @param title - Message title
   * @param message - Message content
   */
  showWarning(title: string, message: string): void {
    this.statusNotification.showWarning(title, message)
  }

  /**
   * Show an info message using status notification
   * @param title - Message title
   * @param message - Message content
   */
  showInfo(title: string, message: string): void {
    this.statusNotification.showInfo(title, message)
  }

  /**
   * Check if context menu is enabled
   * @returns True if context menu is enabled
   */
  isContextMenuEnabled(): boolean {
    try {
      const enabled = Zotero.Prefs.get('extensions.zotero-citation-linker.enableContextMenu', true)
      return Boolean(enabled)
    } catch (error) {
      logger.debug(`Error checking context menu preference: ${error}`)
      return true
    }
  }

  /**
   * Enable or disable context menu
   * @param enabled - Whether to enable context menu
   */
  setContextMenuEnabled(enabled: boolean): void {
    try {
      Zotero.Prefs.set('extensions.zotero-citation-linker.enableContextMenu', enabled)
      logger.info(`Context menu ${enabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      logger.error(`Error setting context menu preference: ${error}`)
    }
  }

  /**
   * Check if keyboard shortcuts are enabled
   * @returns True if keyboard shortcuts are enabled
   */
  isKeyboardShortcutsEnabled(): boolean {
    return this.keyboardShortcuts.isShortcutEnabled()
  }

  /**
   * Enable or disable keyboard shortcuts
   * @param enabled - Whether to enable keyboard shortcuts
   */
  setKeyboardShortcutsEnabled(enabled: boolean): void {
    this.keyboardShortcuts.setShortcutEnabled(enabled)
  }

  /**
   * Get keyboard shortcut configuration
   * @returns Shortcut configuration
   */
  getKeyboardShortcutConfig() {
    return this.keyboardShortcuts.getShortcutConfig()
  }

  /**
   * Get UI configuration summary
   * @returns UI configuration object
   */
  getUIConfiguration(): {
    contextMenu: {
      enabled: boolean
      itemsRegistered: number
    }
    keyboardShortcuts: {
      enabled: boolean
      shortcut: string
      description: string
    }
    notifications: {
      enabled: boolean
    }
  } {
    return {
      contextMenu: {
        enabled: this.isContextMenuEnabled(),
        itemsRegistered: 2, // Copy Markdown Link + Copy API URL
      },
      keyboardShortcuts: this.keyboardShortcuts.getShortcutConfig(),
      notifications: {
        enabled: true, // Always enabled
      },
    }
  }
}
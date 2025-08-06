import { ItemValidator } from '../services/ItemValidator'
import { DuplicateDetector } from '../services/DuplicateDetector'
import { CitationGenerator } from '../services/CitationGenerator'
import { CrossRefService } from '../services/CrossRefService'
import { PerplexityService } from '../services/PerplexityService'
import { ApiServer } from '../services/ApiServer'
import { UIManager } from '../ui/UIManager'
import { TranslatorManager } from '../translators/TranslatorManager'
import { logger } from './Logger'
import { IService } from './types'

/**
 * Service manager for coordinating all plugin services
 */
export class ServiceManager {
  private services: Map<string, IService> = new Map()
  private initialized = false

  // Service instances
  public itemValidator: ItemValidator
  public duplicateDetector: DuplicateDetector
  public citationGenerator: CitationGenerator
  public crossRefService: CrossRefService
  public perplexityService: PerplexityService
  public apiServer: ApiServer
  public uiManager: UIManager
  public translatorManager: TranslatorManager

  constructor() {
    // Initialize service instances
    this.itemValidator = new ItemValidator()
    this.duplicateDetector = new DuplicateDetector()
    this.citationGenerator = new CitationGenerator()
    this.crossRefService = new CrossRefService()
    this.perplexityService = new PerplexityService()
    this.apiServer = new ApiServer(this)
    this.uiManager = new UIManager(this)
    this.translatorManager = new TranslatorManager(this)

    // Register services
    this.services.set('itemValidator', this.itemValidator)
    this.services.set('duplicateDetector', this.duplicateDetector)
    this.services.set('citationGenerator', this.citationGenerator)
    this.services.set('crossRefService', this.crossRefService)
    this.services.set('perplexityService', this.perplexityService)
    this.services.set('apiServer', this.apiServer)
    this.services.set('uiManager', this.uiManager)
    this.services.set('translatorManager', this.translatorManager)
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('ServiceManager already initialized')
      return
    }

    logger.info('Initializing ServiceManager and all services')

    try {
      // Initialize all services in parallel
      const initPromises = Array.from(this.services.values()).map(service =>
        service.initialize().catch(error => {
          logger.error(`Failed to initialize service: ${error}`)
          throw error
        }),
      )

      await Promise.all(initPromises)

      this.initialized = true
      logger.info('ServiceManager initialization completed successfully')
    } catch (error) {
      logger.error(`ServiceManager initialization failed: ${error}`)
      // Cleanup any partially initialized services
      await this.cleanup()
      throw error
    }
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up ServiceManager and all services')

    try {
      // Cleanup all services in parallel
      const cleanupPromises = Array.from(this.services.values()).map(service =>
        service.cleanup().catch(error => {
          logger.error(`Failed to cleanup service: ${error}`)
          // Continue with other cleanups even if one fails
        }),
      )

      await Promise.all(cleanupPromises)

      this.initialized = false
      logger.info('ServiceManager cleanup completed')
    } catch (error) {
      logger.error(`ServiceManager cleanup failed: ${error}`)
    }
  }

  /**
   * Get a service by name
   * @param serviceName - Name of the service
   * @returns Service instance or undefined
   */
  getService<T extends IService>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T
  }

  /**
   * Check if all services are initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get status of all services
   */
  getServicesStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {}

    for (const [name, service] of this.services) {
      status[name] = service.isInitialized?.() ?? false
    }

    return status
  }

  /**
   * Restart a specific service
   * @param serviceName - Name of the service to restart
   */
  async restartService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName)
    if (!service) {
      throw new Error(`Service ${serviceName} not found`)
    }

    logger.info(`Restarting service: ${serviceName}`)

    try {
      await service.cleanup()
      await service.initialize()
      logger.info(`Service ${serviceName} restarted successfully`)
    } catch (error) {
      logger.error(`Failed to restart service ${serviceName}: ${error}`)
      throw error
    }
  }

  /**
   * Add a new service to the manager
   * @param name - Service name
   * @param service - Service instance
   */
  registerService(name: string, service: IService): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`)
    }

    this.services.set(name, service)
    logger.info(`Service ${name} registered`)
  }

  /**
   * Remove a service from the manager
   * @param name - Service name
   */
  async unregisterService(name: string): Promise<void> {
    const service = this.services.get(name)
    if (!service) {
      logger.warn(`Service ${name} not found for unregistration`)
      return
    }

    try {
      await service.cleanup()
      this.services.delete(name)
      logger.info(`Service ${name} unregistered`)
    } catch (error) {
      logger.error(`Failed to unregister service ${name}: ${error}`)
      throw error
    }
  }
}
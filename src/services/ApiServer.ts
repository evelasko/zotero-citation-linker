import { IService } from '../core/types'
import { ServiceManager } from '../core/ServiceManager'
import { serviceLogger as logger } from '../core/Logger'
import { DEFAULT_API_PORT } from '../config/constants'
// Import all endpoints
import { ProcessUrlEndpoint } from '../api/endpoints/ProcessUrlEndpoint'
import { AnalyzeUrlEndpoint } from '../api/endpoints/AnalyzeUrlEndpoint'
import { ProcessIdentifierEndpoint } from '../api/endpoints/ProcessIdentifierEndpoint'
import { DetectIdentifierEndpoint } from '../api/endpoints/DetectIdentifierEndpoint'
import { SaveWebpageEndpoint } from '../api/endpoints/SaveWebpageEndpoint'
import { ItemKeyByUrlEndpoint } from '../api/endpoints/ItemKeyByUrlEndpoint'

/**
 * API Server service for managing HTTP endpoints
 */
export class ApiServer implements IService {
  private initialized = false
  private serviceManager: ServiceManager
  private endpoints: Array<{
    instance: any
    path: string
  }> = []

  constructor(serviceManager: ServiceManager) {
    this.serviceManager = serviceManager
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing ApiServer service')

    try {
      // Check if Zotero Server is available
      if (!(Zotero.Server as any).port) {
        // Start Zotero server if not already running
        logger.info('Starting Zotero HTTP server')
        try {
          await (Zotero.Server as any).init()
        } catch (error) {
          logger.warn(`Could not start Zotero server: ${error}`)
        }
      }

      // Initialize and register all endpoints
      await this.initializeEndpoints()

      this.initialized = true
      logger.info('ApiServer service initialized successfully')
    } catch (error) {
      logger.error(`ApiServer initialization failed: ${error}`)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up ApiServer service')

    try {
      // Cleanup all endpoints
      await Promise.all(
        this.endpoints.map(async ({ instance }) => {
          if (instance.cleanup) {
            try {
              await instance.cleanup()
            } catch (error) {
              logger.error(`Error cleaning up endpoint: ${error}`)
            }
          }
        }),
      )

      // Clear endpoint registrations
      this.endpoints.forEach(({ path }) => {
        try {
          delete (Zotero.Server as any).Endpoints[path]
          logger.debug(`Unregistered endpoint: ${path}`)
        } catch (error) {
          logger.error(`Error unregistering endpoint ${path}: ${error}`)
        }
      })

      this.endpoints = []
      this.initialized = false
      logger.info('ApiServer service cleaned up')
    } catch (error) {
      logger.error(`ApiServer cleanup failed: ${error}`)
    }
  }

  /**
   * Initialize and register all API endpoints
   */
  private async initializeEndpoints(): Promise<void> {
    const endpointClasses = [
      ProcessUrlEndpoint,
      AnalyzeUrlEndpoint,
      ProcessIdentifierEndpoint,
      DetectIdentifierEndpoint,
      SaveWebpageEndpoint,
      ItemKeyByUrlEndpoint,
    ]

    logger.info(`Initializing ${endpointClasses.length} API endpoints`)

    for (const EndpointClass of endpointClasses) {
      try {
        // Create endpoint instance
        const endpoint = new EndpointClass(this.serviceManager)

        // Initialize endpoint if it has an initialize method
        if (typeof endpoint.initialize === 'function') {
          await endpoint.initialize()
        }

        // Register endpoint with Zotero server
        endpoint.register()

        // Store endpoint reference for cleanup
        this.endpoints.push({
          instance: endpoint,
          path: endpoint.path,
        })

        logger.info(`Registered endpoint: ${endpoint.path}`)
      } catch (error) {
        logger.error(`Failed to initialize endpoint ${EndpointClass.name}: ${error}`)
        throw error
      }
    }

    logger.info('All API endpoints initialized and registered')
  }

  /**
   * Get server port
   * @returns Server port number
   */
  getServerPort(): number {
    try {
      return (Zotero.Server as any).port || DEFAULT_API_PORT
    } catch {
      return DEFAULT_API_PORT
    }
  }

  /**
   * Get server status
   * @returns Server status information
   */
  getServerStatus(): {
    running: boolean
    port: number
    endpointCount: number
    endpoints: string[]
  } {
    const running = !!(Zotero.Server as any).port
    const port = this.getServerPort()
    const endpointPaths = this.endpoints.map(e => e.path)

    return {
      running,
      port,
      endpointCount: this.endpoints.length,
      endpoints: endpointPaths,
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get endpoint by path
   * @param path - Endpoint path
   * @returns Endpoint instance or undefined
   */
  getEndpoint(path: string): any {
    const endpoint = this.endpoints.find(e => e.path === path)
    return endpoint?.instance
  }

  /**
   * List all registered endpoints
   * @returns Array of endpoint information
   */
  listEndpoints(): Array<{
    path: string
    methods: string[]
    description?: string
  }> {
    return this.endpoints.map(({ instance, path }) => ({
      path,
      methods: instance.supportedMethods || ['POST'],
      description: instance.constructor.name,
    }))
  }
}
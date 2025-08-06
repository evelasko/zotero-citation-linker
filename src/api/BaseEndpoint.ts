import { ServiceManager } from '../core/ServiceManager'
import { ResponseBuilder } from '../utils/ResponseBuilder'
import { apiLogger as logger } from '../core/Logger'
import { RequestValidator } from './middleware/RequestValidator'

/**
 * Base class for all API endpoints
 */
export abstract class BaseEndpoint {
  protected serviceManager: ServiceManager
  public path: string
  protected supportedMethods: string[]
  protected supportedDataTypes: string[]

  constructor(path: string, serviceManager: ServiceManager, methods: string[] = ['POST']) {
    this.path = path
    this.serviceManager = serviceManager
    this.supportedMethods = methods
    this.supportedDataTypes = ['application/json']
  }

  /**
   * Optional initialization method for endpoints
   */
  async initialize?(): Promise<void>

  /**
   * Abstract method that each endpoint must implement
   * @param requestData - Request data from Zotero server
   * @returns Response array [statusCode, contentType, body]
   */
  abstract handleRequest(requestData: any): Promise<[number, string, string]> // eslint-disable-line no-unused-vars

  /**
   * Create the Zotero server endpoint prototype
   * @returns Endpoint prototype object
   */
  createEndpointPrototype(): any {
    const self = this

    const EndpointConstructor = function() {}
    EndpointConstructor.prototype = {
      supportedMethods: this.supportedMethods,
      supportedDataTypes: this.supportedDataTypes,

      init: async function(requestData: any) {
        try {
          logger.info(`${self.path} endpoint called`)
          return await self.handleRequest(requestData)
        } catch (error) {
          logger.error(`Error in ${self.path}: ${error}`)
          return ResponseBuilder.error(error)
        }
      },
    }

    return EndpointConstructor
  }

  /**
   * Register this endpoint with Zotero server
   */
  register(): void {
    const EndpointConstructor = this.createEndpointPrototype();
    (Zotero.Server as any).Endpoints[this.path] = EndpointConstructor
    logger.info(`Registered ${this.path} endpoint`)
  }

  /**
   * Validate basic request structure
   * @param requestData - Request data
   * @returns Validation result
   */
  protected validateRequest(requestData: any) {
    return RequestValidator.validateRequest(requestData)
  }

  /**
   * Validate URL request
   * @param requestData - Request data
   * @returns Validation result with URL
   */
  protected validateUrlRequest(requestData: any) {
    return RequestValidator.validateUrlRequest(requestData)
  }

  /**
   * Validate identifier request
   * @param requestData - Request data
   * @returns Validation result with identifier
   */
  protected validateIdentifierRequest(requestData: any) {
    return RequestValidator.validateIdentifierRequest(requestData)
  }

  /**
   * Check if library is editable
   * @returns True if editable
   */
  protected checkLibraryEditable(): boolean {
    return RequestValidator.checkLibraryEditable()
  }

  /**
   * Create success response
   * @param data - Response data
   * @param metadata - Additional metadata
   * @returns Formatted success response
   */
  protected successResponse(data: any, metadata?: Record<string, any>) {
    return ResponseBuilder.success(data, metadata)
  }

  /**
   * Create error response
   * @param error - Error object or message
   * @param statusCode - HTTP status code
   * @param additionalData - Additional data to include in response
   * @returns Formatted error response
   */
  protected errorResponse(error: Error | string, statusCode?: number, additionalData?: any) {
    return ResponseBuilder.error(error, statusCode, additionalData)
  }

  /**
   * Create validation error response
   * @param message - Validation error message
   * @returns Formatted validation error response
   */
  protected validationErrorResponse(message: string) {
    return ResponseBuilder.validationError(message)
  }

  /**
   * Create translation success response
   * @param items - Translated items
   * @param method - Translation method
   * @param translator - Translator name
   * @param duplicateProcessing - Duplicate processing results
   * @returns Formatted translation success response
   */
  protected translationSuccessResponse(
    items: any[],
    method: string,
    translator: string,
    duplicateProcessing?: any,
  ) {
    return ResponseBuilder.translationSuccess(items, method, translator, duplicateProcessing)
  }
}
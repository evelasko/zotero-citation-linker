import { serviceLogger as logger } from '../core/Logger'
import { StringUtils } from '../utils/StringUtils'
import {
  CrossRefWork,
  CrossRefApiResponse,
  DisambiguationResult,
  IService,
} from '../core/types'

/**
 * Service for interacting with CrossRef REST API
 * Handles DOI validation, metadata retrieval, and DOI disambiguation
 */
export class CrossRefService implements IService {
  private readonly baseUrl = 'https://api.crossref.org'
  private readonly userAgent = 'Zotero Citation Linker Plugin (mailto:h.superpotter@gmail.com)'
  private readonly timeout = 10000 // 10 seconds
  private initialized = false
  private cache: Map<string, CrossRefWork> = new Map()

  /**
   * Initialize the CrossRef service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing CrossRef service')
      this.initialized = true
      logger.info('CrossRef service initialized successfully')
    } catch (error) {
      logger.error(`Failed to initialize CrossRef service: ${error}`)
      throw error
    }
  }

  /**
   * Cleanup the CrossRef service
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up CrossRef service')
      this.cache.clear()
      this.initialized = false
      logger.info('CrossRef service cleanup completed')
    } catch (error) {
      logger.error(`Error during CrossRef service cleanup: ${error}`)
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Validate if a DOI exists in the CrossRef database
   * @param doi - DOI to validate
   * @returns Promise<boolean> - true if DOI exists, false otherwise
   */
  async validateDOI(doi: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        throw new Error('CrossRef service not initialized')
      }

      logger.debug(`Validating DOI: ${doi}`)

      const cleanDoi = this.cleanDOI(doi)
      if (!cleanDoi) {
        logger.debug(`Invalid DOI format: ${doi}`)
        return false
      }

      // Check cache first
      if (this.cache.has(cleanDoi)) {
        logger.debug(`DOI found in cache: ${cleanDoi}`)
        return true
      }

      const url = `${this.baseUrl}/works/${encodeURIComponent(cleanDoi)}`

      try {
        const response = await this.makeRequest(url)

        if (response && response.status === 'ok' && response.message) {
          const work = response.message as CrossRefWork
          if (work.DOI) {
            // Cache the result
            this.cache.set(cleanDoi, work)
            logger.debug(`DOI validation successful: ${cleanDoi}`)
            return true
          }
        }

        logger.debug(`DOI not found in CrossRef: ${cleanDoi}`)
        return false
      } catch (error) {
        // 404 means DOI doesn't exist in CrossRef
        if (error.toString().includes('404')) {
          logger.debug(`DOI not found (404): ${cleanDoi}`)
          return false
        }
        // Other errors (network, etc.) should be treated as validation failure
        logger.warn(`Error validating DOI ${cleanDoi}: ${error}`)
        return false
      }
    } catch (error) {
      logger.error(`Error in DOI validation: ${error}`)
      return false
    }
  }

  /**
   * Get metadata for a DOI from CrossRef
   * @param doi - DOI to get metadata for
   * @returns Promise<CrossRefWork | null> - CrossRef work metadata or null if not found
   */
  async getDOIMetadata(doi: string): Promise<CrossRefWork | null> {
    try {
      if (!this.initialized) {
        throw new Error('CrossRef service not initialized')
      }

      logger.debug(`Getting metadata for DOI: ${doi}`)

      const cleanDoi = this.cleanDOI(doi)
      if (!cleanDoi) {
        logger.debug(`Invalid DOI format: ${doi}`)
        return null
      }

      // Check cache first
      if (this.cache.has(cleanDoi)) {
        logger.debug(`DOI metadata found in cache: ${cleanDoi}`)
        return this.cache.get(cleanDoi)!
      }

      const url = `${this.baseUrl}/works/${encodeURIComponent(cleanDoi)}`

      try {
        const response = await this.makeRequest(url)

        if (response && response.status === 'ok' && response.message) {
          const work = response.message as CrossRefWork
          if (work.DOI) {
            // Cache the result
            this.cache.set(cleanDoi, work)
            logger.debug(`DOI metadata retrieved successfully: ${cleanDoi}`)
            return work
          }
        }

        logger.debug(`No metadata found for DOI: ${cleanDoi}`)
        return null
      } catch (error) {
        logger.warn(`Error getting metadata for DOI ${cleanDoi}: ${error}`)
        return null
      }
    } catch (error) {
      logger.error(`Error in DOI metadata retrieval: ${error}`)
      return null
    }
  }

  /**
   * Disambiguate multiple DOI candidates using title matching and other factors
   * @param candidateDOIs - Array of candidate DOI strings
   * @param pageTitle - Title of the web page for comparison
   * @param options - Optional configuration
   * @returns Promise<DisambiguationResult[]> - Array of disambiguation results sorted by score
   */
  async disambiguateDOIs(
    candidateDOIs: string[],
    pageTitle: string,
    options: {
      maxCandidates?: number
      titleSimilarityWeight?: number
      urlPriorityWeight?: number
      contentPositionWeight?: number
      minimumConfidenceScore?: number
    } = {},
  ): Promise<DisambiguationResult[]> {
    try {
      if (!this.initialized) {
        throw new Error('CrossRef service not initialized')
      }

      const {
        maxCandidates = 5,
        titleSimilarityWeight = 0.4,
        urlPriorityWeight = 0.4,
        contentPositionWeight = 0.2,
        minimumConfidenceScore = 30,
      } = options

      logger.info(`Disambiguating ${candidateDOIs.length} DOI candidates against page title: "${pageTitle}"`)

      const results: DisambiguationResult[] = []
      const processedDOIs = new Set<string>()

      // Process each candidate DOI
      for (const doi of candidateDOIs.slice(0, maxCandidates)) {
        const cleanDoi = this.cleanDOI(doi)
        if (!cleanDoi || processedDOIs.has(cleanDoi)) {
          continue
        }
        processedDOIs.add(cleanDoi)

        try {
          // Get CrossRef metadata
          const metadata = await this.getDOIMetadata(cleanDoi)
          const isValid = metadata !== null

          // Calculate title similarity
          let titleSimilarity = 0
          if (isValid && metadata && metadata.title && metadata.title.length > 0) {
            const crossrefTitle = metadata.title[0]
            titleSimilarity = StringUtils.calculateTitleSimilarity(pageTitle, crossrefTitle)
            logger.debug(`Title similarity for ${cleanDoi}: ${titleSimilarity}% ("${crossrefTitle}")`)
          }

          // Calculate URL priority (simplified for now - all candidates get same priority)
          const urlPriority = 70 // Medium priority for HTML-extracted DOIs

          // Calculate content position score (simplified for now)
          const contentPosition = 70 // Medium position for HTML content

          // Calculate final score
          const finalScore = Math.round(
            (titleSimilarity * titleSimilarityWeight) +
            (urlPriority * urlPriorityWeight) +
            (contentPosition * contentPositionWeight),
          )

          // Determine confidence level
          let confidence: 'high' | 'medium' | 'low'
          if (finalScore >= 80) {
            confidence = 'high'
          } else if (finalScore >= 60) {
            confidence = 'medium'
          } else {
            confidence = 'low'
          }

          results.push({
            doi: cleanDoi,
            finalScore,
            titleSimilarity,
            urlPriority,
            contentPosition,
            crossrefMetadata: metadata,
            isValid,
            confidence,
          })

          logger.debug(`DOI ${cleanDoi}: score=${finalScore}, similarity=${titleSimilarity}%, valid=${isValid}`)
        } catch (error) {
          logger.warn(`Error processing DOI candidate ${cleanDoi}: ${error}`)
          // Add invalid entry
          results.push({
            doi: cleanDoi,
            finalScore: 0,
            titleSimilarity: 0,
            urlPriority: 0,
            contentPosition: 0,
            crossrefMetadata: null,
            isValid: false,
            confidence: 'low',
          })
        }
      }

      // Sort by final score (highest first)
      results.sort((a, b) => b.finalScore - a.finalScore)

      // Filter by minimum confidence score
      const filteredResults = results.filter(result => result.finalScore >= minimumConfidenceScore)

      logger.info(`DOI disambiguation completed: ${filteredResults.length} candidates above threshold (${minimumConfidenceScore})`)

      if (filteredResults.length > 0) {
        const best = filteredResults[0]
        logger.info(`Best match: ${best.doi} (score: ${best.finalScore}, confidence: ${best.confidence})`)
      }

      return filteredResults
    } catch (error) {
      logger.error(`Error in DOI disambiguation: ${error}`)
      return []
    }
  }

  /**
   * Make an HTTP request to the CrossRef API
   * @param url - URL to request
   * @returns Promise<CrossRefApiResponse | null>
   */
  private async makeRequest(url: string): Promise<CrossRefApiResponse | null> {
    try {
      const response = await Zotero.HTTP.request('GET', url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
        timeout: this.timeout,
        followRedirects: true,
      })

      if (response.status === 200 && response.responseText) {
        const data = JSON.parse(response.responseText) as CrossRefApiResponse
        return data
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    } catch (error) {
      logger.debug(`CrossRef API request failed: ${error}`)
      throw error
    }
  }

  /**
   * Clean and normalize a DOI string
   * @param doi - Raw DOI string
   * @returns Cleaned DOI or null if invalid
   */
  private cleanDOI(doi: string): string | null {
    if (!doi || typeof doi !== 'string') {
      return null
    }

    // Remove common prefixes and clean up
    const cleaned = doi.trim()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
      .replace(/^doi:\s*/i, '')
      .replace(/^DOI:\s*/i, '')

    // Basic DOI format validation (starts with 10.)
    if (!cleaned.match(/^10\.\d+\/.+/)) {
      return null
    }

    return cleaned
  }

  /**
   * Clear the metadata cache
   */
  clearCache(): void {
    logger.debug('Clearing CrossRef metadata cache')
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}
import { utilLogger as logger } from '../core/Logger'

// Global URL constructor declaration for TypeScript
declare const URL: typeof globalThis.URL

/**
 * URL utility functions for parsing, normalization, and validation
 */
export class UrlUtils {
  // Common tracking parameters to remove during normalization
  private static readonly TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'ref', 'referer', 'referrer', 'source', 'fbclid', 'gclid',
    'msclkid', 'twclid', '_ga', 'mc_cid', 'mc_eid',
  ]

  /**
   * Normalize a URL by removing tracking parameters and standardizing format
   * @param url - URL to normalize
   * @returns Normalized URL
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)

      // Remove tracking parameters
      UrlUtils.TRACKING_PARAMS.forEach(param => {
        urlObj.searchParams.delete(param)
      })

      // Normalize domain (remove www, convert to lowercase)
      let hostname = urlObj.hostname.toLowerCase()
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4)
      }

      // Remove trailing slash from pathname
      let pathname = urlObj.pathname
      if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1)
      }

      // Reconstruct normalized URL
      const normalizedUrl = `${urlObj.protocol}//${hostname}${pathname}${urlObj.search}${urlObj.hash}`

      logger.debug(`URL normalized: ${url} -> ${normalizedUrl}`)
      return normalizedUrl
    } catch (error) {
      logger.error(`Error normalizing URL: ${error}`)
      // Return original URL if normalization fails
      return url.toLowerCase()
    }
  }

  /**
   * Extract domain from URL
   * @param url - URL to extract domain from
   * @returns Domain name or original URL if extraction fails
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch (error) {
      logger.error(`Error extracting domain from URL: ${error}`)
      return url
    }
  }

  /**
   * Check if URL is valid
   * @param url - URL to validate
   * @returns True if valid URL
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if URL scheme is supported (http or https)
   * @param url - URL to check
   * @returns True if supported scheme
   */
  static isSupportedScheme(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  /**
   * Convert relative URL to absolute URL
   * @param relativeUrl - Relative URL
   * @param baseUrl - Base URL
   * @returns Absolute URL
   */
  static toAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
    try {
      return new URL(relativeUrl, baseUrl).href
    } catch (error) {
      logger.error(`Error converting to absolute URL: ${error}`)
      return relativeUrl
    }
  }

  /**
   * Compare two URLs after normalization
   * @param url1 - First URL
   * @param url2 - Second URL
   * @returns True if URLs are equivalent after normalization
   */
  static areEquivalent(url1: string, url2: string): boolean {
    try {
      const normalized1 = UrlUtils.normalizeUrl(url1)
      const normalized2 = UrlUtils.normalizeUrl(url2)
      return normalized1 === normalized2
    } catch {
      return false
    }
  }

  /**
   * Extract query parameters from URL
   * @param url - URL to extract parameters from
   * @returns Map of query parameters
   */
  static extractQueryParams(url: string): Map<string, string> {
    const params = new Map<string, string>()
    try {
      const urlObj = new URL(url)
      urlObj.searchParams.forEach((value, key) => {
        params.set(key, value)
      })
    } catch (error) {
      logger.error(`Error extracting query parameters: ${error}`)
    }
    return params
  }

  /**
   * Build URL with query parameters
   * @param baseUrl - Base URL
   * @param params - Query parameters
   * @returns URL with query parameters
   */
  static buildUrl(baseUrl: string, params: Record<string, string | number | boolean>): string {
    try {
      const urlObj = new URL(baseUrl)
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.set(key, String(value))
        }
      })
      return urlObj.href
    } catch (error) {
      logger.error(`Error building URL: ${error}`)
      return baseUrl
    }
  }

  /**
   * Get file extension from URL path
   * @param url - URL to extract extension from
   * @returns File extension (without dot) or empty string
   */
  static getFileExtension(url: string): string {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const lastDot = pathname.lastIndexOf('.')
      if (lastDot > -1 && lastDot < pathname.length - 1) {
        return pathname.substring(lastDot + 1).toLowerCase()
      }
    } catch (error) {
      logger.error(`Error extracting file extension: ${error}`)
    }
    return ''
  }

  /**
   * Check if URL points to a PDF file
   * @param url - URL to check
   * @returns True if URL likely points to a PDF
   */
  static isPdfUrl(url: string): boolean {
    const extension = UrlUtils.getFileExtension(url)
    if (extension === 'pdf') return true

    // Check for common PDF URL patterns
    const pdfPatterns = [
      /\/pdf\//i,
      /\.pdf$/i,
      /\/download\/pdf/i,
      /\/full\.pdf/i,
    ]

    return pdfPatterns.some(pattern => pattern.test(url))
  }
}
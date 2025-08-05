import { utilLogger as logger } from '../core/Logger'
import { IDENTIFIER_PATTERNS, IDENTIFIER_SELECTORS } from '../config/constants'

// Global DOMParser declaration for environments where it's not available
/* eslint-disable no-unused-vars */
declare const DOMParser: {
  new(): {
    parseFromString(str: string, contentType: string): any
  }
}
/* eslint-enable no-unused-vars */

export interface IdentifierExtractionResult {
  identifiers: string[]
  validIdentifiers: string[]
  extractionMethods: string[]
}

/**
 * Utility for extracting identifiers from HTML content and DOM
 */
export class IdentifierExtractor {
  /**
   * Extract identifiers from URL
   * @param url - URL to extract identifiers from
   * @returns Extraction results
   */
  static async extractIdentifiersFromURL(url: string): Promise<IdentifierExtractionResult> {
    const allIdentifiers: string[] = []
    const extractionMethods: string[] = []

    try {
      logger.debug(`Extracting identifiers from URL: ${url}`)

      // Extract using URL patterns
      const urlIdentifiers = IdentifierExtractor.extractUsingURL(url)
      if (urlIdentifiers.length > 0) {
        allIdentifiers.push(...urlIdentifiers)
        extractionMethods.push('URL_patterns')
        logger.info(`Extracted ${urlIdentifiers.length} identifiers from URL`)
      }

      // Remove duplicates
      const uniqueIdentifiers = [...new Set(allIdentifiers)]

      // Verify identifiers using Zotero's translator system
      const validIdentifiers = await IdentifierExtractor.verifyIdentifiersTranslator(uniqueIdentifiers)

      logger.info(`URL identifier extraction completed: ${uniqueIdentifiers.length} total, ${validIdentifiers.length} valid`)

      return {
        identifiers: uniqueIdentifiers,
        validIdentifiers,
        extractionMethods,
      }
    } catch (error) {
      logger.error(`Error extracting identifiers from URL: ${error}`)
      return {
        identifiers: [],
        validIdentifiers: [],
        extractionMethods: [],
      }
    }
  }

  /**
   * Extract identifiers from HTML content and DOM
   * @param html - HTML content
   * @param document - DOM document (optional)
   * @returns Extraction results
   */
  static async extractIdentifiersFromHTML(
    html: string,
    document?: any,
  ): Promise<IdentifierExtractionResult> {
    const allIdentifiers: string[] = []
    const extractionMethods: string[] = []

    try {
      // Extract using HTML patterns
      const htmlIdentifiers = IdentifierExtractor.extractUsingHTML(html)
      if (htmlIdentifiers.length > 0) {
        allIdentifiers.push(...htmlIdentifiers)
        extractionMethods.push('HTML_patterns')
        logger.debug(`Extracted ${htmlIdentifiers.length} identifiers using HTML patterns`)
      }

      // Extract using DOM selectors if document is available
      if (document) {
        const domIdentifiers = IdentifierExtractor.extractUsingDOM(document)
        if (domIdentifiers.length > 0) {
          allIdentifiers.push(...domIdentifiers)
          extractionMethods.push('DOM_selectors')
          logger.debug(`Extracted ${domIdentifiers.length} identifiers using DOM selectors`)
        }
      }

      // Remove duplicates
      const uniqueIdentifiers = [...new Set(allIdentifiers)]

      // Verify identifiers using Zotero's translator system
      const validIdentifiers = await IdentifierExtractor.verifyIdentifiersTranslator(uniqueIdentifiers)

      logger.info(`Identifier extraction completed: ${uniqueIdentifiers.length} total, ${validIdentifiers.length} valid`)

      return {
        identifiers: uniqueIdentifiers,
        validIdentifiers,
        extractionMethods,
      }
    } catch (error) {
      logger.error(`Error extracting identifiers: ${error}`)
      return {
        identifiers: [],
        validIdentifiers: [],
        extractionMethods: [],
      }
    }
  }

  /**
   * Extract identifiers using HTML pattern matching
   * @param html - HTML content
   * @returns Array of extracted identifiers
   */
  private static extractUsingHTML(html: string): string[] {
    const identifiers: string[] = []

    try {
      // Extract DOI patterns
      IdentifierExtractor.extractUsingPatterns(html, IDENTIFIER_PATTERNS.DOI.patterns, identifiers)

      // Extract ISBN patterns
      IdentifierExtractor.extractUsingPatterns(html, IDENTIFIER_PATTERNS.ISBN.patterns, identifiers)

      // Extract ISSN patterns
      IdentifierExtractor.extractUsingPatterns(html, IDENTIFIER_PATTERNS.ISSN.patterns, identifiers)

      // Extract PMID patterns
      IdentifierExtractor.extractUsingPatterns(html, IDENTIFIER_PATTERNS.PMID.patterns, identifiers)

      // Extract ArXiv patterns
      IdentifierExtractor.extractUsingPatterns(html, IDENTIFIER_PATTERNS.ARXIV.patterns, identifiers)

      // Extract OCLC patterns
      IdentifierExtractor.extractUsingPatterns(html, IDENTIFIER_PATTERNS.OCLC.patterns, identifiers)

      // Extract LCCN patterns
      IdentifierExtractor.extractUsingPatterns(html, IDENTIFIER_PATTERNS.LCCN.patterns, identifiers)

      return identifiers
    } catch (error) {
      logger.error(`Error in HTML pattern extraction: ${error}`)
      return []
    }
  }

  /**
   * Extract identifiers using DOM selectors
   * @param document - DOM document
   * @returns Array of extracted identifiers
   */
  private static extractUsingDOM(document: any): string[] {
    const identifiers: string[] = []

    try {
      // Extract using DOI selectors
      IdentifierExtractor.extractUsingSelectors(document, IDENTIFIER_SELECTORS.DOI, identifiers, 'doi')

      // Extract using ISBN selectors
      IdentifierExtractor.extractUsingSelectors(document, IDENTIFIER_SELECTORS.ISBN, identifiers, 'isbn')

      // Extract using ISSN selectors
      IdentifierExtractor.extractUsingSelectors(document, IDENTIFIER_SELECTORS.ISSN, identifiers, 'issn')

      // Extract using PMID selectors
      IdentifierExtractor.extractUsingSelectors(document, IDENTIFIER_SELECTORS.PMID, identifiers, 'pmid')

      // Extract using ArXiv selectors
      IdentifierExtractor.extractUsingSelectors(document, IDENTIFIER_SELECTORS.ARXIV, identifiers, 'arxiv')

      // Extract using OCLC selectors
      IdentifierExtractor.extractUsingSelectors(document, IDENTIFIER_SELECTORS.OCLC, identifiers, 'oclc')

      // Extract using LCCN selectors
      IdentifierExtractor.extractUsingSelectors(document, IDENTIFIER_SELECTORS.LCCN, identifiers, 'lccn')

      return identifiers
    } catch (error) {
      logger.error(`Error in DOM selector extraction: ${error}`)
      return []
    }
  }

  /**
   * Extract identifiers using regex patterns
   * @param html - HTML content
   * @param patterns - Array of regex patterns
   * @param identifiers - Array to collect identifiers
   */
  private static extractUsingPatterns(html: string, patterns: RegExp[], identifiers: string[]): void {
    for (const pattern of patterns) {
      try {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0

        let match
        while ((match = pattern.exec(html)) !== null) {
          // Use capture group 1 if it exists, otherwise use the full match
          const identifier = match[1] || match[0]
          const cleanIdentifier = identifier.trim()

          if (cleanIdentifier && !identifiers.includes(cleanIdentifier)) {
            identifiers.push(cleanIdentifier)
          }
        }
      } catch (error) {
        logger.error(`Error with pattern ${pattern}: ${error}`)
      }
    }
  }

  /**
   * Extract identifiers from URL string
   * @param url - URL to extract identifiers from
   * @returns Array of extracted identifiers
   */
  private static extractUsingURL(url: string): string[] {
    const identifiers: string[] = []

    try {
      // URL patterns specifically designed for URLs (more permissive than HTML patterns)
      const urlPatterns = {
        // DOI patterns in URLs - common formats
        DOI: [
          // doi.org URLs
          /doi\.org\/(10\.\d{4,}\/[^\s?#]+)/i,
          // DOI in path segments (e.g., /doi/10.1234/example)
          /\/doi\/(10\.\d{4,}\/[^\s?#]+)/i,
          // DOI as query parameter (e.g., ?doi=10.1234/example)
          /[?&]doi=(10\.\d{4,}\/[^\s&#]+)/i,
          // Direct DOI in path (e.g., /10.1234/example)
          /\/(10\.\d{4,}\/[^\s?#]+)(?:[?#]|$)/i,
        ],
        // ArXiv patterns in URLs
        ARXIV: [
          // arxiv.org/abs/1234.5678
          /arxiv\.org\/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
          // arxiv.org/pdf/1234.5678
          /arxiv\.org\/pdf\/(\d{4}\.\d{4,5}(?:v\d+)?)/i,
        ],
        // PMID patterns in URLs
        PMID: [
          // pubmed.ncbi.nlm.nih.gov/12345678
          /pubmed\.ncbi\.nlm\.nih\.gov\/(\d{7,8})/i,
          // ncbi.nlm.nih.gov/pubmed/12345678
          /ncbi\.nlm\.nih\.gov\/pubmed\/(\d{7,8})/i,
          // PMID as query parameter
          /[?&]pmid=(\d{7,8})(?:&|$)/i,
        ],
        // PMC patterns in URLs
        PMC: [
          // pmc/articles/PMC1234567
          /pmc\/articles\/PMC(\d{6,7})/i,
          // PMC as query parameter
          /[?&]pmc=PMC(\d{6,7})(?:&|$)/i,
        ],
      }

      // Extract identifiers using URL-specific patterns
      for (const [type, patterns] of Object.entries(urlPatterns)) {
        for (const pattern of patterns) {
          const match = url.match(pattern)
          if (match && match[1]) {
            let identifier = match[1]

            // Add prefixes for PMC IDs
            if (type === 'PMC' && !identifier.startsWith('PMC')) {
              identifier = 'PMC' + identifier
            }

            if (!identifiers.includes(identifier)) {
              identifiers.push(identifier)
              logger.debug(`Found ${type} in URL: ${identifier}`)
            }
          }
        }
      }

      return identifiers
    } catch (error) {
      logger.error(`Error extracting identifiers from URL: ${error}`)
      return []
    }
  }

  /**
   * Extract identifiers using DOM selectors
   * @param document - DOM document
   * @param selectors - Array of CSS selectors
   * @param identifiers - Array to collect identifiers
   * @param type - Type of identifier for data attributes
   */
  private static extractUsingSelectors(
    document: any,
    selectors: string[],
    identifiers: string[],
    type: string,
  ): void {
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector)
        for (const element of elements) {
          let identifier: string | null = null

          // Check different element types
          if (element.tagName === 'META') {
            identifier = element.getAttribute('content')
          } else if (element.tagName === 'A' && type === 'doi' && element.href.includes('doi.org')) {
            identifier = element.href.replace(/.*doi\.org\//, '')
          } else {
            // Check data attributes
            identifier = element.getAttribute(`data-${type}`) ||
                        element.getAttribute('data-doi') ||
                        element.getAttribute('data-isbn') ||
                        element.getAttribute('data-issn') ||
                        element.getAttribute('data-pmid') ||
                        element.getAttribute('data-arxiv') ||
                        element.getAttribute('data-oclc') ||
                        element.getAttribute('data-lccn') ||
                        element.textContent?.trim()
          }

          if (identifier && !identifiers.includes(identifier)) {
            identifiers.push(identifier.trim())
          }
        }
      } catch (error) {
        logger.error(`Error with selector ${selector}: ${error}`)
      }
    }
  }

  /**
   * Verify identifiers using Zotero's translator system
   * @param identifiers - Array of identifiers to verify
   * @returns Array of valid identifiers
   */
  private static async verifyIdentifiersTranslator(identifiers: string[]): Promise<string[]> {
    if (!identifiers || identifiers.length === 0) {
      return []
    }

    logger.info(`Verifying ${identifiers.length} identifiers: ${identifiers.join(', ')}`)

    try {
      const validIdentifiers = (await Promise.all(
        identifiers.map<Promise<string | null>>(async (identifier) => {
          try {
            const search = new Zotero.Translate.Search()
            const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(identifier)
            if (extractedIdentifiers.length === 0) return null

            search.setIdentifier(extractedIdentifiers[0])
            const translators = await search.getTranslators()
            return (translators || []).length > 0 ? identifier : null
          } catch (error) {
            logger.debug(`Error verifying identifier ${identifier}: ${error}`)
            return null
          }
        }),
      )).filter((n): n is string => n !== null)

      logger.info(`Successfully verified ${validIdentifiers.length} identifiers`)
      return validIdentifiers
    } catch (error) {
      logger.error(`Error verifying identifiers: ${error}`)
      return []
    }
  }

  /**
   * Load document from URL using Zotero's browser
   * @param url - URL to load
   * @returns DOM document or null
   */
  static async loadDocument(url: string): Promise<any | null> {
    try {
      // Use Zotero's HTTP to get the HTML content
      const response = await Zotero.HTTP.request('GET', url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Zotero Citation Linker)',
        },
        timeout: 30000,
      })

      if (!response.responseText) {
        return null
      }

      // Parse HTML into a document
      const parser = new DOMParser()
      const document = parser.parseFromString(response.responseText, 'text/html')

      return document
    } catch (error) {
      logger.error(`Error loading document from ${url}: ${error}`)
      return null
    }
  }
}
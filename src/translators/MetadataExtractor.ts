import { IService, ExtractedMetadata, ExtractedIdentifiers } from '../core/types'
import { serviceLogger as logger } from '../core/Logger'
import { IdentifierExtractor } from '../utils/IdentifierExtractor'
import { IDENTIFIER_PATTERNS } from '../config/constants'

// Global DOMParser declaration
/* eslint-disable no-unused-vars */
declare const DOMParser: {
  new(): {
    parseFromString(str: string, contentType: string): any
  }
}
/* eslint-enable no-unused-vars */

/**
 * Service for extracting metadata and identifiers from web pages and documents
 * Provides comprehensive metadata extraction capabilities
 */
export class MetadataExtractor implements IService {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing MetadataExtractor service')
    this.initialized = true
    logger.info('MetadataExtractor service initialized successfully')
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up MetadataExtractor service')
    this.initialized = false
    logger.info('MetadataExtractor service cleaned up')
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Extract metadata from HTML content
   * @param html - HTML content to extract from
   * @param url - Source URL (optional)
   * @returns Extracted metadata object
   */
  async extractMetadataFromHTML(html: string, url?: string): Promise<ExtractedMetadata> {
    logger.info(`Extracting metadata from HTML content (${html.length} characters)`)

    const metadata: ExtractedMetadata = {}

    try {
      // Parse HTML into DOM
      const parser = new DOMParser()
      const document = parser.parseFromString(html, 'text/html')

      // Extract title
      metadata.title = this.extractTitle(document)

      // Extract authors
      metadata.authors = this.extractAuthors(document)

      // Extract publication date
      metadata.publicationDate = this.extractPublicationDate(document)

      // Extract journal information
      metadata.journalTitle = this.extractJournalTitle(document)
      metadata.volume = this.extractVolume(document)
      metadata.issue = this.extractIssue(document)
      metadata.pages = this.extractPages(document)

      // Extract abstract
      metadata.abstractNote = this.extractAbstract(document)

      // Extract identifiers
      const identifiers = await this.extractIdentifiers(html, document)
      if (identifiers.doi) metadata.doi = identifiers.doi[0]
      if (identifiers.isbn) metadata.isbn = identifiers.isbn[0]
      if (identifiers.issn) metadata.issn = identifiers.issn[0]

      // Set URL and access date
      if (url) {
        metadata.url = url
        metadata.accessDate = new Date().toISOString().split('T')[0]
      }

      logger.info(`Metadata extraction completed: ${Object.keys(metadata).length} fields extracted`)
      return metadata

    } catch (error) {
      logger.error(`Error extracting metadata from HTML: ${error}`)
      return metadata
    }
  }

  /**
   * Extract identifiers from HTML content and document
   * @param html - HTML content
   * @param document - DOM document (optional)
   * @returns Extracted identifiers object
   */
  async extractIdentifiers(html: string, document?: any): Promise<ExtractedIdentifiers> {
    try {
      logger.info('Extracting identifiers from HTML and DOM')

      const result = await IdentifierExtractor.extractIdentifiersFromHTML(html, document)

      // Organize identifiers by type
      const identifiers: ExtractedIdentifiers = {}

      for (const identifier of result.validIdentifiers) {
        const type = this.getIdentifierType(identifier)
        if (type) {
          if (!identifiers[type]) {
            identifiers[type] = []
          }
          identifiers[type]!.push(identifier)
        }
      }

      logger.info(`Identifier extraction completed: ${result.validIdentifiers.length} valid identifiers found`)
      return identifiers

    } catch (error) {
      logger.error(`Error extracting identifiers: ${error}`)
      return {}
    }
  }

  /**
   * Extract web translators for a URL
   * @param url - URL to analyze
   * @returns Array of available translators
   */
  async detectWebTranslators(url: string): Promise<any[]> {
    logger.info(`Detecting translators for URL: ${url}`)

    try {
      const doc = await this.loadDocument(url)
      if (!doc) {
        logger.warn('Could not load document for translator detection')
        return []
      }

      try {
        const wrappedDoc = Zotero.HTTP.wrapDocument(doc, url)
        const translation = new Zotero.Translate.Web()
        translation.setDocument(wrappedDoc)
        const translators = await translation.getTranslators().catch(() => [])

        logger.info(`Found ${translators.length} translators for this URL`)

        if (!translators || translators.length === 0) {
          logger.info('No translators found for this URL')
          return []
        }

        // Filter out specific translators if needed
        const filteredTranslators = translators.filter((translator: any) =>
          translator.translatorID !== '951c027d-74ac-47d4-a107-9c3069ab7b48', // Embedded Metadata translator
        )

        logger.info(`Filtered to ${filteredTranslators.length} translators`)
        return filteredTranslators

      } catch (error) {
        logger.error(`Failed to wrap document with Zotero.HTTP.wrapDocument: ${error}`)
        throw error
      }

    } catch (error) {
      logger.error(`Error detecting web translators: ${error}`)
      return []
    }
  }

  /**
   * Extract title from document
   */
  private extractTitle(document: any): string | undefined {
    // Try citation meta tags first
    const citationTitle = document.querySelector('meta[name="citation_title"]')?.getAttribute('content')
    if (citationTitle) return citationTitle

    const dcTitle = document.querySelector('meta[name="dc.title"]')?.getAttribute('content')
    if (dcTitle) return dcTitle

    // Try og:title
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
    if (ogTitle) return ogTitle

    // Try title tag
    const titleElement = document.querySelector('title')
    if (titleElement) return titleElement.textContent?.trim()

    // Try h1 tags
    const h1 = document.querySelector('h1')
    if (h1) return h1.textContent?.trim()

    return undefined
  }

  /**
   * Extract authors from document
   */
  private extractAuthors(document: any): string[] | undefined {
    const authors: string[] = []

    // Try citation meta tags
    const citationAuthors = document.querySelectorAll('meta[name="citation_author"]')
    citationAuthors.forEach((meta: any) => {
      const author = meta.getAttribute('content')
      if (author) authors.push(author)
    })

    // Try DC creator tags
    if (authors.length === 0) {
      const dcCreators = document.querySelectorAll('meta[name="dc.creator"]')
      dcCreators.forEach((meta: any) => {
        const author = meta.getAttribute('content')
        if (author) authors.push(author)
      })
    }

    // Try author meta tag
    if (authors.length === 0) {
      const authorMeta = document.querySelector('meta[name="author"]')
      if (authorMeta) {
        const author = authorMeta.getAttribute('content')
        if (author) authors.push(author)
      }
    }

    return authors.length > 0 ? authors : undefined
  }

  /**
   * Extract publication date from document
   */
  private extractPublicationDate(document: any): string | undefined {
    // Try citation meta tags
    const citationDate = document.querySelector('meta[name="citation_publication_date"]')?.getAttribute('content')
    if (citationDate) return citationDate

    const dcDate = document.querySelector('meta[name="dc.date"]')?.getAttribute('content')
    if (dcDate) return dcDate

    const publishedTime = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content')
    if (publishedTime) return publishedTime

    return undefined
  }

  /**
   * Extract journal title from document
   */
  private extractJournalTitle(document: any): string | undefined {
    const citationJournal = document.querySelector('meta[name="citation_journal_title"]')?.getAttribute('content')
    if (citationJournal) return citationJournal

    const dcSource = document.querySelector('meta[name="dc.source"]')?.getAttribute('content')
    if (dcSource) return dcSource

    return undefined
  }

  /**
   * Extract volume from document
   */
  private extractVolume(document: any): string | undefined {
    return document.querySelector('meta[name="citation_volume"]')?.getAttribute('content')
  }

  /**
   * Extract issue from document
   */
  private extractIssue(document: any): string | undefined {
    return document.querySelector('meta[name="citation_issue"]')?.getAttribute('content')
  }

  /**
   * Extract pages from document
   */
  private extractPages(document: any): string | undefined {
    const firstPage = document.querySelector('meta[name="citation_firstpage"]')?.getAttribute('content')
    const lastPage = document.querySelector('meta[name="citation_lastpage"]')?.getAttribute('content')

    if (firstPage && lastPage) {
      return `${firstPage}-${lastPage}`
    } else if (firstPage) {
      return firstPage
    }

    return undefined
  }

  /**
   * Extract abstract from document
   */
  private extractAbstract(document: any): string | undefined {
    // Try meta description
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content')
    if (description) return description

    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content')
    if (ogDescription) return ogDescription

    // Try abstract elements
    const abstractElement = document.querySelector('.abstract, #abstract, [class*="abstract"]')
    if (abstractElement) return abstractElement.textContent?.trim()

    return undefined
  }

  /**
   * Determine identifier type from identifier string
   */
  private getIdentifierType(identifier: string): keyof ExtractedIdentifiers | null {
    // Test against each pattern set
    for (const pattern of IDENTIFIER_PATTERNS.DOI.patterns) {
      if (pattern.test(identifier)) return 'doi'
    }
    for (const pattern of IDENTIFIER_PATTERNS.ISBN.patterns) {
      if (pattern.test(identifier)) return 'isbn'
    }
    for (const pattern of IDENTIFIER_PATTERNS.ISSN.patterns) {
      if (pattern.test(identifier)) return 'issn'
    }
    for (const pattern of IDENTIFIER_PATTERNS.PMID.patterns) {
      if (pattern.test(identifier)) return 'pmid'
    }
    for (const pattern of IDENTIFIER_PATTERNS.ARXIV.patterns) {
      if (pattern.test(identifier)) return 'arxiv'
    }
    for (const pattern of IDENTIFIER_PATTERNS.OCLC.patterns) {
      if (pattern.test(identifier)) return 'oclc'
    }
    for (const pattern of IDENTIFIER_PATTERNS.LCCN.patterns) {
      if (pattern.test(identifier)) return 'lccn'
    }

    return null
  }

  /**
   * Load document from URL
   */
  private async loadDocument(url: string): Promise<any | null> {
    return IdentifierExtractor.loadDocument(url)
  }
}
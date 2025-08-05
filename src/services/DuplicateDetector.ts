import { IService, DuplicateCandidate, DuplicateProcessingResult } from '../core/types'
import { serviceLogger as logger } from '../core/Logger'
import { DUPLICATE_DETECTION } from '../config/constants'
import { StringUtils } from '../utils/StringUtils'
import { UrlUtils } from '../utils/UrlUtils'

/**
 * Service for detecting duplicate items using multiple algorithms
 */
export class DuplicateDetector implements IService {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing DuplicateDetector service')
    this.initialized = true
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up DuplicateDetector service')
    this.initialized = false
  }

  /**
   * Detect possible duplicates for a given item
   * @param item - Item to check for duplicates
   * @returns Duplicate processing result
   */
  async detectDuplicates(item: any): Promise<DuplicateProcessingResult> {
    try {
      logger.info(`Detecting duplicates for item: ${item.key}`)

      // Extract identifiers from the item
      const identifiers = this.extractItemIdentifiers(item)

      // Find potential duplicate candidates
      const candidates = await this.findDuplicateCandidates(item, identifiers)

      // Deduplicate and rank candidates
      const uniqueCandidates = this.deduplicateCandidates(candidates)

      // Process results
      const result: DuplicateProcessingResult = {
        hasDuplicates: uniqueCandidates.length > 0,
        duplicateCount: uniqueCandidates.length,
        candidates: uniqueCandidates.slice(0, 10), // Limit to top 10
        flaggedItems: uniqueCandidates.map(c => c.key),
      }

      logger.info(`Duplicate detection completed: ${result.duplicateCount} potential duplicates found`)
      return result
    } catch (error) {
      logger.error(`Error detecting duplicates: ${error}`)
      return {
        hasDuplicates: false,
        duplicateCount: 0,
        candidates: [],
        flaggedItems: [],
      }
    }
  }

  /**
   * Extract identifiers from an item for duplicate detection
   * @param item - Zotero item
   * @returns Object with extracted identifiers
   */
  private extractItemIdentifiers(item: any): any {
    const identifiers: any = {}

    try {
      // Basic metadata
      identifiers.title = item.getField('title')
      identifiers.itemType = item.itemType
      identifiers.year = new Date(item.getField('date') || '').getFullYear() || null

      // Creators
      const creators = item.getCreators()
      if (creators && creators.length > 0) {
        const firstCreator = creators[0]
        identifiers.firstAuthor = firstCreator.lastName || firstCreator.name || ''
      }

      // Standard identifiers
      identifiers.doi = item.getField('DOI')
      identifiers.isbn = item.getField('ISBN')
      identifiers.issn = item.getField('ISSN')
      identifiers.url = item.getField('url')

      // Extract additional identifiers from extra field
      const extra = item.getField('extra') || ''
      identifiers.pmid = this.extractPMIDFromExtra(extra)
      identifiers.pmcid = this.extractPMCIDFromExtra(extra)
      identifiers.arxivId = this.extractArXivIDFromExtra(extra)

      // Normalize URL if present
      if (identifiers.url) {
        identifiers.normalizedUrl = UrlUtils.normalizeUrl(identifiers.url)
      }

      return identifiers
    } catch (error) {
      logger.error(`Error extracting identifiers: ${error}`)
      return identifiers
    }
  }

  /**
   * Find duplicate candidates using multiple search strategies
   * @param item - Original item
   * @param identifiers - Extracted identifiers
   * @returns Array of duplicate candidates
   */
  private async findDuplicateCandidates(item: any, identifiers: any): Promise<DuplicateCandidate[]> {
    const candidates: DuplicateCandidate[] = []

    try {
      // DOI matching (highest priority)
      if (identifiers.doi) {
        const doiCandidates = await this.searchByDOI(identifiers.doi, item.key)
        candidates.push(...doiCandidates)
      }

      // ISBN matching
      if (identifiers.isbn) {
        const isbnCandidates = await this.searchByISBN(identifiers.isbn, item.key)
        candidates.push(...isbnCandidates)
      }

      // Title + Author + Year fuzzy matching
      if (identifiers.title && identifiers.firstAuthor) {
        const fuzzyMatches = await this.searchByTitleAuthorYear(identifiers, item.key)
        candidates.push(...fuzzyMatches)
      }

      // PMID matching
      if (identifiers.pmid) {
        const pmidCandidates = await this.searchByExtraField('pmid', identifiers.pmid, item.key)
        candidates.push(...pmidCandidates.map(c => ({ ...c, score: 98, matchType: 'PMID' })))
      }

      // PMC ID matching
      if (identifiers.pmcid) {
        const pmcCandidates = await this.searchByExtraField('pmc', identifiers.pmcid, item.key)
        candidates.push(...pmcCandidates.map(c => ({ ...c, score: 95, matchType: 'PMC' })))
      }

      // ArXiv ID matching
      if (identifiers.arxivId) {
        const arxivCandidates = await this.searchByExtraField('arxiv', identifiers.arxivId, item.key)
        candidates.push(...arxivCandidates.map(c => ({ ...c, score: 95, matchType: 'ArXiv' })))
      }

      // URL normalization matching
      if (identifiers.normalizedUrl) {
        const urlCandidates = await this.searchByNormalizedUrl(identifiers.normalizedUrl, item.key)
        candidates.push(...urlCandidates)
      }

      return candidates
    } catch (error) {
      logger.error(`Error finding duplicate candidates: ${error}`)
      return candidates
    }
  }

  /**
   * Search for items by DOI
   * @param doi - DOI to search for
   * @param excludeKey - Item key to exclude from results
   * @returns Array of matching candidates
   */
  private async searchByDOI(doi: string, excludeKey: string): Promise<DuplicateCandidate[]> {
    try {
      const search = new Zotero.Search()
      search.addCondition('DOI', 'is', doi)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      return items
        .filter(item => item.key !== excludeKey)
        .map(item => this.createCandidate(item, 99, 'DOI match'))
    } catch (error) {
      logger.error(`Error searching by DOI: ${error}`)
      return []
    }
  }

  /**
   * Search for items by ISBN
   * @param isbn - ISBN to search for
   * @param excludeKey - Item key to exclude from results
   * @returns Array of matching candidates
   */
  private async searchByISBN(isbn: string, excludeKey: string): Promise<DuplicateCandidate[]> {
    try {
      const search = new Zotero.Search()
      search.addCondition('ISBN', 'is', isbn)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      return items
        .filter(item => item.key !== excludeKey)
        .map(item => this.createCandidate(item, 95, 'ISBN match'))
    } catch (error) {
      logger.error(`Error searching by ISBN: ${error}`)
      return []
    }
  }

  /**
   * Search by title, author, and year combination
   * @param identifiers - Item identifiers
   * @param excludeKey - Item key to exclude from results
   * @returns Array of fuzzy match candidates
   */
  private async searchByTitleAuthorYear(identifiers: any, excludeKey: string): Promise<DuplicateCandidate[]> {
    try {
      // Search by author first
      const authorItems = await this.searchByCreator(identifiers.firstAuthor)
      const candidates: DuplicateCandidate[] = []

      for (const existingItem of authorItems) {
        if (existingItem.key === excludeKey) continue

        // Calculate combined similarity
        const score = StringUtils.calculateCombinedSimilarity(
          identifiers.title,
          existingItem.getField('title'),
          identifiers.firstAuthor,
          this.getFirstAuthor(existingItem),
          identifiers.year,
          new Date(existingItem.getField('date') || '').getFullYear() || undefined,
        )

        if (score >= DUPLICATE_DETECTION.MIN_TITLE_SIMILARITY * 100) {
          candidates.push(this.createCandidate(existingItem, score, 'Fuzzy match'))
        }
      }

      return candidates
    } catch (error) {
      logger.error(`Error in fuzzy matching: ${error}`)
      return []
    }
  }

  /**
   * Search by creator name
   * @param authorName - Author name to search for
   * @returns Array of items by that author
   */
  private async searchByCreator(authorName: string): Promise<any[]> {
    try {
      const search = new Zotero.Search()
      search.addCondition('creator', 'contains', authorName)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)
      return items.slice(0, 10) // Limit for performance
    } catch (error) {
      logger.error(`Error searching by creator: ${error}`)
      return []
    }
  }

  /**
   * Search by extra field content (PMID, PMC, ArXiv)
   * @param fieldType - Type of identifier
   * @param value - Value to search for
   * @param excludeKey - Item key to exclude from results
   * @returns Array of matching items
   */
  private async searchByExtraField(fieldType: string, value: string, excludeKey: string): Promise<any[]> {
    try {
      const search = new Zotero.Search()
      search.addCondition('extra', 'contains', value)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      // Filter items that actually contain the specific identifier pattern
      return items.filter(item => {
        if (item.key === excludeKey) return false

        const extra = item.getField('extra') || ''
        switch (fieldType.toLowerCase()) {
          case 'pmid':
            return /PMID:\s*(\d+)/i.test(extra) && extra.includes(value)
          case 'pmc':
            return /PMC/i.test(extra) && extra.includes(value)
          case 'arxiv':
            return /arXiv/i.test(extra) && extra.includes(value)
          default:
            return extra.includes(value)
        }
      }).slice(0, 5) // Limit for performance
    } catch (error) {
      logger.error(`Error searching by extra field ${fieldType}: ${error}`)
      return []
    }
  }

  /**
   * Search by normalized URL
   * @param normalizedUrl - Normalized URL to search for
   * @param excludeKey - Item key to exclude from results
   * @returns Array of matching candidates
   */
  private async searchByNormalizedUrl(normalizedUrl: string, excludeKey: string): Promise<DuplicateCandidate[]> {
    try {
      const domain = UrlUtils.extractDomain(normalizedUrl)

      const search = new Zotero.Search()
      search.addCondition('url', 'contains', domain)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      const candidates: DuplicateCandidate[] = []

      for (const item of items.slice(0, 10)) {
        if (item.key === excludeKey) continue

        const itemUrl = item.getField('url')
        if (itemUrl) {
          const itemNormalizedUrl = UrlUtils.normalizeUrl(itemUrl)
          if (itemNormalizedUrl === normalizedUrl) {
            candidates.push(this.createCandidate(item, 90, 'URL match'))
          }
        }
      }

      return candidates
    } catch (error) {
      logger.error(`Error searching by normalized URL: ${error}`)
      return []
    }
  }

  /**
   * Create a duplicate candidate object
   * @param item - Zotero item
   * @param score - Similarity score
   * @param matchType - Type of match
   * @returns Duplicate candidate
   */
  private createCandidate(item: any, score: number, matchType: string): DuplicateCandidate {
    const creators = item.getCreators()
    const creatorNames = creators.map((c: any) => c.lastName || c.name || '').filter(Boolean).join(', ')

    return {
      key: item.key,
      title: item.getField('title') || 'Untitled',
      creators: creatorNames,
      year: new Date(item.getField('date') || '').getFullYear()?.toString(),
      itemType: item.itemType,
      similarity: score,
      matchType,
    }
  }

  /**
   * Remove duplicate candidates (same item found through different methods)
   * @param candidates - Array of duplicate candidates
   * @returns Deduplicated array with best match for each item
   */
  private deduplicateCandidates(candidates: DuplicateCandidate[]): DuplicateCandidate[] {
    try {
      const itemMap = new Map<string, DuplicateCandidate>()

      for (const candidate of candidates) {
        const itemKey = candidate.key

        if (!itemMap.has(itemKey)) {
          itemMap.set(itemKey, candidate)
        } else {
          // Keep the candidate with higher score
          const existing = itemMap.get(itemKey)!
          if (candidate.similarity > existing.similarity) {
            itemMap.set(itemKey, candidate)
          }
        }
      }

      // Convert back to array and sort by score (descending)
      return Array.from(itemMap.values()).sort((a, b) => b.similarity - a.similarity)
    } catch (error) {
      logger.error(`Error deduplicating candidates: ${error}`)
      return candidates
    }
  }

  /**
   * Get first author from item
   * @param item - Zotero item
   * @returns First author name or empty string
   */
  private getFirstAuthor(item: any): string {
    try {
      const creators = item.getCreators()
      if (creators && creators.length > 0) {
        const firstCreator = creators[0]
        return firstCreator.lastName || firstCreator.name || ''
      }
      return ''
    } catch {
      return ''
    }
  }

  /**
   * Extract PMID from extra field
   * @param extra - Extra field content
   * @returns PMID or null
   */
  private extractPMIDFromExtra(extra: string): string | null {
    const match = extra.match(/PMID:\s*(\d+)/i)
    return match ? match[1] : null
  }

  /**
   * Extract PMC ID from extra field
   * @param extra - Extra field content
   * @returns PMC ID or null
   */
  private extractPMCIDFromExtra(extra: string): string | null {
    const match = extra.match(/PMC(\d+)/i)
    return match ? match[1] : null
  }

  /**
   * Extract ArXiv ID from extra field
   * @param extra - Extra field content
   * @returns ArXiv ID or null
   */
  private extractArXivIDFromExtra(extra: string): string | null {
    const match = extra.match(/arXiv:\s*(\d{4}\.\d{4,5}(?:v\d+)?)/i)
    return match ? match[1] : null
  }

  /**
   * Flag a possible duplicate
   * @param newItem - New item
   * @param candidate - Duplicate candidate
   * @returns Warning data
   */
  flagPossibleDuplicate(newItem: any, candidate: DuplicateCandidate): any {
    try {
      return {
        itemKey: newItem.key,
        itemTitle: newItem.getField('title') || 'Untitled',
        duplicateKey: candidate.key,
        duplicateTitle: candidate.title,
        score: candidate.similarity,
        reason: candidate.matchType,
        confidence: candidate.similarity >= 85 ? 'high' : candidate.similarity >= 70 ? 'medium' : 'low',
        message: `Possible duplicate detected: "${candidate.title}" (${candidate.matchType})`,
      }
    } catch (error) {
      logger.error(`Error flagging duplicate: ${error}`)
      return {
        itemKey: newItem.key || 'unknown',
        duplicateKey: candidate.key,
        score: candidate.similarity,
        reason: candidate.matchType,
        error: `Error creating warning: ${error}`,
      }
    }
  }

  /**
   * Find existing item by URL
   * @param url - URL to search for
   * @returns Existing item if found, null otherwise
   */
  async findItemByUrl(url: string): Promise<any | null> {
    try {
      logger.info(`Searching for existing item with URL: ${url}`)

      // Normalize the URL for comparison
      const normalizedUrl = UrlUtils.normalizeUrl(url)
      const domain = UrlUtils.extractDomain(normalizedUrl)

      // Search for items with URLs containing the domain
      const search = new Zotero.Search()
      search.addCondition('url', 'contains', domain)
      search.addCondition('itemType', 'isNot', 'attachment')
      search.addCondition('itemType', 'isNot', 'note')

      const itemIDs = await search.search()
      const items = await Zotero.Items.getAsync(itemIDs)

      // Find exact URL match
      for (const item of items) {
        const itemUrl = item.getField('url')
        if (itemUrl) {
          const itemNormalizedUrl = UrlUtils.normalizeUrl(itemUrl)
          if (itemNormalizedUrl === normalizedUrl) {
            logger.info(`Found existing item with URL: ${url}`)
            return item
          }
        }
      }

      logger.info(`No existing item found with URL: ${url}`)
      return null
    } catch (error) {
      logger.error(`Error searching for item by URL: ${error}`)
      return null
    }
  }

  /**
   * Find existing item by identifier (DOI, PMID, ArXiv, etc.)
   * @param identifierType - Type of identifier (DOI, PMID, ARXIV)
   * @param identifierValue - Value of the identifier
   * @returns Existing item if found, null otherwise
   */
  async findItemByIdentifier(identifierType: string, identifierValue: string): Promise<any | null> {
    try {
      logger.info(`Searching for existing item with ${identifierType}: ${identifierValue}`)

      let items: any[] = []

      switch (identifierType.toUpperCase()) {
        case 'DOI': {
          const search = new Zotero.Search()
          search.addCondition('DOI', 'is', identifierValue)
          search.addCondition('itemType', 'isNot', 'attachment')
          search.addCondition('itemType', 'isNot', 'note')

          const itemIDs = await search.search()
          items = await Zotero.Items.getAsync(itemIDs)
          break
        }

        case 'PMID': {
          // Search in extra field for PMID
          const search = new Zotero.Search()
          search.addCondition('extra', 'contains', `PMID: ${identifierValue}`)
          search.addCondition('itemType', 'isNot', 'attachment')
          search.addCondition('itemType', 'isNot', 'note')

          const itemIDs = await search.search()
          const potentialItems = await Zotero.Items.getAsync(itemIDs)

          // Filter to ensure exact PMID match
          items = potentialItems.filter(item => {
            const extra = item.getField('extra') || ''
            const match = extra.match(/PMID:\s*(\d+)/i)
            return match && match[1] === identifierValue
          })
          break
        }

        case 'ARXIV': {
          // Search in extra field for ArXiv ID
          const search = new Zotero.Search()
          search.addCondition('extra', 'contains', identifierValue)
          search.addCondition('itemType', 'isNot', 'attachment')
          search.addCondition('itemType', 'isNot', 'note')

          const itemIDs = await search.search()
          const potentialItems = await Zotero.Items.getAsync(itemIDs)

          // Filter to ensure exact ArXiv match
          items = potentialItems.filter(item => {
            const extra = item.getField('extra') || ''
            return /arXiv/i.test(extra) && extra.includes(identifierValue)
          })
          break
        }

        default:
          logger.warn(`Unknown identifier type: ${identifierType}`)
          return null
      }

      if (items.length > 0) {
        logger.info(`Found ${items.length} existing item(s) with ${identifierType}: ${identifierValue}`)
        // Return the first matching item
        return items[0]
      }

      logger.info(`No existing item found with ${identifierType}: ${identifierValue}`)
      return null
    } catch (error) {
      logger.error(`Error searching for item by identifier: ${error}`)
      return null
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}
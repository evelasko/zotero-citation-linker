import { serviceLogger as logger } from '../core/Logger'
import { IService } from '../core/types'
import { systemPromptIdentifierExtraction, userPromptIdentifierExtraction, systemPromptCitationDataExtraction, userPromptCitationDataExtraction } from '../utils/Prompts'

/**
 * Service for interacting with Perplexity AI API
 * Handles AI-powered identifier extraction and citation data generation
 */
export class PerplexityService implements IService {
  private readonly baseUrl = 'https://api.perplexity.ai'
  private readonly timeout = 60000 // 60 seconds for AI processing
  private readonly identifierModel = 'sonar' // Cheaper model for identifier extraction
  private readonly citationModel = 'sonar-pro' // Premium model for citation data extraction
  private initialized = false
  private apiKey: string | null = null

  /**
   * Initialize the Perplexity service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Perplexity service...')

      // Ensure the preference exists (create it with empty default if it doesn't)
      const prefKey = 'perplexityApiKey'
      this.ensurePreferenceExists(prefKey, '')

      logger.debug(`Fetching preference: ${prefKey}`)

      this.apiKey = Zotero.Prefs.get(prefKey) as string
      logger.debug(`Retrieved API key: ${this.apiKey ? '[SET - ' + this.apiKey.length + ' chars]' : '[NOT SET]'}`)

      if (!this.apiKey || this.apiKey.trim() === '') {
        logger.warn('Perplexity API key not configured - AI translation will be disabled')
        logger.info('To set API key: Edit → Preferences → Advanced → Config Editor → Search "extensions.zotero.perplexityApiKey"')
        logger.info('Or use: Zotero.ZoteroCitationLinker.services.perplexityService.setApiKey("your-api-key")')
        this.initialized = false
        return
      }

      // Validate API key format (should start with 'pplx-')
      if (!this.apiKey.startsWith('pplx-')) {
        logger.warn(`API key format appears invalid (should start with 'pplx-'): ${this.apiKey.substring(0, 10)}...`)
      }

      this.initialized = true
      logger.info('Perplexity service initialized successfully with API key')
    } catch (error) {
      logger.error(`Failed to initialize Perplexity service: ${error}`)
      this.initialized = false
      throw error
    }
  }

  /**
   * Cleanup the Perplexity service
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up Perplexity service')
      this.apiKey = null
      this.initialized = false
      logger.info('Perplexity service cleanup completed')
    } catch (error) {
      logger.error(`Error during Perplexity service cleanup: ${error}`)
    }
  }

  /**
   * Check if the service is initialized and has a valid API key
   * Also re-initializes if API key has changed since last check
   */
  isInitialized(): boolean {
    try {
      // Get the current API key from preferences using the helper method
      const currentApiKey = this.getApiKeyFromPreferences()
      logger.debug(`Current API key from preferences: ${currentApiKey ? '[SET - ' + currentApiKey.length + ' chars]' : '[NOT SET]'}`)

      if (currentApiKey !== this.apiKey) {
        logger.info('Perplexity API key has changed, re-initializing service...')
        // Re-initialize synchronously (this is safe since it's just setting variables)
        this.reinitializeSyncWithKey(currentApiKey)
      }

      const isValid = this.initialized && this.apiKey !== null && this.apiKey.trim() !== ''
      logger.debug(`PerplexityService.isInitialized(): ${isValid} (initialized: ${this.initialized}, hasApiKey: ${!!this.apiKey})`)

      return isValid
    } catch (error) {
      logger.error(`Error checking Perplexity service initialization: ${error}`)
      return false
    }
  }


  /**
   * Synchronously re-initialize the service with a specific API key
   */
  private reinitializeSyncWithKey(apiKey: string | null): void {
    try {
      this.apiKey = apiKey

      if (!this.apiKey || this.apiKey.trim() === '') {
        logger.warn('Perplexity API key removed - AI translation disabled')
        this.initialized = false
        this.apiKey = null
      } else {
        logger.info(`Perplexity API key updated: [${this.apiKey.length} chars]`)
        this.initialized = true

        // Validate API key format
        if (!this.apiKey.startsWith('pplx-')) {
          logger.warn(`New API key format appears invalid (should start with 'pplx-'): ${this.apiKey.substring(0, 10)}...`)
        }
      }
    } catch (error) {
      logger.error(`Error during synchronous re-initialization: ${error}`)
      this.initialized = false
      this.apiKey = null
    }
  }

  /**
   * Ensure a preference exists with a default value
   * @param key - Preference key
   * @param defaultValue - Default value to set if preference doesn't exist
   */
  private ensurePreferenceExists(key: string, defaultValue: any): void {
    try {
      // Try to get the preference - if it throws or returns undefined, create it
      const currentValue = Zotero.Prefs.get(key)
      if (currentValue === undefined || currentValue === null) {
        logger.debug(`Creating preference ${key} with default value`)
        Zotero.Prefs.set(key, defaultValue)
      } else {
        logger.debug(`Preference ${key} already exists`)
      }
    } catch (error) {
      // Preference doesn't exist, create it
      logger.debug(`Preference ${key} doesn't exist, creating with default value: ${error}`)
      try {
        Zotero.Prefs.set(key, defaultValue)
        logger.debug(`Successfully created preference ${key}`)
      } catch (setError) {
        logger.error(`Failed to create preference ${key}: ${setError}`)
      }
    }
  }

  /**
   * Set the Perplexity API key programmatically
   * @param apiKey - The API key to set
   */
  public setApiKey(apiKey: string): void {
    try {
      const prefKey = 'perplexityApiKey'
      this.ensurePreferenceExists(prefKey, '')
      Zotero.Prefs.set(prefKey, apiKey)
      logger.info(`API key set programmatically: [${apiKey.length} chars]`)

      // Re-initialize the service
      this.reinitializeSyncWithKey(apiKey)
      logger.info('Service re-initialized with new API key')
    } catch (error) {
      logger.error(`Failed to set API key: ${error}`)
      throw error
    }
  }

  /**
   * Get API key from preferences, trying multiple possible key names
   */
  private getApiKeyFromPreferences(): string | null {
    const possibleKeys = [
      'perplexityApiKey',
    ]

    logger.debug(`Checking ${possibleKeys.length} possible preference keys for Perplexity API key`)

    for (const key of possibleKeys) {
      try {
        logger.debug(`Trying preference key: ${key}`)

        // Ensure the preference exists (but only for the primary key)
        if (key === 'perplexityApiKey') {
          this.ensurePreferenceExists(key, '')
        }

        const value = Zotero.Prefs.get(key) as string
        logger.debug(`  Result: ${value ? '[SET - ' + value.length + ' chars]' : '[NOT SET]'}`)

        if (value && value.trim() !== '') {
          logger.info(`Found API key in preference: ${key}`)
          return value
        }
      } catch (error) {
        // Ignore errors for non-existent keys
        logger.debug(`  Error accessing key ${key}: ${error}`)
      }
    }

    logger.warn('No Perplexity API key found in any expected preference location')
    logger.info('To set API key: Edit → Preferences → Advanced → Config Editor → Search "extensions.zotero-citation-linker.perplexityApiKey"')
    return null
  }

  /**
   * Extract identifiers using AI for a given URL/title
   * @param url - URL to analyze
   * @param title - Optional page title
   * @returns Promise<string[]> - Array of extracted identifiers
   */
  async extractIdentifiers(url: string, title?: string): Promise<string[]> {
    try {
      logger.info(`Starting AI identifier extraction for URL: ${url}`)
      logger.debug(`Title provided: ${title ? `"${title}"` : 'none'}`)

      if (!this.isInitialized()) {
        const currentApiKey = Zotero.Prefs.get('perplexityApiKey') as string
        logger.error(`Perplexity service not initialized! Current state: initialized=${this.initialized}, apiKey=${currentApiKey ? '[SET]' : '[NOT SET]'}`)
        throw new Error('Perplexity service not initialized or API key not configured')
      }

      logger.info(`AI identifier extraction for URL: ${url} using model: ${this.identifierModel}`)

      const systemPrompt = systemPromptIdentifierExtraction
      const userPrompt = userPromptIdentifierExtraction(title, url)

      logger.debug(`System prompt length: ${systemPrompt.length} chars`)
      logger.debug(`User prompt length: ${userPrompt.length} chars`)

      const response = await this.makeChatRequest(systemPrompt, userPrompt, this.identifierModel)

      if (response && response.choices && response.choices.length > 0) {
        const content = response.choices[0].message?.content
        if (content) {
          try {
            const parsed = JSON.parse(content)
            if (parsed.identifiers && Array.isArray(parsed.identifiers)) {
              logger.info(`AI extracted ${parsed.identifiers.length} identifiers`)
              return parsed.identifiers.filter((id: any) => typeof id === 'string' && id.length > 0)
            }
          } catch (parseError) {
            logger.error(`Failed to parse AI identifier response: ${parseError}`)
            // Try to extract identifiers from text if JSON parsing fails
            return this.extractIdentifiersFromText(content)
          }
        }
      }

      logger.info('No identifiers extracted by AI')
      return []
    } catch (error) {
      logger.error(`AI identifier extraction failed: ${error}`)
      throw error
    }
  }

  /**
   * Extract citation data using AI for a given URL/title
   * @param url - URL to analyze
   * @param title - Optional page title
   * @returns Promise<any> - Citation data object
   */
  async extractCitationData(url: string, title?: string): Promise<any> {
    try {
      if (!this.isInitialized()) {
        throw new Error('Perplexity service not initialized or API key not configured')
      }

      logger.info(`AI citation data extraction for URL: ${url}`)

      const systemPrompt = systemPromptCitationDataExtraction
      const userPrompt = userPromptCitationDataExtraction(title, url)

      const response = await this.makeChatRequest(systemPrompt, userPrompt, this.citationModel)

      if (response && response.choices && response.choices.length > 0) {
        const content = response.choices[0].message?.content
        if (content) {
          try {
            const parsed = JSON.parse(content)
            if (parsed && typeof parsed === 'object') {
              logger.info(`AI extracted citation data for type: ${parsed.type}`)
              return this.validateAndCleanCitationData(parsed)
            }
          } catch (parseError) {
            logger.error(`Failed to parse AI citation response: ${parseError}`)
            throw new Error(`AI returned invalid JSON: ${parseError}`)
          }
        }
      }

      throw new Error('AI did not return valid citation data')
    } catch (error) {
      logger.error(`AI citation data extraction failed: ${error}`)
      throw error
    }
  }

  /**
   * Make a chat completion request to Perplexity API
   * @param systemPrompt - System prompt
   * @param userPrompt - User prompt
   * @param model - Model to use for the request
   * @returns Promise<any> - API response
   */
  private async makeChatRequest(systemPrompt: string, userPrompt: string, model: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/chat/completions`

      const payload = {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 2000, // Sufficient for citation data
      }

      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }

      logger.info(`Making Perplexity API request to: ${url}`)
      logger.debug(`Using model: ${model}`)
      logger.debug(`API key present: ${!!this.apiKey}`)
      logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`)

      const response = await Zotero.HTTP.request('POST', url, {
        headers,
        body: JSON.stringify(payload),
        timeout: this.timeout,
        responseType: 'json',
      })

      logger.info(`Perplexity API response status: ${response.status}`)

      if (response.status !== 200) {
        logger.error(`Perplexity API error response: ${response.responseText}`)
        throw new Error(`Perplexity API returned status ${response.status}: ${response.responseText}`)
      }

      logger.debug(`Response received: ${JSON.stringify(response.response, null, 2)}`)
      return response.response
    } catch (error) {
      logger.error(`Perplexity API request failed: ${error}`)
      logger.error(`Error details: ${JSON.stringify(error, null, 2)}`)
      throw error
    }
  }

  /**
   * Extract identifiers from text when JSON parsing fails
   * @param text - Text to search for identifiers
   * @returns string[] - Array of found identifiers
   */
  private extractIdentifiersFromText(text: string): string[] {
    const identifiers: string[] = []

    // DOI pattern
    const doiMatches = text.match(/10\.\d{4,}\/[^\s"<>]+/g)
    if (doiMatches) {
      identifiers.push(...doiMatches)
    }

    // ArXiv pattern
    const arxivMatches = text.match(/\d{4}\.\d{4,}/g)
    if (arxivMatches) {
      identifiers.push(...arxivMatches)
    }

    // ISBN pattern
    const isbnMatches = text.match(/\b\d{9}[\dX]\b|\b\d{13}\b/g)
    if (isbnMatches) {
      identifiers.push(...isbnMatches)
    }

    // PMID pattern
    const pmidMatches = text.match(/\b\d{8}\b/g)
    if (pmidMatches) {
      identifiers.push(...pmidMatches)
    }

    return identifiers
  }

  /**
   * Validate and clean citation data from AI response
   * @param data - Raw citation data from AI
   * @returns any - Cleaned and validated citation data
   */
  private validateAndCleanCitationData(data: any): any {
    // Valid Zotero item types
    const validTypes = [
      'annotation', 'artwork', 'attachment', 'audioRecording', 'bill', 'blogPost', 'book', 'bookSection',
      'case', 'computerProgram', 'conferencePaper', 'dataset', 'dictionaryEntry', 'document', 'email',
      'encyclopediaArticle', 'film', 'forumPost', 'hearing', 'instantMessage', 'interview', 'journalArticle',
      'letter', 'magazineArticle', 'manuscript', 'map', 'newspaperArticle', 'note', 'patent', 'podcast',
      'preprint', 'presentation', 'radioBroadcast', 'report', 'standard', 'statute', 'thesis', 'tvBroadcast',
      'videoRecording', 'webpage',
    ]

    // Validate item type
    if (!data.type || !validTypes.includes(data.type)) {
      logger.warn(`Invalid or missing item type: ${data.type}, defaulting to 'webpage'`)
      data.type = 'webpage'
    }

    // Ensure required fields exist
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new Error('Citation data missing required title field')
    }

    // Clean and validate authors array
    if (data.authors && Array.isArray(data.authors)) {
      data.authors = data.authors.filter((author: any) =>
        author && typeof author === 'object' && author.name && typeof author.name === 'string',
      )
    }

    // Validate date format (should be YYYY-MM-DD or YYYY)
    if (data.date && typeof data.date === 'string') {
      if (!/^\d{4}(-\d{2}-\d{2})?$/.test(data.date)) {
        logger.warn(`Invalid date format: ${data.date}, removing date`)
        data.date = null
      }
    }

    return data
  }
}
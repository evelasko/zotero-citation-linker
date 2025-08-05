import { utilLogger as logger } from '../core/Logger'
import { DUPLICATE_DETECTION } from '../config/constants'

/**
 * String utility functions for text processing and similarity calculations
 */
export class StringUtils {
  /**
   * Calculate title similarity between two strings
   * @param title1 - First title
   * @param title2 - Second title
   * @returns Similarity score (0-100)
   */
  static calculateTitleSimilarity(title1: string, title2: string): number {
    try {
      if (!title1 || !title2) {
        return 0
      }

      // Normalize titles for comparison
      const normalized1 = StringUtils.normalizeTitle(title1)
      const normalized2 = StringUtils.normalizeTitle(title2)

      // Exact match
      if (normalized1 === normalized2) {
        return 95
      }

      // Calculate similarity using Levenshtein distance
      const similarity = StringUtils.calculateLevenshteinSimilarity(normalized1, normalized2)

      // Convert to score
      if (similarity >= 0.95) {
        return 90
      } else if (similarity >= 0.90) {
        return 85
      } else if (similarity >= 0.80) {
        return 75
      } else if (similarity >= 0.70) {
        return 65
      } else {
        return Math.round(similarity * 60) // Max 60 for lower similarities
      }
    } catch (error) {
      logger.error(`Error calculating title similarity: ${error}`)
      return 0
    }
  }

  /**
   * Normalize title for comparison
   * @param title - Title to normalize
   * @returns Normalized title
   */
  static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()
  }

  /**
   * Calculate Levenshtein similarity between two strings
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity ratio (0-1)
   */
  static calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) {
      return 1.0
    }

    const editDistance = StringUtils.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   */
  static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1,     // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Calculate author name similarity
   * @param author1 - First author name
   * @param author2 - Second author name
   * @returns Similarity score (0-100)
   */
  static calculateAuthorSimilarity(author1: string, author2: string): number {
    try {
      const normalized1 = author1.toLowerCase().trim()
      const normalized2 = author2.toLowerCase().trim()

      if (normalized1 === normalized2) {
        return 100
      }

      // Check for last name only match
      const lastNameRegex = /^[a-z]+$/
      if (lastNameRegex.test(normalized1) || lastNameRegex.test(normalized2)) {
        // One or both are last names only
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
          return 85 // Good match for last name
        }
      }

      // Use Levenshtein for fuzzy matching
      const similarity = StringUtils.calculateLevenshteinSimilarity(normalized1, normalized2)
      return Math.round(similarity * 100)
    } catch (error) {
      logger.error(`Error calculating author similarity: ${error}`)
      return 0
    }
  }

  /**
   * Calculate combined similarity score for multiple fields
   * @param title1 - First title
   * @param title2 - Second title
   * @param author1 - First author (optional)
   * @param author2 - Second author (optional)
   * @param year1 - First year (optional)
   * @param year2 - Second year (optional)
   * @returns Combined similarity score (0-100)
   */
  static calculateCombinedSimilarity(
    title1: string,
    title2: string,
    author1?: string,
    author2?: string,
    year1?: number,
    year2?: number,
  ): number {
    try {
      let totalScore = 0
      let weightedFactors = 0

      // Title similarity (weight from constants)
      if (title1 && title2) {
        const titleScore = StringUtils.calculateTitleSimilarity(title1, title2)
        totalScore += titleScore * DUPLICATE_DETECTION.TITLE_WEIGHT
        weightedFactors += DUPLICATE_DETECTION.TITLE_WEIGHT
      }

      // Author similarity (weight from constants)
      if (author1 && author2) {
        const authorScore = StringUtils.calculateAuthorSimilarity(author1, author2)
        totalScore += authorScore * DUPLICATE_DETECTION.AUTHOR_WEIGHT
        weightedFactors += DUPLICATE_DETECTION.AUTHOR_WEIGHT
      }

      // Year similarity (weight from constants)
      if (year1 && year2) {
        let yearScore = 0
        if (year1 === year2) {
          yearScore = 100 // Exact year match
        } else if (Math.abs(year1 - year2) <= 1) {
          yearScore = 80 // Close year match
        } else if (Math.abs(year1 - year2) <= 2) {
          yearScore = 60 // Somewhat close
        }

        if (yearScore > 0) {
          totalScore += yearScore * DUPLICATE_DETECTION.YEAR_WEIGHT
          weightedFactors += DUPLICATE_DETECTION.YEAR_WEIGHT
        }
      }

      // Calculate final weighted score
      const finalScore = weightedFactors > 0 ? Math.round(totalScore / weightedFactors) : 0

      logger.debug(`Combined similarity: ${finalScore} (title: ${title1?.substring(0, 30)}...)`)
      return finalScore
    } catch (error) {
      logger.error(`Error calculating combined similarity: ${error}`)
      return 0
    }
  }

  /**
   * Check if a string matches any pattern in a list
   * @param str - String to check
   * @param patterns - Array of regex patterns
   * @returns True if any pattern matches
   */
  static matchesAnyPattern(str: string, patterns: RegExp[]): boolean {
    if (!str) return false
    return patterns.some(pattern => pattern.test(str))
  }

  /**
   * Truncate string to specified length with ellipsis
   * @param str - String to truncate
   * @param maxLength - Maximum length
   * @returns Truncated string
   */
  static truncate(str: string, maxLength: number): string {
    if (!str || str.length <= maxLength) return str
    return str.substring(0, maxLength - 3) + '...'
  }

  /**
   * Clean and normalize whitespace in a string
   * @param str - String to clean
   * @returns Cleaned string
   */
  static cleanWhitespace(str: string): string {
    if (!str) return ''
    return str.replace(/\s+/g, ' ').trim()
  }
}
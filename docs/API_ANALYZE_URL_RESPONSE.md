# AnalyzeUrl Endpoint Response Documentation

## Overview

The `/analyze-url` endpoint performs comprehensive URL analysis to determine the best method for importing bibliographic data into Zotero. It follows a multi-step waterfall approach, stopping early when a reliable processing method is found.

## Endpoint Details

- **Path**: `/zotero-citation-linker/analyze-url`
- **Method**: POST
- **Content-Type**: application/json

## Request Format

```json
{
  "url": "https://example.com/article"
}
```

## Response Structure

The endpoint returns a JSON object with the following fields:

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Overall operation status: `"success"`, `"partial_success"`, or `"error"` |
| `timestamp` | `string` | ISO 8601 timestamp of the analysis |
| `processingRecommendation` | `string \| null` | Recommended processing method (see Processing Recommendations below) |
| `errors` | `string[]` | Array of error messages encountered during analysis (empty if no errors) |

### Item Discovery Fields

| Field | Type | Description |
|-------|------|-------------|
| `itemKey` | `string \| null` | Zotero item key if URL already exists in library, `null` otherwise |

### URL Accessibility Fields

| Field | Type | Description |
|-------|------|-------------|
| `urlAccessible` | `boolean` | Whether the URL is reachable (HTTP 200 response) |
| `httpStatusCode` | `number \| null` | HTTP status code from URL request, `null` if request failed |
| `contentType` | `string` | Detected content type: `"html"`, `"pdf"`, or `"unknown"` |

### Identifier Extraction Fields

| Field | Type | Description |
|-------|------|-------------|
| `identifiers` | `string[]` | All identifiers found (including invalid ones) |
| `validIdentifiers` | `string[]` | Validated identifiers (DOI, ISBN, PMID, arXiv, etc.) |

### DOI Disambiguation Fields

When multiple DOIs are found, the endpoint uses CrossRef API to determine the most relevant one:

| Field | Type | Description |
|-------|------|-------------|
| `primaryDOI` | `string \| undefined` | The best matching DOI based on title similarity |
| `primaryDOIScore` | `number \| undefined` | Confidence score (0-1) for the primary DOI |
| `primaryDOIConfidence` | `string \| undefined` | Confidence level: `"high"`, `"medium"`, or `"low"` |
| `alternativeDOIs` | `Array \| undefined` | Top 2 alternative DOI candidates with scores |
| `disambiguationUsed` | `boolean` | Whether DOI disambiguation was performed |

The `alternativeDOIs` array contains objects with:

```typescript
{
  doi: string,
  score: number,
  confidence: string
}
```

### Web Translator Fields

| Field | Type | Description |
|-------|------|-------------|
| `webTranslators` | `Array` | Available Zotero web translators for this URL (empty if none found) |

Each translator object contains:

```typescript
{
  translatorID: string,
  label: string,
  creator: string,
  priority: number
}
```

### AI Translation Fields

| Field | Type | Description |
|-------|------|-------------|
| `aiTranslation` | `boolean` | Whether AI-powered extraction was used or is available |

## Processing Recommendations

The `processingRecommendation` field indicates the recommended next action:

| Value | Meaning | Next Steps |
|-------|---------|------------|
| `"already-stored"` | Item with same URL exists in library | Return existing item, no import needed |
| `"extractable"` | Valid identifiers found in URL/content | Use `/add-from-identifier` endpoint with identifiers |
| `"translatable"` | Web translator available | Use `/add-from-url` endpoint (web translation) |
| `"ai-resolvable"` | No identifiers/translators, but URL accessible | Use AI extraction via Perplexity service |
| `"unreachable"` | URL not accessible (HTTP error) | Cannot process, inform user |
| `"errored"` | Analysis failed or no viable options | Cannot process, check `errors` array |

## Analysis Workflow

The endpoint follows a multi-step waterfall approach:

```diagram
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Check for Existing Items                           │
│ ✓ Found → Return "already-stored"                          │
└─────────────────────────────────────────────────────────────┘
                          ↓ Not found
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Extract Identifiers from URL                       │
│ ✓ Found → Return "extractable"                             │
└─────────────────────────────────────────────────────────────┘
                          ↓ Not found
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Check URL Accessibility & Content Type             │
│ ✗ Unreachable → Return "unreachable"                       │
└─────────────────────────────────────────────────────────────┘
                          ↓ Accessible
┌─────────────────────────────────────────────────────────────┐
│ Step 3.1: Extract from PDF Content (if PDF)                │
│ ✓ Found → Return "extractable"                             │
│ ✗ Not found → Continue to AI processing                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3.2: Extract from HTML Content (if HTML)              │
│ ✓ Found → Return "extractable"                             │
│   ├─ Multiple DOIs? → Run disambiguation                   │
│   └─ Return best match as primaryDOI                       │
└─────────────────────────────────────────────────────────────┘
                          ↓ Not found
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Detect Web Translators                             │
│ ✓ Found → Return "translatable"                            │
└─────────────────────────────────────────────────────────────┘
                          ↓ Not found
┌─────────────────────────────────────────────────────────────┐
│ Step 5: AI Identifier Extraction (Perplexity)              │
│ ✓ Found → Return "extractable" with aiTranslation=true     │
│ ✗ Not found → Return "ai-resolvable" if accessible         │
└─────────────────────────────────────────────────────────────┘
```

## Response Examples

### Example 1: Existing Item Found

```json
{
  "itemKey": "ABC123XYZ",
  "identifiers": [],
  "validIdentifiers": [],
  "webTranslators": [],
  "status": "success",
  "processingRecommendation": "already-stored",
  "urlAccessible": false,
  "contentType": "unknown",
  "httpStatusCode": null,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [],
  "disambiguationUsed": false,
  "aiTranslation": false
}
```

### Example 2: DOI Found in URL

```json
{
  "itemKey": null,
  "identifiers": ["10.1038/s41586-023-12345-6"],
  "validIdentifiers": ["10.1038/s41586-023-12345-6"],
  "webTranslators": [],
  "status": "success",
  "processingRecommendation": "extractable",
  "urlAccessible": false,
  "contentType": "unknown",
  "httpStatusCode": null,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [],
  "disambiguationUsed": false,
  "aiTranslation": false
}
```

### Example 3: Multiple DOIs with Disambiguation

```json
{
  "itemKey": null,
  "identifiers": ["10.1038/s41586-023-12345-6", "10.1126/science.abc1234"],
  "validIdentifiers": ["10.1038/s41586-023-12345-6", "10.1126/science.abc1234"],
  "webTranslators": [],
  "status": "success",
  "processingRecommendation": "extractable",
  "urlAccessible": true,
  "contentType": "html",
  "httpStatusCode": 200,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [],
  "primaryDOI": "10.1038/s41586-023-12345-6",
  "primaryDOIScore": 0.94,
  "primaryDOIConfidence": "high",
  "alternativeDOIs": [
    {
      "doi": "10.1126/science.abc1234",
      "score": 0.67,
      "confidence": "medium"
    }
  ],
  "disambiguationUsed": true,
  "aiTranslation": false
}
```

### Example 4: Web Translator Available

```json
{
  "itemKey": null,
  "identifiers": [],
  "validIdentifiers": [],
  "webTranslators": [
    {
      "translatorID": "951c027d-74ac-47d4-a107-9c3069ab7b48",
      "label": "arXiv.org",
      "creator": "Sean Takats",
      "priority": 100
    }
  ],
  "status": "success",
  "processingRecommendation": "translatable",
  "urlAccessible": true,
  "contentType": "html",
  "httpStatusCode": 200,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [],
  "disambiguationUsed": false,
  "aiTranslation": false
}
```

### Example 5: AI Extraction Success

```json
{
  "itemKey": null,
  "identifiers": [],
  "validIdentifiers": ["10.1234/example.doi"],
  "webTranslators": [],
  "status": "success",
  "processingRecommendation": "extractable",
  "urlAccessible": true,
  "contentType": "html",
  "httpStatusCode": 200,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [],
  "primaryDOI": "10.1234/example.doi",
  "primaryDOIScore": 0.95,
  "primaryDOIConfidence": "high",
  "disambiguationUsed": false,
  "aiTranslation": true
}
```

### Example 6: AI Resolvable (No Identifiers Found)

```json
{
  "itemKey": null,
  "identifiers": [],
  "validIdentifiers": [],
  "webTranslators": [],
  "status": "success",
  "processingRecommendation": "ai-resolvable",
  "urlAccessible": true,
  "contentType": "html",
  "httpStatusCode": 200,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [],
  "disambiguationUsed": false,
  "aiTranslation": true
}
```

### Example 7: URL Unreachable

```json
{
  "itemKey": null,
  "identifiers": [],
  "validIdentifiers": [],
  "webTranslators": [],
  "status": "success",
  "processingRecommendation": "unreachable",
  "urlAccessible": false,
  "contentType": "unknown",
  "httpStatusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [],
  "disambiguationUsed": false,
  "aiTranslation": false
}
```

### Example 8: Partial Success with Errors

```json
{
  "itemKey": null,
  "identifiers": [],
  "validIdentifiers": ["10.1234/example.doi"],
  "webTranslators": [],
  "status": "partial_success",
  "processingRecommendation": "extractable",
  "urlAccessible": true,
  "contentType": "html",
  "httpStatusCode": 200,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [
    "PDF processing failed: Timeout",
    "DOI disambiguation failed: Rate limit exceeded"
  ],
  "disambiguationUsed": false,
  "aiTranslation": false
}
```

### Example 9: Complete Failure

```json
{
  "itemKey": null,
  "identifiers": [],
  "validIdentifiers": [],
  "webTranslators": [],
  "status": "error",
  "processingRecommendation": "errored",
  "urlAccessible": false,
  "contentType": "unknown",
  "httpStatusCode": 0,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "errors": [
    "URL accessibility check failed: Network error",
    "Analysis failed: Connection refused"
  ],
  "disambiguationUsed": false,
  "aiTranslation": false
}
```

## Client Integration Guide

### Basic Usage Flow

```typescript
// 1. Analyze the URL
const analyzeResponse = await fetch('http://localhost:23119/zotero-citation-linker/analyze-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: userUrl })
})

const analysis = await analyzeResponse.json()

// 2. Handle based on recommendation
switch (analysis.processingRecommendation) {
  case 'already-stored':
    // Item exists, open in Zotero or notify user
    console.log(`Item already in library: ${analysis.itemKey}`)
    break
    
  case 'extractable':
    // Use identifier-based import
    const identifier = analysis.primaryDOI || analysis.validIdentifiers[0]
    await fetch('http://localhost:23119/zotero-citation-linker/add-from-identifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    })
    break
    
  case 'translatable':
    // Use web translator
    await fetch('http://localhost:23119/zotero-citation-linker/add-from-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: userUrl })
    })
    break
    
  case 'ai-resolvable':
    // Use AI extraction (requires Perplexity API key)
    await fetch('http://localhost:23119/zotero-citation-linker/add-from-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: userUrl })
    })
    break
    
  case 'unreachable':
    console.error('URL is not accessible')
    break
    
  case 'errored':
    console.error('Analysis failed:', analysis.errors)
    break
}
```

### Handling DOI Disambiguation

```typescript
if (analysis.disambiguationUsed && analysis.alternativeDOIs?.length > 0) {
  console.log(`Best match: ${analysis.primaryDOI} (${analysis.primaryDOIConfidence} confidence)`)
  console.log('Alternative DOIs found:')
  analysis.alternativeDOIs.forEach(alt => {
    console.log(`  - ${alt.doi} (score: ${alt.score}, confidence: ${alt.confidence})`)
  })
  
  // Optionally present alternatives to user for manual selection
  if (analysis.primaryDOIConfidence === 'low') {
    // Prompt user to choose
  }
}
```

### Error Handling

```typescript
if (analysis.status === 'partial_success') {
  // Some steps failed but we have usable results
  console.warn('Analysis completed with warnings:', analysis.errors)
  // Continue with recommendation
}

if (analysis.status === 'error') {
  // Critical failure
  console.error('Analysis failed:', analysis.errors)
  // Show error to user
}
```

## Performance Considerations

- **Early Exit**: The endpoint stops processing as soon as a reliable method is found
- **Timeout**: URL requests have a 30-second timeout
- **Rate Limiting**: CrossRef API calls are rate-limited (1 request/second)
- **AI Fallback**: Perplexity API is only called if all other methods fail
- **PDF Processing**: Can be slow for large PDFs (may timeout)

## Dependencies

The endpoint relies on several services:

- **CrossRefService**: DOI disambiguation and validation
- **PerplexityService**: AI-powered identifier extraction
- **PdfProcessor**: PDF content extraction
- **WebTranslator**: Zotero translator detection
- **IdentifierExtractor**: Pattern-based identifier extraction

## Related Endpoints

- `/add-from-identifier` - Import using DOI/ISBN/PMID
- `/add-from-url` - Import using web translator
- `/add-from-ai` - Import using AI extraction
- `/preview-identifier` - Preview metadata before import

## Changelog

- **v1.1.0**: Added DOI disambiguation with CrossRef integration
- **v1.1.0**: Added AI identifier extraction with Perplexity
- **v1.1.0**: Added PDF content processing
- **v1.0.0**: Initial release with basic URL analysis

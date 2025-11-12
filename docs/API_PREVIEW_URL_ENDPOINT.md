# Preview URL Endpoint Documentation

## Overview

The **Preview URL Endpoint** (`/citationlinker/previewurl`) translates URLs into Zotero item metadata without saving items to the library. This endpoint is ideal for validating translations, previewing metadata, and extracting citation information without modifying your Zotero library.

## Key Features

- **Non-Persistent Preview**: Items are created, metadata extracted, then immediately deleted
- **PDF Support**: Automatically detects and processes PDF URLs with identifier extraction
- **Multi-Method Translation**: Falls back through PDF→DOI→ArXiv→PMID→Web translation
- **Comprehensive Metadata**: Returns 50+ fields including creators, tags, relations, and generated citations
- **URL Normalization**: Provides both original and normalized URLs
- **Smart Fallbacks**: Graceful handling of translation failures

## Endpoint Details

- **Path**: `/citationlinker/previewurl`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Response Type**: `application/json`

## Request Format

### Request Body

```json
{
  "url": "https://example.com/article"
}
```

### Parameters

| Parameter | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| `url`     | string | Yes      | URL to preview (web page or PDF)      |

### URL Validation

The endpoint validates:

- URL format (must be valid HTTP/HTTPS URL)
- URL scheme (only `http://` and `https://` are supported)
- Library editability (required for temporary item creation)

## Response Format

### Success Response

```json
{
  "success": true,
  "mode": "preview",
  "message": "URL translated successfully - items not saved to library",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "method": "web_translation",
  "translator": "Example Site Translator",
  "itemCount": 1,
  "url": {
    "original": "https://example.com/article",
    "normalized": "https://example.com/article",
    "isPdf": false
  },
  "items": [
    {
      "itemKey": "TEMP123ABC",
      "itemType": "journalArticle",
      "libraryID": 1,
      
      // Basic Fields
      "title": "Example Article Title: A Comprehensive Study",
      "abstractNote": "This article presents a comprehensive study of...",
      "date": "2023-05-15",
      "url": "https://example.com/article",
      "accessDate": "2024-12-19T10:30:00Z",
      "rights": "© 2023 Publisher Name",
      "extra": "Additional notes and metadata",
      
      // Identifiers
      "DOI": "10.1000/example.doi",
      "ISBN": "",
      "ISSN": "1234-5678",
      
      // Publication Details
      "publicationTitle": "Nature",
      "volume": "615",
      "issue": "7952",
      "pages": "123-130",
      "series": "",
      "seriesNumber": "",
      "edition": "",
      "place": "London",
      "publisher": "Nature Publishing Group",
      
      // Type-Specific Fields
      "language": "en",
      "callNumber": "",
      "archive": "",
      "archiveLocation": "",
      "shortTitle": "Example Article",
      "websiteTitle": "",
      "websiteType": "",
      
      // Creators
      "creators": [
        {
          "creatorType": "author",
          "firstName": "John",
          "lastName": "Smith"
        },
        {
          "creatorType": "author",
          "firstName": "Jane",
          "lastName": "Doe"
        },
        {
          "creatorType": "editor",
          "firstName": "Robert",
          "lastName": "Johnson"
        }
      ],
      
      // Tags
      "tags": [
        {
          "tag": "biology",
          "type": 0
        },
        {
          "tag": "genetics",
          "type": 0
        }
      ],
      
      // Collections and Relations
      "collections": [],
      "relations": {},
      
      // Generated Content
      "generatedCitation": "(Smith & Doe, 2023)",
      "apiUrl": "https://api.zotero.org/users/12345/items/TEMP123ABC"
    }
  ],
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "processEndpoint": "/citationlinker/processurl"
  },
  "_note": "This is a preview only. Use /processurl to save items to your library."
}
```

### Translation Methods

The `method` field indicates how the URL was translated:

| Method                  | Description                                           |
|-------------------------|-------------------------------------------------------|
| `web_translation`       | Standard web page translation using Zotero translator |
| `pdf_doi_translation`   | PDF processed with DOI extracted and translated       |
| `pdf_arxiv_translation` | PDF processed with ArXiv ID extracted and translated  |
| `pdf_pmid_translation`  | PDF processed with PMID extracted and translated      |

### PDF Response Format

When a PDF URL is detected and processed:

```json
{
  "success": true,
  "mode": "preview",
  "method": "pdf_doi_translation",
  "translator": "DOI Content Negotiation",
  "url": {
    "original": "https://example.com/paper.pdf",
    "normalized": "https://example.com/paper.pdf",
    "isPdf": true
  },
  "pdfProcessing": {
    "pdfDetected": true,
    "extractedIdentifier": "10.1000/example.doi",
    "metadata": {
      "title": "Extracted PDF Title",
      "author": "PDF Author",
      "subject": "Research Paper",
      "keywords": "biology, genetics",
      "creator": "LaTeX with hyperref",
      "producer": "pdfTeX-1.40.21",
      "creationDate": "2023-05-10",
      "modificationDate": "2023-05-12",
      "pageCount": 12,
      "fileSize": 2456789
    }
  },
  "items": [...]
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "URL translation failed: No suitable translators found for this URL",
    "code": 422,
    "timestamp": "2024-12-19T10:30:00.000Z"
  }
}
```

### Error Codes

| Code | Description                                              |
|------|----------------------------------------------------------|
| 400  | Bad Request - Invalid URL format or missing parameters  |
| 422  | Unprocessable Entity - Translation failed                |
| 500  | Internal Server Error - Library not editable or other error |

## Metadata Fields Reference

### Core Fields

- **itemKey**: Temporary Zotero item key (will not persist)
- **itemType**: Type of item (journalArticle, book, webpage, etc.)
- **libraryID**: Library identifier where item was temporarily created
- **title**: Item title
- **abstractNote**: Abstract or summary text
- **date**: Publication or creation date
- **url**: Item URL
- **accessDate**: Date the item was accessed

### Identifiers

- **DOI**: Digital Object Identifier
- **ISBN**: International Standard Book Number
- **ISSN**: International Standard Serial Number

### Publication Details

- **publicationTitle**: Journal, magazine, or newspaper title
- **volume**: Volume number
- **issue**: Issue number
- **pages**: Page range (e.g., "123-130")
- **place**: Publication place
- **publisher**: Publisher name
- **series**: Series title
- **seriesNumber**: Series number
- **edition**: Edition information

### Additional Fields

- **language**: Language code (e.g., "en", "es")
- **rights**: Copyright and rights information
- **extra**: Additional notes and metadata
- **shortTitle**: Abbreviated title
- **websiteTitle**: Website name (for web pages)
- **websiteType**: Type of website (for web pages)
- **callNumber**: Library call number
- **archive**: Archive name
- **archiveLocation**: Location within archive

### Creators Array

Each creator object contains:

- **creatorType**: Role (author, editor, translator, etc.)
- **firstName**: Given name
- **lastName**: Family name
- **name**: Full name (for organizations or single-field names)

### Tags Array

Each tag object contains:

- **tag**: Tag text
- **type**: Tag type (0 = user tag, 1 = automatic tag)

### Generated Content

- **generatedCitation**: Inline citation in format "(Author, Year)"
- **apiUrl**: Zotero API URL for the item (if it were saved)

## Usage Examples

### Basic Web Page Preview

```bash
curl -X POST http://localhost:23119/citationlinker/previewurl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.nature.com/articles/s41586-023-12345-6"
  }'
```

### PDF URL Preview

```bash
curl -X POST http://localhost:23119/citationlinker/previewurl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://arxiv.org/pdf/2301.12345.pdf"
  }'
```

### Using with JavaScript

```javascript
async function previewUrl(url) {
  const response = await fetch('http://localhost:23119/citationlinker/previewurl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Preview successful: ${data.itemCount} items`);
    console.log(`Method: ${data.method}`);
    console.log(`Translator: ${data.translator}`);
    
    data.items.forEach(item => {
      console.log(`Title: ${item.title}`);
      console.log(`Citation: ${item.generatedCitation}`);
      console.log(`DOI: ${item.DOI || 'N/A'}`);
    });
  } else {
    console.error('Preview failed:', data.error.message);
  }
  
  return data;
}

// Example usage
previewUrl('https://example.com/article');
```

### Using with Python

```python
import requests
import json

def preview_url(url):
    """Preview URL translation without saving to Zotero library."""
    endpoint = 'http://localhost:23119/citationlinker/previewurl'
    
    response = requests.post(
        endpoint,
        headers={'Content-Type': 'application/json'},
        json={'url': url}
    )
    
    data = response.json()
    
    if data.get('success'):
        print(f"Preview successful: {data['itemCount']} items")
        print(f"Method: {data['method']}")
        print(f"Translator: {data['translator']}")
        
        for item in data['items']:
            print(f"\nTitle: {item['title']}")
            print(f"Type: {item['itemType']}")
            print(f"Citation: {item['generatedCitation']}")
            print(f"DOI: {item.get('DOI', 'N/A')}")
            print(f"Authors: {len(item['creators'])} creators")
    else:
        print(f"Preview failed: {data['error']['message']}")
    
    return data

# Example usage
preview_url('https://www.nature.com/articles/example')
```

## Implementation Details

### Translation Flow

1. **URL Validation**: Validates URL format and scheme
2. **Library Check**: Verifies library is editable (required for temporary item creation)
3. **PDF Detection**: Checks if URL points to a PDF file
4. **PDF Processing** (if PDF detected):
   - Downloads PDF temporarily
   - Extracts text content
   - Searches for identifiers (DOI, ArXiv, PMID)
   - Attempts identifier translation with extracted IDs
5. **Web Translation** (if not PDF or PDF translation failed):
   - Loads web page document
   - Detects available Zotero translators
   - Executes translation with best translator
6. **Metadata Extraction**: Extracts comprehensive metadata from created items
7. **Citation Generation**: Generates inline citations
8. **Item Deletion**: Immediately deletes all created items
9. **Response Building**: Constructs detailed response with all metadata

### PDF Processing Details

The endpoint automatically:

- Detects PDF URLs using file extension and URL patterns
- Downloads PDFs to temporary storage
- Extracts text using Zotero's PDFWorker
- Searches for identifiers using regex patterns:
  - **DOI**: `10.\d{4,}(?:\.\d+)*\/[-._;()/:a-zA-Z0-9]+`
  - **ArXiv**: `arXiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)`
  - **PMID**: `PMID\s*:?\s*(\d{7,8})`
  - **ISBN**: `ISBN[\s-]*(?:13|10)?[\s-]*:?\s*([\d-]{10,17})`
- Attempts translation in priority order: DOI → ArXiv → PMID
- Falls back to web translation if identifier methods fail
- Cleans up temporary files automatically

### URL Normalization

URLs are normalized by:

- Converting to lowercase
- Removing tracking parameters (utm_*, fbclid, etc.)
- Removing <www>. prefix
- Removing trailing slashes
- Standardizing query parameter order

### Error Handling

The endpoint handles:

- Invalid URL formats
- Unsupported URL schemes
- Translation failures
- PDF processing errors
- Metadata extraction failures
- Item deletion failures (logged but doesn't fail request)
- Network errors
- Timeout errors

### Performance Considerations

- **PDF Processing**: Can take 5-30 seconds depending on PDF size
- **Web Translation**: Typically completes in 2-10 seconds
- **Metadata Extraction**: < 1 second per item
- **Item Deletion**: < 1 second per item

## Use Cases

### 1. Validation Before Import

Preview translations to ensure quality before committing to library:

```bash
# Preview first
curl -X POST http://localhost:23119/citationlinker/previewurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'

# If satisfied, process to save
curl -X POST http://localhost:23119/citationlinker/processurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

### 2. External Workflow Integration

Extract metadata for use in external systems without modifying Zotero:

```javascript
// Preview and extract metadata for external database
const preview = await previewUrl('https://example.com/article');

if (preview.success) {
  const item = preview.items[0];
  
  // Store in external database
  await database.items.create({
    title: item.title,
    authors: item.creators.filter(c => c.creatorType === 'author'),
    doi: item.DOI,
    citation: item.generatedCitation,
    metadata: item
  });
}
```

### 3. Batch URL Validation

Check multiple URLs without creating library clutter:

```javascript
const urls = [
  'https://example.com/article1',
  'https://example.com/article2',
  'https://example.com/article3'
];

const results = await Promise.all(
  urls.map(url => previewUrl(url))
);

// Analyze which URLs have good translations
const validUrls = results.filter(r => r.success && r.items[0].DOI);
console.log(`${validUrls.length}/${urls.length} URLs have valid DOI metadata`);
```

### 4. PDF Identifier Extraction

Extract identifiers from PDFs without creating items:

```javascript
const preview = await previewUrl('https://example.com/paper.pdf');

if (preview.success && preview.pdfProcessing) {
  console.log('PDF Identifier:', preview.pdfProcessing.extractedIdentifier);
  console.log('PDF Metadata:', preview.pdfProcessing.metadata);
  
  // Use identifier for CrossRef lookup or other purposes
  const doi = preview.pdfProcessing.extractedIdentifier;
  // ... additional processing
}
```

### 5. Translator Testing

Test if URLs have available translators:

```javascript
async function testUrlTranslator(url) {
  const preview = await previewUrl(url);
  
  return {
    url,
    hasTranslator: preview.success,
    translator: preview.translator,
    method: preview.method,
    itemType: preview.items?.[0]?.itemType
  };
}

// Test multiple URLs
const testUrls = [
  'https://www.nature.com/articles/example1',
  'https://arxiv.org/abs/2301.12345',
  'https://pubmed.ncbi.nlm.nih.gov/12345678/'
];

const translatorTests = await Promise.all(
  testUrls.map(url => testUrlTranslator(url))
);
```

### 6. Citation Data Extraction

Extract citation data for bibliography generation:

```javascript
const preview = await previewUrl('https://example.com/article');

if (preview.success) {
  const item = preview.items[0];
  
  // Generate bibliography entry
  const bibEntry = {
    inlineCitation: item.generatedCitation,
    fullCitation: `${item.creators.map(c => c.lastName).join(', ')} (${item.date.split('-')[0]}). ${item.title}. ${item.publicationTitle}, ${item.volume}(${item.issue}), ${item.pages}.`,
    doi: item.DOI,
    url: item.url
  };
  
  console.log('Bibliography Entry:', bibEntry);
}
```

## Related Endpoints

- **`/citationlinker/processurl`**: Save URL translation to library (persistent)
- **`/citationlinker/analyzeurl`**: Analyze URL without translation
- **`/citationlinker/previewidentifier`**: Preview identifier translation without saving
- **`/citationlinker/detectidentifier`**: Check if identifier has translators

## Best Practices

1. **Always Preview First**: Use preview endpoint to validate translations before saving
2. **Handle PDF Timeouts**: PDF processing can be slow; implement appropriate timeouts
3. **Check Item Quality**: Verify title, authors, and DOI in preview before saving
4. **Batch Carefully**: Don't overwhelm the endpoint with too many concurrent requests
5. **Cache Results**: Cache preview results to avoid repeated translations
6. **Error Handling**: Always handle translation failures gracefully
7. **Validate URLs**: Check URL format before sending to endpoint

## Troubleshooting

### No Translator Found

**Problem**: `"No suitable translators found for this URL"`

**Solutions**:

- Check if URL is accessible and loads correctly
- Try the URL directly in Zotero to verify translator availability
- Some sites may require cookies or authentication
- Consider using `/analyzeurl` endpoint first to check translator availability

### PDF Processing Failed

**Problem**: PDF processing times out or fails

**Solutions**:

- Verify PDF URL is accessible
- Check PDF file size (endpoint has 50MB default limit)
- Ensure PDF is text-based (not scanned images)
- Try extracting identifier manually and use `/previewidentifier`

### Empty Metadata

**Problem**: Preview succeeds but metadata is sparse

**Solutions**:

- Some translators provide minimal metadata
- Try different URL variants (DOI URL vs journal URL)
- Consider using AI-powered `/processurlwithai` endpoint
- Manually enrich metadata after preview

### Translation Quality Issues

**Problem**: Preview shows incorrect or low-quality metadata

**Solutions**:

- Compare with direct Zotero translation
- Check translator priorities and versions
- Report issues to Zotero translator repository
- Consider using identifier-based translation if DOI available

## Limitations

1. **Temporary Items Only**: Items must be created temporarily (cannot preview without creation)
2. **Library Required**: Requires editable library access
3. **No Attachment Preview**: Attachments are not included in preview
4. **Single Translation**: Only uses first available translator (no fallback to secondary)
5. **PDF Size Limits**: PDFs larger than configured limit (default 50MB) will fail
6. **Network Dependent**: Requires network access to fetch URLs and PDFs
7. **Translator Availability**: Limited to available Zotero translators

## Version History

- **v1.5.0**: Initial implementation of preview URL endpoint
  - Support for web page and PDF URL translation
  - Comprehensive metadata extraction
  - PDF identifier extraction (DOI, ArXiv, PMID)
  - URL normalization
  - Citation generation
  - Multi-method translation fallback

# Process URL Endpoint Documentation

## Overview

The **Process URL Endpoint** (`/citationlinker/processurl`) translates URLs into Zotero items and **saves them to your library**. This is the primary endpoint for importing web content and PDFs into Zotero through the API, featuring advanced duplicate detection, quality validation, and PDF processing capabilities.

## Key Features

- **Persistent Import**: Items are saved permanently to Zotero library
- **PDF Intelligence**: Automatic PDF detection and identifier extraction
- **Duplicate Detection**: Advanced multi-method duplicate checking before save
- **Quality Validation**: Automatic validation and cleanup of invalid items
- **Multi-Method Translation**: Falls back through PDF→DOI→ArXiv→PMID→Web translation
- **Existing Item Detection**: Checks for existing items by URL before translation
- **Rich Response**: Returns comprehensive metadata, duplicate info, and quality reports

## Endpoint Details

- **Path**: `/citationlinker/processurl`
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
| `url`     | string | Yes      | URL to process and save to library    |

### URL Validation

The endpoint validates:
- URL format (must be valid HTTP/HTTPS URL)
- URL scheme (only `http://` and `https://` are supported)
- Library editability (required for item creation)

## Response Format

### Success Response (New Item Created)

```json
{
  "success": true,
  "method": "web_translation",
  "translator": "Example Site Translator",
  "itemCount": 1,
  "timestamp": "2024-12-19T10:30:00.000Z",
  "items": [
    {
      "key": "ABC123DEF",
      "itemType": "journalArticle",
      "title": "Example Article Title",
      "creators": [
        {
          "firstName": "John",
          "lastName": "Smith",
          "creatorType": "author"
        }
      ],
      "date": "2023-05-15",
      "DOI": "10.1000/example.doi",
      "url": "https://example.com/article",
      "publicationTitle": "Nature",
      "volume": "615",
      "issue": "7952",
      "pages": "123-130",
      "_meta": {
        "index": 0,
        "itemKey": "ABC123DEF",
        "itemType": "journalArticle",
        "library": 1,
        "citation": "(Smith, 2023)",
        "apiUrl": "https://api.zotero.org/users/12345/items/ABC123DEF"
      }
    }
  ],
  "duplicateInfo": {
    "processed": true,
    "duplicateCount": 0,
    "candidates": [],
    "flaggedItems": []
  },
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "zoteroApi": "https://api.zotero.org/"
  }
}
```

### Success Response (Existing Item Found)

When an item with the same URL already exists:

```json
{
  "success": true,
  "method": "existing_item",
  "translator": "Library lookup (URL)",
  "itemCount": 1,
  "timestamp": "2024-12-19T10:30:00.000Z",
  "items": [
    {
      "key": "EXISTING123",
      "itemType": "journalArticle",
      "title": "Example Article Title",
      "_meta": {
        "citation": "(Smith, 2023)",
        "apiUrl": "https://api.zotero.org/users/12345/items/EXISTING123"
      }
    }
  ],
  "duplicateInfo": {
    "processed": true,
    "duplicateCount": 0,
    "existingItem": true,
    "message": "Item already exists in library with URL: https://example.com/article",
    "urlInfo": {
      "url": "https://example.com/article",
      "normalizedUrl": "https://example.com/article"
    }
  }
}
```

### Success Response (With Duplicates Detected)

When duplicates are found and handled:

```json
{
  "success": true,
  "method": "web_translation",
  "translator": "Example Site Translator",
  "itemCount": 1,
  "items": [...],
  "duplicateInfo": {
    "processed": true,
    "duplicateCount": 1,
    "candidates": [
      {
        "item": {...},
        "score": 95,
        "reason": "DOI match + Title similarity",
        "confidence": "high"
      }
    ],
    "flaggedItems": [
      {
        "newItemKey": "NEW456",
        "existingItemKey": "EXISTING123",
        "action": "kept_existing",
        "reason": "High similarity score (95) - DOI match",
        "message": "Preserved existing item to maintain external references"
      }
    ]
  }
}
```

### Success Response (With Quality Control)

When items are validated and some rejected:

```json
{
  "success": true,
  "method": "web_translation",
  "translator": "Example Site Translator",
  "itemCount": 2,
  "items": [
    {
      "key": "VALID123",
      "title": "Valid Article Title",
      "creators": [{"lastName": "Smith"}]
    },
    {
      "key": "VALID456",
      "title": "Another Valid Article",
      "creators": [{"lastName": "Jones"}]
    }
  ],
  "qualityControl": {
    "itemsValidated": 3,
    "itemsRejected": 1,
    "rejectionReasons": [
      "Invalid title: 'Untitled' - does not meet quality standards"
    ],
    "validationCriteria": ["title_quality", "author_presence"]
  },
  "duplicateInfo": {
    "processed": true,
    "duplicateCount": 0
  }
}
```

### PDF Translation Response

When PDF URL is processed successfully:

```json
{
  "success": true,
  "method": "pdf_doi_translation",
  "translator": "DOI Content Negotiation",
  "itemCount": 1,
  "items": [...],
  "duplicateInfo": {
    "processed": true,
    "duplicateCount": 0,
    "pdfProcessed": true,
    "extractedIdentifier": "10.1000/example.doi",
    "pdfMetadata": {
      "title": "Extracted PDF Title",
      "author": "PDF Author",
      "pageCount": 12,
      "fileSize": 2456789
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Translation failed: No suitable translators found for this URL",
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

## Translation Methods

The `method` field indicates how the URL was processed:

| Method                  | Description                                           |
|-------------------------|-------------------------------------------------------|
| `existing_item`         | Item already exists in library (found by URL)         |
| `web_translation`       | Standard web page translation                         |
| `pdf_doi_translation`   | PDF processed with DOI extracted and translated       |
| `pdf_arxiv_translation` | PDF processed with ArXiv ID extracted and translated  |
| `pdf_pmid_translation`  | PDF processed with PMID extracted and translated      |

## Processing Flow

### 1. URL Validation
- Validates URL format and scheme
- Checks library editability

### 2. Existing Item Check
- Searches library for items with matching URL
- Uses normalized URL for comparison
- Returns existing item if found (no new item created)

### 3. PDF Detection & Processing
If URL is detected as PDF:
1. Download PDF to temporary storage
2. Extract text content using Zotero PDFWorker
3. Search for identifiers (DOI, ArXiv, PMID, ISBN)
4. Attempt identifier translation with extracted IDs (priority: DOI → ArXiv → PMID)
5. Fall back to web translation if identifier methods fail

### 4. Web Translation
If not PDF or PDF processing failed:
1. Load web page document
2. Detect available Zotero translators
3. Execute translation with best available translator
4. Create items in Zotero library

### 5. Quality Validation
For each translated item:
- **Title Validation**: Reject items with invalid titles ("Untitled", "No title", empty, etc.)
- **Author Validation**: Ensure at least one valid creator exists
- **Automatic Cleanup**: Delete items that fail validation
- **Quality Reporting**: Log validation decisions and rejections

### 6. Duplicate Detection
For each valid item:
1. **Perfect Matching** (Score: 100):
   - DOI match
   - ISBN match
   - PMID/PMC match
   - ArXiv ID match
2. **High Similarity** (Score: 70-99):
   - Title + Author + Year similarity
   - URL normalization and comparison
3. **Automatic Handling**:
   - Score ≥ 85: Auto-merge (keep existing item)
   - Score 70-84: Flag as possible duplicate
   - Score < 70: Keep both items

### 7. Response Building
- Include all created/found items
- Add duplicate detection results
- Include quality control information
- Provide metadata and API links

## Usage Examples

### Basic URL Processing

```bash
curl -X POST http://localhost:23119/citationlinker/processurl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.nature.com/articles/s41586-023-12345-6"
  }'
```

### PDF URL Processing

```bash
curl -X POST http://localhost:23119/citationlinker/processurl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://arxiv.org/pdf/2301.12345.pdf"
  }'
```

### Using with JavaScript

```javascript
async function processUrl(url) {
  const response = await fetch('http://localhost:23119/citationlinker/processurl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Processed ${data.itemCount} item(s)`);
    console.log(`Method: ${data.method}`);
    
    if (data.method === 'existing_item') {
      console.log('Item already exists in library');
    }
    
    data.items.forEach(item => {
      console.log(`\nTitle: ${item.title}`);
      console.log(`Key: ${item.key}`);
      console.log(`Citation: ${item._meta.citation}`);
      console.log(`API URL: ${item._meta.apiUrl}`);
    });
    
    // Check for duplicates
    if (data.duplicateInfo.duplicateCount > 0) {
      console.log(`\nFound ${data.duplicateInfo.duplicateCount} potential duplicates`);
      data.duplicateInfo.candidates.forEach(dup => {
        console.log(`- Score: ${dup.score}, Reason: ${dup.reason}`);
      });
    }
    
    // Check quality control
    if (data.qualityControl && data.qualityControl.itemsRejected > 0) {
      console.log(`\nRejected ${data.qualityControl.itemsRejected} invalid items`);
      console.log('Reasons:', data.qualityControl.rejectionReasons);
    }
  } else {
    console.error('Processing failed:', data.error.message);
  }
  
  return data;
}

// Example usage
processUrl('https://www.nature.com/articles/example');
```

### Using with Python

```python
import requests
import json

def process_url(url):
    """Process URL and save to Zotero library."""
    endpoint = 'http://localhost:23119/citationlinker/processurl'
    
    response = requests.post(
        endpoint,
        headers={'Content-Type': 'application/json'},
        json={'url': url}
    )
    
    data = response.json()
    
    if data.get('success'):
        print(f"Processed {data['itemCount']} item(s)")
        print(f"Method: {data['method']}")
        
        for item in data['items']:
            print(f"\nTitle: {item['title']}")
            print(f"Key: {item.get('key', 'N/A')}")
            print(f"Type: {item['itemType']}")
            
            if '_meta' in item:
                print(f"Citation: {item['_meta'].get('citation', 'N/A')}")
                print(f"API URL: {item['_meta'].get('apiUrl', 'N/A')}")
        
        # Check for duplicates
        if data['duplicateInfo']['duplicateCount'] > 0:
            print(f"\n⚠️  Found {data['duplicateInfo']['duplicateCount']} potential duplicates")
            for candidate in data['duplicateInfo'].get('candidates', []):
                print(f"  - Score: {candidate['score']}, Reason: {candidate['reason']}")
        
        # Check quality control
        if 'qualityControl' in data and data['qualityControl'].get('itemsRejected', 0) > 0:
            print(f"\n❌ Rejected {data['qualityControl']['itemsRejected']} invalid items")
            for reason in data['qualityControl'].get('rejectionReasons', []):
                print(f"  - {reason}")
    else:
        print(f"❌ Processing failed: {data['error']['message']}")
    
    return data

# Example usage
result = process_url('https://www.nature.com/articles/example')
```

### Batch Processing with Duplicate Handling

```javascript
async function batchProcessUrls(urls) {
  const results = {
    success: [],
    failed: [],
    duplicates: [],
    rejected: []
  };
  
  for (const url of urls) {
    try {
      const data = await processUrl(url);
      
      if (data.success) {
        results.success.push({
          url,
          itemKey: data.items[0]?.key,
          method: data.method
        });
        
        if (data.duplicateInfo.duplicateCount > 0) {
          results.duplicates.push({
            url,
            duplicateCount: data.duplicateInfo.duplicateCount
          });
        }
        
        if (data.qualityControl?.itemsRejected > 0) {
          results.rejected.push({
            url,
            rejectedCount: data.qualityControl.itemsRejected,
            reasons: data.qualityControl.rejectionReasons
          });
        }
      } else {
        results.failed.push({
          url,
          error: data.error.message
        });
      }
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.failed.push({
        url,
        error: error.message
      });
    }
  }
  
  console.log(`\n=== Batch Processing Results ===`);
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`🔁 Duplicates: ${results.duplicates.length}`);
  console.log(`⚠️  Rejected: ${results.rejected.length}`);
  
  return results;
}

// Example usage
const urls = [
  'https://www.nature.com/articles/example1',
  'https://arxiv.org/abs/2301.12345',
  'https://pubmed.ncbi.nlm.nih.gov/12345678/'
];

batchProcessUrls(urls);
```

## Duplicate Detection Details

### Detection Methods

#### 1. Perfect Matching (Score: 100)

**DOI Matching**:
```javascript
// Searches for items with matching DOI field
search.addCondition('DOI', 'is', doi)
```

**ISBN Matching**:
```javascript
// Searches for items with matching ISBN field
search.addCondition('ISBN', 'is', isbn)
```

**PMID Matching**:
```javascript
// Searches Extra field for PMID
search.addCondition('extra', 'contains', `PMID: ${pmid}`)
```

**ArXiv Matching**:
```javascript
// Searches Extra field for ArXiv ID
search.addCondition('extra', 'contains', `arXiv:${arxivId}`)
```

#### 2. Fuzzy Matching (Score: 70-99)

**Title Similarity**:
- Levenshtein distance algorithm
- Normalized and lowercase comparison
- Weight: 40% of total score

**Author Similarity**:
- Compares creator names
- Handles variations (Smith vs Smith, J.)
- Weight: 30% of total score

**Year Matching**:
- Exact year comparison
- Extracted from date field
- Weight: 20% of total score

**URL Matching**:
- Normalized URL comparison
- Removes tracking parameters
- Weight: 10% of total score

### Duplicate Handling Rules

| Score Range | Action | Description |
|-------------|--------|-------------|
| 100 | Auto-merge | Perfect identifier match - always merge |
| 85-99 | Auto-merge | Very high similarity - merge to protect references |
| 70-84 | Flag | Possible duplicate - flag for review |
| < 70 | Keep | Low similarity - treat as separate items |

### "Oldest Item Wins" Principle

When duplicates are merged:
- **Existing item is preserved** (the "oldest")
- **New item is deleted**
- **Protects external references** (Obsidian links, citations, etc.)
- **Maintains data integrity** across workflows

## Quality Validation Details

### Title Validation

**Rejected Patterns**:
- "Untitled"
- "No title"
- "Unknown"
- "Placeholder"
- "Document"
- Empty or whitespace-only

**Validation**:
```javascript
const forbiddenPatterns = [
  /^untitled$/i,
  /^no\s*title$/i,
  /^unknown$/i,
  /^placeholder$/i,
  /^document$/i,
  /^\s*$/
];

const isValidTitle = !forbiddenPatterns.some(pattern => 
  pattern.test(title.trim())
) && title.trim().length >= 3;
```

### Author Validation

**Requirements**:
- At least one creator must exist
- Creator must have meaningful name
- lastName, firstName, or name field required

**Rejected Patterns**:
- "Unknown"
- "Anonymous"
- "[s.n.]" (sine nomine)
- "N/A"
- Empty or whitespace-only

**Validation**:
```javascript
const hasValidCreator = creators.some(creator => {
  const name = creator.lastName || creator.firstName || creator.name;
  return name && name.trim().length >= 2 && !forbiddenAuthorPatterns.test(name);
});
```

### Automatic Cleanup

When items fail validation:
1. Item is marked as invalid
2. Item is deleted from library using `eraseTx()`
3. Deletion is logged with reason
4. Validation report includes rejection details
5. Other valid items continue processing

## PDF Processing Details

### PDF Detection

URLs are identified as PDFs by:
- File extension: `.pdf`
- URL patterns: `/pdf/`, `/download/pdf`, `/full.pdf`

### PDF Extraction Process

1. **Download**:
   ```javascript
   const tempFile = await Zotero.HTTP.downloadToTemp(pdfUrl);
   ```

2. **Text Extraction**:
   ```javascript
   const pdfData = await Zotero.PDFWorker.getFullText(itemID, maxPages);
   ```

3. **Identifier Search**:
   - DOI: `10.\d{4,}(?:\.\d+)*\/[-._;()/:a-zA-Z0-9]+`
   - ArXiv: `arXiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)`
   - PMID: `PMID\s*:?\s*(\d{7,8})`
   - ISBN: `ISBN[\s-]*(?:13|10)?[\s-]*:?\s*([\d-]{10,17})`

4. **Translation Attempts** (priority order):
   - DOI translation
   - ArXiv translation
   - PMID translation
   - Fallback to web translation

5. **Cleanup**:
   - Remove temporary PDF file
   - Delete extraction cache

### PDF Configuration

Default limits (configurable via preferences):
```javascript
{
  maxPdfSize: 50 * 1024 * 1024, // 50MB
  maxPdfPages: 10, // Pages to extract
  extractionTimeout: 30000 // 30 seconds
}
```

## URL Normalization

### Normalization Process

```javascript
function normalizeUrl(url) {
  const urlObj = new URL(url);
  
  // Remove tracking parameters
  ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid']
    .forEach(param => urlObj.searchParams.delete(param));
  
  // Remove www prefix
  let hostname = urlObj.hostname.toLowerCase();
  if (hostname.startsWith('www.')) {
    hostname = hostname.substring(4);
  }
  
  // Remove trailing slash
  let pathname = urlObj.pathname;
  if (pathname.endsWith('/') && pathname.length > 1) {
    pathname = pathname.slice(0, -1);
  }
  
  return `${urlObj.protocol}//${hostname}${pathname}${urlObj.search}${urlObj.hash}`;
}
```

### Benefits

- **Duplicate Detection**: Matches URLs despite tracking parameters
- **Consistency**: Standardized URL format across library
- **Privacy**: Removes tracking parameters
- **Matching**: Handles www vs non-www variations

## Use Cases

### 1. Single URL Import

Import individual articles or web pages:

```bash
curl -X POST http://localhost:23119/citationlinker/processurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.nature.com/articles/example"}'
```

### 2. PDF Import with Identifier Extraction

Import PDFs with automatic metadata enrichment:

```bash
curl -X POST http://localhost:23119/citationlinker/processurl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://arxiv.org/pdf/2301.12345.pdf"}'
```

### 3. Browser Integration

Integrate with browser extensions:

```javascript
// Browser extension background script
chrome.contextMenus.create({
  title: "Save to Zotero",
  contexts: ["link"],
  onclick: async (info) => {
    const url = info.linkUrl;
    
    try {
      const response = await fetch('http://localhost:23119/citationlinker/processurl', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (data.success) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Saved to Zotero',
          message: `Added: ${data.items[0].title}`
        });
      }
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }
});
```

### 4. Obsidian Integration

Import citations directly into Obsidian:

```javascript
// Obsidian plugin code
async function importUrlToZotero(url) {
  const response = await requestUrl({
    url: 'http://localhost:23119/citationlinker/processurl',
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ url })
  });
  
  const data = response.json;
  
  if (data.success) {
    const item = data.items[0];
    const citation = `[${item._meta.citation}](${item._meta.apiUrl})`;
    
    // Insert citation at cursor
    const editor = this.app.workspace.activeLeaf.view.editor;
    editor.replaceSelection(citation);
    
    new Notice(`Added: ${item.title}`);
  }
}
```

### 5. Reading List Import

Import entire reading lists:

```python
def import_reading_list(urls_file):
    """Import URLs from a text file."""
    with open(urls_file, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]
    
    results = []
    for i, url in enumerate(urls, 1):
        print(f"Processing {i}/{len(urls)}: {url}")
        
        try:
            result = process_url(url)
            results.append({
                'url': url,
                'success': result.get('success', False),
                'key': result.get('items', [{}])[0].get('key')
            })
            
            # Rate limiting
            time.sleep(2)
        except Exception as e:
            print(f"Error: {e}")
            results.append({
                'url': url,
                'success': False,
                'error': str(e)
            })
    
    # Generate report
    successful = sum(1 for r in results if r['success'])
    print(f"\nImport complete: {successful}/{len(urls)} successful")
    
    return results

# Usage
import_reading_list('reading_list.txt')
```

## Error Handling

### Common Errors

#### Translation Failed

**Error**: `"Translation failed: No suitable translators found for this URL"`

**Causes**:
- URL has no Zotero translator available
- Website blocks automated access
- Website requires authentication
- Page structure changed (translator outdated)

**Solutions**:
- Try URL in Zotero directly to verify translator
- Use `/analyzeurl` to check translator availability
- Consider `/processurlwithai` for AI-powered extraction
- Report translator issues to Zotero

#### Library Not Editable

**Error**: `"Target library is not editable"`

**Causes**:
- Read-only library (group library with no write access)
- Library is locked
- Zotero sync in progress

**Solutions**:
- Check library permissions
- Wait for sync to complete
- Try different library

#### PDF Processing Failed

**Error**: `"PDF processed but could not create item from extracted identifiers"`

**Causes**:
- PDF has no identifiers
- Extracted identifiers are invalid
- PDF is scanned images (no text)
- PDF exceeds size limit

**Solutions**:
- Extract identifier manually and use `/processidentifier`
- Use OCR for scanned PDFs
- Increase PDF size limit in preferences
- Try direct DOI URL instead

### Error Recovery

```javascript
async function processUrlWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await processUrl(url);
      
      if (result.success) {
        return result;
      }
      
      // If translation failed, try alternative methods
      if (result.error.message.includes('No suitable translators')) {
        console.log('No translator found, trying AI method...');
        // Fall back to AI endpoint
        return await processUrlWithAI(url);
      }
      
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts`);
}
```

## Performance Considerations

### Response Times

- **Existing Item Check**: < 1 second
- **Web Translation**: 2-10 seconds
- **PDF Processing**: 5-30 seconds (depends on PDF size)
- **Duplicate Detection**: 1-3 seconds per item
- **Quality Validation**: < 1 second per item

### Optimization Tips

1. **Check Existing Items First**: Use `/itemkeybyurl` before processing
2. **Batch with Delays**: Add delays between requests for batch processing
3. **Use Preview First**: Preview with `/previewurl` before committing
4. **Handle PDFs Separately**: Consider extracting identifiers manually for large PDFs
5. **Cache Results**: Cache successful translations to avoid reprocessing

## Related Endpoints

- **`/citationlinker/previewurl`**: Preview URL translation without saving
- **`/citationlinker/processurlwithai`**: AI-powered translation with Perplexity
- **`/citationlinker/analyzeurl`**: Analyze URL capabilities before translation
- **`/citationlinker/processidentifier`**: Process identifier directly (DOI, PMID, etc.)
- **`/citationlinker/itemkeybyurl`**: Check if URL already exists in library

## Best Practices

1. **Check Existing First**: Use URL lookup to avoid duplicates
2. **Handle Errors Gracefully**: Implement retry logic with exponential backoff
3. **Rate Limit**: Don't overwhelm the endpoint with concurrent requests
4. **Validate Before Processing**: Use `/analyzeurl` or `/previewurl` first
5. **Monitor Quality**: Check `qualityControl` and `duplicateInfo` in responses
6. **Log Results**: Maintain logs of processed URLs for troubleshooting
7. **Handle PDFs Carefully**: Implement timeouts for PDF processing
8. **Review Duplicates**: Manually review items flagged as possible duplicates

## Troubleshooting

### High Duplicate Detection

**Problem**: Many items flagged as duplicates

**Solutions**:
- Review duplicate threshold settings
- Check if same URLs being processed repeatedly
- Verify URL normalization is working correctly
- Consider adjusting similarity scores

### Quality Validation Too Strict

**Problem**: Valid items being rejected

**Solutions**:
- Review validation patterns
- Check if translators provide minimal metadata
- Consider adjusting validation criteria
- Report translator issues

### Slow PDF Processing

**Problem**: PDF processing takes too long

**Solutions**:
- Reduce `maxPdfPages` setting
- Implement request timeouts
- Process PDFs asynchronously
- Consider pre-extracting identifiers

## Limitations

1. **Translator Dependent**: Quality depends on available Zotero translators
2. **Network Required**: Requires network access for URL fetching
3. **PDF Size Limits**: Large PDFs may fail or timeout
4. **Single Library**: Can only save to one library at a time
5. **No Attachment Download**: Attachments not automatically downloaded
6. **Sync Delay**: Items may not immediately sync to Zotero web

## Version History

- **v1.5.0**: Enhanced duplicate detection and quality validation
  - Multi-method duplicate detection
  - Automatic quality validation
  - PDF processing with identifier extraction
  - URL normalization for duplicate checking
  - Comprehensive response with quality reports

- **v1.4.0**: PDF processing support
  - Automatic PDF detection
  - Identifier extraction from PDFs
  - PDF metadata in responses

- **v1.3.0**: Duplicate detection
  - Perfect identifier matching
  - Fuzzy title/author/year matching
  - URL-based duplicate detection

- **v1.0.0**: Initial implementation
  - Basic web translation
  - Item creation in Zotero library


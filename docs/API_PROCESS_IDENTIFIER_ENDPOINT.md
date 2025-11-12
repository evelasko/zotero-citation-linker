# Process Identifier Endpoint Documentation

## Overview

The **Process Identifier Endpoint** (`/citationlinker/processidentifier`) translates academic identifiers (DOI, PMID, ArXiv, ISBN, etc.) into Zotero items and **saves them to your library**. This endpoint provides direct, high-quality metadata retrieval from authoritative sources, with automatic duplicate detection and quality validation.

## Key Features

- **Direct Identifier Translation**: Translate DOI, PMID, ArXiv, ISBN, ISSN directly to Zotero items
- **Persistent Import**: Items are saved permanently to Zotero library
- **Automatic Identifier Detection**: Recognizes identifier type from input string
- **Existing Item Check**: Searches library for items with same identifier before translation
- **Quality Validation**: Automatic validation and cleanup of invalid items
- **Duplicate Detection**: Advanced multi-method duplicate checking
- **High-Quality Metadata**: Retrieves metadata from authoritative sources (CrossRef, PubMed, ArXiv, etc.)

## Endpoint Details

- **Path**: `/citationlinker/processidentifier`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Response Type**: `application/json`

## Request Format

### Request Body

```json
{
  "identifier": "10.1038/s41586-023-12345-6"
}
```

### Parameters

| Parameter    | Type   | Required | Description                                    |
|--------------|--------|----------|------------------------------------------------|
| `identifier` | string | Yes      | Academic identifier (DOI, PMID, ArXiv, etc.)   |

### Supported Identifier Types

| Type   | Format Examples                              | Notes                          |
|--------|----------------------------------------------|--------------------------------|
| DOI    | `10.1038/s41586-023-12345-6`                 | Most common, highest quality   |
| PMID   | `12345678` or `PMID:12345678`                | PubMed identifiers             |
| PMC    | `PMC1234567`                                 | PubMed Central IDs             |
| ArXiv  | `2301.12345` or `arXiv:2301.12345`           | Preprint identifiers           |
| ISBN   | `978-0-123-45678-9` or `ISBN:978-0-123-45678-9` | Book identifiers         |
| ISSN   | `1234-5678` or `ISSN:1234-5678`              | Journal identifiers            |

### Identifier Extraction

The endpoint automatically extracts and recognizes identifiers:

```javascript
// All of these work:
"10.1038/nature12345"              // Plain DOI
"https://doi.org/10.1038/nature12345" // DOI URL
"doi:10.1038/nature12345"          // DOI with prefix
"PMID:12345678"                    // PMID with prefix
"arXiv:2301.12345"                 // ArXiv with prefix
"ISBN 978-0-123-45678-9"           // ISBN with prefix
```

## Response Format

### Success Response (New Item Created)

```json
{
  "success": true,
  "method": "identifier_translation",
  "translator": "DOI Content Negotiation",
  "itemCount": 1,
  "timestamp": "2024-12-19T10:30:00.000Z",
  "items": [
    {
      "key": "ABC123DEF",
      "version": 0,
      "library": {
        "type": "user",
        "id": 12345,
        "name": "My Library"
      },
      "links": {
        "self": {
          "href": "https://api.zotero.org/users/12345/items/ABC123DEF",
          "type": "application/json"
        },
        "alternate": {
          "href": "https://www.zotero.org/users/12345/items/ABC123DEF",
          "type": "text/html"
        }
      },
      "meta": {
        "creatorSummary": "Smith et al.",
        "parsedDate": "2023-05-15",
        "numChildren": 0
      },
      "data": {
        "key": "ABC123DEF",
        "version": 0,
        "itemType": "journalArticle",
        "title": "Example Article Title: A Comprehensive Study",
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
          }
        ],
        "abstractNote": "This article presents a comprehensive study of...",
        "publicationTitle": "Nature",
        "volume": "615",
        "issue": "7952",
        "pages": "123-130",
        "date": "2023-05-15",
        "series": "",
        "seriesTitle": "",
        "seriesText": "",
        "journalAbbreviation": "Nature",
        "language": "en",
        "DOI": "10.1038/s41586-023-12345-6",
        "ISSN": "1476-4687",
        "shortTitle": "",
        "url": "https://www.nature.com/articles/s41586-023-12345-6",
        "accessDate": "2024-12-19T10:30:00Z",
        "archive": "",
        "archiveLocation": "",
        "libraryCatalog": "DOI.org (Crossref)",
        "callNumber": "",
        "rights": "",
        "extra": "",
        "tags": [],
        "collections": [],
        "relations": {},
        "dateAdded": "2024-12-19T10:30:00Z",
        "dateModified": "2024-12-19T10:30:00Z"
      },
      "_meta": {
        "index": 0,
        "itemKey": "ABC123DEF",
        "itemType": "journalArticle",
        "library": 1,
        "citation": "(Smith & Doe, 2023)",
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

When an item with the same identifier already exists:

```json
{
  "success": true,
  "method": "existing_item",
  "translator": "Library lookup (DOI)",
  "itemCount": 1,
  "timestamp": "2024-12-19T10:30:00.000Z",
  "items": [
    {
      "key": "EXISTING123",
      "itemType": "journalArticle",
      "title": "Example Article Title",
      "DOI": "10.1038/s41586-023-12345-6",
      "_meta": {
        "citation": "(Smith & Doe, 2023)",
        "apiUrl": "https://api.zotero.org/users/12345/items/EXISTING123"
      }
    }
  ],
  "duplicateInfo": {
    "processed": true,
    "duplicateCount": 0,
    "existingItem": true,
    "message": "Item already exists in library with DOI: 10.1038/s41586-023-12345-6",
    "identifierInfo": {
      "identifier": "10.1038/s41586-023-12345-6",
      "identifierType": "DOI",
      "identifierValue": "10.1038/s41586-023-12345-6"
    }
  }
}
```

### Success Response (With Quality Control)

When items are validated and some rejected:

```json
{
  "success": true,
  "method": "identifier_translation",
  "translator": "DOI Content Negotiation",
  "itemCount": 1,
  "items": [...],
  "duplicateInfo": {
    "processed": true,
    "duplicateCount": 0
  },
  "qualityControl": {
    "itemsValidated": 2,
    "itemsRejected": 1,
    "rejectionReasons": [
      "Invalid title: 'Untitled' - does not meet quality standards",
      "No valid creators found"
    ],
    "validationCriteria": ["title_quality", "author_presence"],
    "deletedItems": ["INVALID456"]
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Identifier translation failed: No suitable translators found for this identifier",
    "code": 422,
    "timestamp": "2024-12-19T10:30:00.000Z"
  }
}
```

### Error Codes

| Code | Description                                                  |
|------|--------------------------------------------------------------|
| 400  | Bad Request - Invalid identifier format or missing parameter |
| 422  | Unprocessable Entity - Translation failed                    |
| 500  | Internal Server Error - Library not editable or other error  |

## Identifier Type Detection

The endpoint automatically detects identifier types:

### DOI Detection

```javascript
if ('DOI' in extractedId && extractedId.DOI) {
  identifierType = 'DOI';
  identifierValue = extractedId.DOI;
}

// Examples:
// "10.1038/nature12345"
// "https://doi.org/10.1038/nature12345"
// "doi:10.1038/nature12345"
```

### PMID Detection

```javascript
if ('PMID' in extractedId && extractedId.PMID) {
  identifierType = 'PMID';
  identifierValue = extractedId.PMID;
}

// Examples:
// "12345678"
// "PMID:12345678"
// "PMID 12345678"
```

### ArXiv Detection

```javascript
if ('arXiv' in extractedId && extractedId.arXiv) {
  identifierType = 'ARXIV';
  identifierValue = extractedId.arXiv;
}

// Examples:
// "2301.12345"
// "arXiv:2301.12345"
// "https://arxiv.org/abs/2301.12345"
```

### ISBN Detection

```javascript
if ('ISBN' in extractedId && extractedId.ISBN) {
  identifierType = 'ISBN';
  identifierValue = extractedId.ISBN;
}

// Examples:
// "978-0-123-45678-9"
// "ISBN:978-0-123-45678-9"
// "ISBN 978-0-123-45678-9"
```

## Processing Flow

### 1. Request Validation
- Validates identifier parameter presence
- Checks library editability

### 2. Identifier Extraction
```javascript
const extractedIdentifiers = Zotero.Utilities.extractIdentifiers(identifier);
// Returns: [{DOI: "10.1038/nature12345"}] or [{PMID: "12345678"}] etc.
```

### 3. Identifier Type Determination
- Analyzes extracted identifier structure
- Determines type (DOI, PMID, ArXiv, ISBN, etc.)
- Extracts clean identifier value

### 4. Existing Item Check
For each recognized identifier:
1. Search library for items with matching identifier
2. Use type-specific search strategies:
   - **DOI**: Direct field match
   - **PMID**: Extra field contains "PMID: {value}"
   - **ArXiv**: Extra field contains "arXiv:{value}"
   - **ISBN**: Direct field match
3. Return existing item if found (no new item created)

### 5. Identifier Translation
If no existing item found:
1. Create Zotero.Translate.Search instance
2. Set identifier using `setIdentifier()`
3. Get available translators
4. Use best available translator (usually first by priority)
5. Execute translation
6. Create item(s) in Zotero library

### 6. Quality Validation
For each translated item:
- **Title Validation**: Reject items with invalid titles
- **Author Validation**: Ensure at least one valid creator exists
- **Automatic Cleanup**: Delete items that fail validation
- **Quality Reporting**: Log validation decisions

### 7. Duplicate Detection
For each valid item:
1. Perfect identifier matching (DOI, ISBN, PMID, ArXiv)
2. Fuzzy title + author + year matching
3. Automatic handling based on similarity score
4. "Oldest item wins" principle for merges

### 8. Response Building
- Include all created/found items
- Add duplicate detection results
- Include quality control information
- Provide metadata and API links

## Usage Examples

### Basic DOI Processing

```bash
curl -X POST http://localhost:23119/citationlinker/processidentifier \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "10.1038/s41586-023-12345-6"
  }'
```

### PMID Processing

```bash
curl -X POST http://localhost:23119/citationlinker/processidentifier \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "PMID:12345678"
  }'
```

### ArXiv Processing

```bash
curl -X POST http://localhost:23119/citationlinker/processidentifier \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "arXiv:2301.12345"
  }'
```

### Using with JavaScript

```javascript
async function processIdentifier(identifier) {
  const response = await fetch('http://localhost:23119/citationlinker/processidentifier', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`Processed ${data.itemCount} item(s)`);
    console.log(`Method: ${data.method}`);
    console.log(`Translator: ${data.translator}`);
    
    if (data.method === 'existing_item') {
      console.log('✅ Item already exists in library');
      const info = data.duplicateInfo.identifierInfo;
      console.log(`   ${info.identifierType}: ${info.identifierValue}`);
    } else {
      console.log('✨ New item created');
    }
    
    data.items.forEach(item => {
      console.log(`\nTitle: ${item.title || item.data?.title}`);
      console.log(`Key: ${item.key}`);
      console.log(`Type: ${item.itemType || item.data?.itemType}`);
      
      if (item._meta) {
        console.log(`Citation: ${item._meta.citation}`);
        console.log(`API URL: ${item._meta.apiUrl}`);
      }
      
      // Get identifier from item
      const doi = item.DOI || item.data?.DOI;
      const pmid = (item.extra || item.data?.extra || '')
        .match(/PMID:\s*(\d+)/)?.[1];
      
      if (doi) console.log(`DOI: ${doi}`);
      if (pmid) console.log(`PMID: ${pmid}`);
    });
    
    // Check for duplicates
    if (data.duplicateInfo.duplicateCount > 0) {
      console.log(`\n⚠️  Found ${data.duplicateInfo.duplicateCount} potential duplicates`);
      data.duplicateInfo.candidates?.forEach(dup => {
        console.log(`   Score: ${dup.score}, Reason: ${dup.reason}`);
      });
    }
    
    // Check quality control
    if (data.qualityControl && data.qualityControl.itemsRejected > 0) {
      console.log(`\n❌ Rejected ${data.qualityControl.itemsRejected} invalid items`);
      data.qualityControl.rejectionReasons?.forEach(reason => {
        console.log(`   ${reason}`);
      });
    }
  } else {
    console.error('❌ Processing failed:', data.error.message);
  }
  
  return data;
}

// Example usage
processIdentifier('10.1038/s41586-023-12345-6');
processIdentifier('PMID:12345678');
processIdentifier('arXiv:2301.12345');
```

### Using with Python

```python
import requests
import json

def process_identifier(identifier):
    """Process identifier and save to Zotero library."""
    endpoint = 'http://localhost:23119/citationlinker/processidentifier'
    
    response = requests.post(
        endpoint,
        headers={'Content-Type': 'application/json'},
        json={'identifier': identifier}
    )
    
    data = response.json()
    
    if data.get('success'):
        print(f"✅ Processed {data['itemCount']} item(s)")
        print(f"Method: {data['method']}")
        print(f"Translator: {data['translator']}")
        
        if data['method'] == 'existing_item':
            info = data['duplicateInfo']['identifierInfo']
            print(f"\n📚 Item already exists:")
            print(f"   {info['identifierType']}: {info['identifierValue']}")
        else:
            print("\n✨ New item created")
        
        for item in data['items']:
            # Handle both response formats
            item_data = item.get('data', item)
            
            print(f"\nTitle: {item_data.get('title', 'N/A')}")
            print(f"Type: {item_data.get('itemType', 'N/A')}")
            print(f"Key: {item.get('key', 'N/A')}")
            
            if '_meta' in item:
                print(f"Citation: {item['_meta'].get('citation', 'N/A')}")
                print(f"API URL: {item['_meta'].get('apiUrl', 'N/A')}")
            
            # Extract identifiers
            doi = item_data.get('DOI')
            extra = item_data.get('extra', '')
            pmid_match = re.search(r'PMID:\s*(\d+)', extra)
            arxiv_match = re.search(r'arXiv:\s*([\d.]+)', extra)
            
            if doi:
                print(f"DOI: {doi}")
            if pmid_match:
                print(f"PMID: {pmid_match.group(1)}")
            if arxiv_match:
                print(f"ArXiv: {arxiv_match.group(1)}")
        
        # Check for duplicates
        if data['duplicateInfo']['duplicateCount'] > 0:
            print(f"\n⚠️  Found {data['duplicateInfo']['duplicateCount']} potential duplicates")
            for candidate in data['duplicateInfo'].get('candidates', []):
                print(f"  - Score: {candidate['score']}, Reason: {candidate['reason']}")
        
        # Check quality control
        if 'qualityControl' in data:
            qc = data['qualityControl']
            if qc.get('itemsRejected', 0) > 0:
                print(f"\n❌ Rejected {qc['itemsRejected']} invalid items:")
                for reason in qc.get('rejectionReasons', []):
                    print(f"  - {reason}")
    else:
        print(f"❌ Processing failed: {data['error']['message']}")
    
    return data

# Example usage
import re

process_identifier('10.1038/s41586-023-12345-6')
process_identifier('PMID:12345678')
process_identifier('arXiv:2301.12345')
```

### Batch Processing Identifiers

```javascript
async function batchProcessIdentifiers(identifiers) {
  const results = {
    success: [],
    failed: [],
    existing: [],
    duplicates: [],
    rejected: []
  };
  
  for (const identifier of identifiers) {
    try {
      console.log(`\nProcessing: ${identifier}`);
      const data = await processIdentifier(identifier);
      
      if (data.success) {
        const result = {
          identifier,
          itemKey: data.items[0]?.key,
          method: data.method,
          title: data.items[0]?.title || data.items[0]?.data?.title
        };
        
        if (data.method === 'existing_item') {
          results.existing.push(result);
          console.log('  ✓ Already in library');
        } else {
          results.success.push(result);
          console.log('  ✓ Added to library');
        }
        
        if (data.duplicateInfo.duplicateCount > 0) {
          results.duplicates.push({
            identifier,
            duplicateCount: data.duplicateInfo.duplicateCount
          });
          console.log(`  ⚠️  ${data.duplicateInfo.duplicateCount} duplicates found`);
        }
        
        if (data.qualityControl?.itemsRejected > 0) {
          results.rejected.push({
            identifier,
            rejectedCount: data.qualityControl.itemsRejected,
            reasons: data.qualityControl.rejectionReasons
          });
          console.log(`  ❌ ${data.qualityControl.itemsRejected} items rejected`);
        }
      } else {
        results.failed.push({
          identifier,
          error: data.error.message
        });
        console.log(`  ✗ Failed: ${data.error.message}`);
      }
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.failed.push({
        identifier,
        error: error.message
      });
      console.log(`  ✗ Error: ${error.message}`);
    }
  }
  
  // Print summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('BATCH PROCESSING SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ New items created: ${results.success.length}`);
  console.log(`📚 Already in library: ${results.existing.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`🔁 Items with duplicates: ${results.duplicates.length}`);
  console.log(`⚠️  Items with rejections: ${results.rejected.length}`);
  console.log('='.repeat(50));
  
  return results;
}

// Example usage
const identifiers = [
  '10.1038/s41586-023-12345-6',
  'PMID:12345678',
  'arXiv:2301.12345',
  '10.1126/science.abc1234',
  'PMID:87654321'
];

batchProcessIdentifiers(identifiers);
```

### Extract Identifier from Text

```javascript
async function processTextForIdentifiers(text) {
  // Extract identifiers using regex
  const doiRegex = /10\.\d{4,}(?:\.\d+)*\/[-._;()/:a-zA-Z0-9]+/g;
  const pmidRegex = /PMID[:\s]*(\d{7,8})/gi;
  const arxivRegex = /arXiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)/gi;
  
  const dois = text.match(doiRegex) || [];
  const pmids = [...text.matchAll(pmidRegex)].map(m => m[1]);
  const arxivs = [...text.matchAll(arxivRegex)].map(m => m[1]);
  
  const allIdentifiers = [
    ...dois,
    ...pmids.map(p => `PMID:${p}`),
    ...arxivs.map(a => `arXiv:${a}`)
  ];
  
  console.log(`Found ${allIdentifiers.length} identifiers in text`);
  
  // Process all identifiers
  return await batchProcessIdentifiers(allIdentifiers);
}

// Example usage
const text = `
  Recent studies (DOI: 10.1038/nature12345, PMID: 12345678)
  have shown promising results. See also arXiv:2301.12345
  for preliminary data.
`;

processTextForIdentifiers(text);
```

### Integration with Bibliography Manager

```javascript
class ZoteroBibliographyManager {
  constructor(baseUrl = 'http://localhost:23119/citationlinker') {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }
  
  async addByIdentifier(identifier) {
    // Check cache first
    if (this.cache.has(identifier)) {
      console.log('Using cached result');
      return this.cache.get(identifier);
    }
    
    // Process identifier
    const result = await this.processIdentifier(identifier);
    
    // Cache successful results
    if (result.success) {
      this.cache.set(identifier, result);
    }
    
    return result;
  }
  
  async processIdentifier(identifier) {
    const response = await fetch(`${this.baseUrl}/processidentifier`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ identifier })
    });
    
    return await response.json();
  }
  
  async addMultiple(identifiers, options = {}) {
    const {
      skipExisting = true,
      delayMs = 1000,
      onProgress = null
    } = options;
    
    const results = [];
    
    for (let i = 0; i < identifiers.length; i++) {
      const identifier = identifiers[i];
      
      if (onProgress) {
        onProgress(i + 1, identifiers.length, identifier);
      }
      
      try {
        const result = await this.addByIdentifier(identifier);
        
        if (skipExisting && result.method === 'existing_item') {
          console.log(`Skipping existing: ${identifier}`);
        }
        
        results.push({
          identifier,
          success: result.success,
          method: result.method,
          itemKey: result.items?.[0]?.key
        });
        
        // Rate limiting
        if (i < identifiers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        results.push({
          identifier,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  async getBibliographyEntry(identifier) {
    const result = await this.addByIdentifier(identifier);
    
    if (result.success) {
      const item = result.items[0];
      const meta = item._meta || {};
      
      return {
        inlineCitation: meta.citation,
        fullCitation: this.generateFullCitation(item),
        apiUrl: meta.apiUrl,
        itemKey: item.key
      };
    }
    
    return null;
  }
  
  generateFullCitation(item) {
    const data = item.data || item;
    const creators = data.creators || [];
    const authorNames = creators
      .filter(c => c.creatorType === 'author')
      .map(c => c.lastName || c.name)
      .join(', ');
    
    const year = data.date ? data.date.split('-')[0] : 'n.d.';
    const title = data.title || 'Untitled';
    const journal = data.publicationTitle || '';
    const volume = data.volume ? `${data.volume}` : '';
    const issue = data.issue ? `(${data.issue})` : '';
    const pages = data.pages ? `, ${data.pages}` : '';
    const doi = data.DOI ? ` https://doi.org/${data.DOI}` : '';
    
    return `${authorNames} (${year}). ${title}. ${journal}, ${volume}${issue}${pages}.${doi}`;
  }
}

// Example usage
const bibManager = new ZoteroBibliographyManager();

// Add single identifier
const result = await bibManager.addByIdentifier('10.1038/nature12345');

// Add multiple identifiers with progress
const identifiers = [
  '10.1038/nature12345',
  'PMID:12345678',
  'arXiv:2301.12345'
];

const results = await bibManager.addMultiple(identifiers, {
  skipExisting: true,
  delayMs: 1500,
  onProgress: (current, total, id) => {
    console.log(`Processing ${current}/${total}: ${id}`);
  }
});

// Get bibliography entry
const bibEntry = await bibManager.getBibliographyEntry('10.1038/nature12345');
console.log(bibEntry.fullCitation);
```

## Identifier-Specific Considerations

### DOI

**Advantages**:
- Highest quality metadata
- Most reliable translator
- Wide coverage (journals, conferences, books)
- Persistent and stable

**Considerations**:
- Some publishers may have incomplete metadata
- CrossRef API rate limits (usually not an issue for individual requests)

**Translation Source**: CrossRef API via DOI Content Negotiation

### PMID/PMC

**Advantages**:
- High-quality biomedical metadata
- Comprehensive author information
- MeSH terms and keywords

**Considerations**:
- Limited to biomedical literature
- Some items may not have full metadata
- PMC IDs may resolve differently than PMIDs

**Translation Source**: PubMed/NCBI databases

### ArXiv

**Advantages**:
- Good metadata for preprints
- Fast and reliable
- Version tracking

**Considerations**:
- May lack final publication information
- Journal information added later
- Version numbers may affect matching

**Translation Source**: ArXiv.org API

### ISBN

**Advantages**:
- Comprehensive book metadata
- Publisher information
- Edition details

**Considerations**:
- May require WorldCat access for some books
- Multiple editions can cause confusion
- Not all books have ISBNs

**Translation Source**: WorldCat, Library of Congress, Google Books

## Quality Validation Details

### Title Validation

**Rejected Patterns**:
```javascript
const forbiddenTitlePatterns = [
  /^untitled$/i,
  /^no\s*title$/i,
  /^unknown$/i,
  /^placeholder$/i,
  /^document$/i,
  /^\s*$/
];
```

**Minimum Length**: 3 characters

### Author Validation

**Requirements**:
- At least one creator
- Creator must have meaningful name
- Name length ≥ 2 characters

**Rejected Patterns**:
```javascript
const forbiddenAuthorPatterns = [
  /^unknown$/i,
  /^anonymous$/i,
  /^\[s\.n\.\]$/i,
  /^n\/a$/i,
  /^\s*$/
];
```

### Automatic Cleanup

When items fail validation:
1. Item marked as invalid
2. Item deleted using `eraseTx()`
3. Deletion logged with reason
4. Validation report includes rejection details
5. Response includes quality control information

## Duplicate Detection

### Perfect Identifier Matching

The endpoint checks for existing items before translation:

**DOI Matching**:
```javascript
const search = new Zotero.Search();
search.addCondition('DOI', 'is', doi);
search.addCondition('itemType', 'isNot', 'attachment');
search.addCondition('itemType', 'isNot', 'note');
const itemIDs = await search.search();
```

**PMID Matching**:
```javascript
const search = new Zotero.Search();
search.addCondition('extra', 'contains', `PMID: ${pmid}`);
// Filter for exact match
const items = potentialItems.filter(item => {
  const extra = item.getField('extra') || '';
  const match = extra.match(/PMID:\s*(\d+)/i);
  return match && match[1] === pmid;
});
```

**ArXiv Matching**:
```javascript
const search = new Zotero.Search();
search.addCondition('extra', 'contains', `arXiv:${arxivId}`);
// Similar exact match filtering
```

### Post-Translation Duplicate Detection

After translation, if no pre-existing item was found:
1. Fuzzy matching on title + author + year
2. URL normalization and comparison
3. Additional identifier checks
4. Automatic handling based on similarity scores

## Error Handling

### Common Errors

#### No Translators Found

**Error**: `"No suitable translators found for this identifier"`

**Causes**:
- Invalid identifier format
- Identifier doesn't exist in databases
- Network issues preventing API access
- Unsupported identifier type

**Solutions**:
- Verify identifier format
- Try different identifier format (with/without prefix)
- Check identifier existence in source database
- Use `/detectidentifier` to check translator availability

#### Invalid Identifier

**Error**: `"No valid identifiers found in the provided string"`

**Causes**:
- Malformed identifier
- Typo in identifier
- Unsupported identifier type
- Special characters causing parsing issues

**Solutions**:
- Check identifier format against examples
- Remove special formatting characters
- Try clean identifier without prefix
- Consult identifier source for correct format

#### Translation Failed

**Error**: `"Translation completed but no items were created"`

**Causes**:
- Translator executed but returned no items
- Metadata missing or incomplete in source
- Network timeout during translation
- API rate limiting

**Solutions**:
- Retry the request after brief delay
- Try alternative identifier (DOI vs PMID)
- Check source database for item existence
- Verify Zotero translator is up to date

### Error Recovery Pattern

```javascript
async function processIdentifierWithFallback(identifier) {
  try {
    // Try primary identifier
    const result = await processIdentifier(identifier);
    if (result.success) return result;
    
    // If DOI failed, try extracting PMID or vice versa
    const alternativeIds = await extractAlternativeIdentifiers(identifier);
    
    for (const altId of alternativeIds) {
      try {
        const altResult = await processIdentifier(altId);
        if (altResult.success) return altResult;
      } catch (error) {
        console.log(`Alternative identifier ${altId} also failed`);
      }
    }
    
    throw new Error('All identifier translation attempts failed');
  } catch (error) {
    console.error('Error processing identifier:', error);
    throw error;
  }
}

async function extractAlternativeIdentifiers(identifier) {
  // If DOI provided, try to get PMID from CrossRef
  // If PMID provided, try to get DOI from PubMed
  // etc.
  const alternatives = [];
  
  if (identifier.includes('10.')) {
    // DOI provided, try CrossRef API for PMID
    const pmid = await getPMIDFromDOI(identifier);
    if (pmid) alternatives.push(`PMID:${pmid}`);
  } else if (identifier.includes('PMID') || /^\d{7,8}$/.test(identifier)) {
    // PMID provided, try PubMed API for DOI
    const doi = await getDOIFromPMID(identifier);
    if (doi) alternatives.push(doi);
  }
  
  return alternatives;
}
```

## Performance Considerations

### Response Times

- **Library Lookup**: < 1 second
- **DOI Translation**: 1-3 seconds
- **PMID Translation**: 2-4 seconds
- **ArXiv Translation**: 1-2 seconds
- **ISBN Translation**: 3-10 seconds (varies by source)
- **Duplicate Detection**: 1-2 seconds
- **Quality Validation**: < 1 second

### Optimization Tips

1. **Check Existing First**: Use pre-translation library lookup to avoid redundant API calls
2. **Batch Processing**: Add delays between requests (1-2 seconds minimum)
3. **Cache Results**: Cache successful translations to avoid reprocessing
4. **Use Preview**: Consider `/previewidentifier` for validation before committing
5. **Prefer DOI**: DOI translation is usually fastest and most reliable

## Related Endpoints

- **`/citationlinker/previewidentifier`**: Preview identifier translation without saving
- **`/citationlinker/detectidentifier`**: Check if identifier has available translators
- **`/citationlinker/processurl`**: Process URL (may contain identifier)
- **`/citationlinker/analyzeurl`**: Extract identifiers from URL

## Best Practices

1. **Validate Identifiers**: Check identifier format before processing
2. **Handle Existing Items**: Check response method to avoid duplicate processing
3. **Implement Retries**: Use exponential backoff for failed requests
4. **Monitor Quality**: Check `qualityControl` in responses for rejected items
5. **Review Duplicates**: Manually review items flagged as possible duplicates
6. **Use Appropriate Identifier**: Prefer DOI when available for best quality
7. **Rate Limit**: Don't exceed 1-2 requests per second for batch processing
8. **Cache Results**: Store successful translations to avoid repeated API calls

## Troubleshooting

### Item Created But Missing Metadata

**Problem**: Item created but has incomplete metadata

**Solutions**:
- Check source database for completeness
- Try alternative identifier (DOI vs PMID)
- Manually enrich metadata after import
- Report translator issues if consistently incomplete

### Duplicate Not Detected

**Problem**: Duplicate item created despite existing item

**Solutions**:
- Check if identifiers match exactly
- Verify identifier field is populated correctly
- Check Extra field for PMID/ArXiv formatting
- Consider adjusting duplicate detection thresholds

### Quality Validation Too Strict

**Problem**: Valid items being rejected

**Solutions**:
- Review rejection reasons in response
- Check if translator provides minimal metadata
- Consider adjusting validation criteria
- Report translator quality issues

## Limitations

1. **Translator Dependent**: Quality depends on available Zotero translators
2. **Network Required**: Requires network access for API calls
3. **Database Coverage**: Limited to identifiers in source databases
4. **Single Library**: Can only save to one library at a time
5. **No Batch Endpoint**: Must process identifiers individually
6. **Rate Limiting**: Subject to source API rate limits

## Version History

- **v1.5.0**: Enhanced duplicate detection and quality validation
  - Pre-translation identifier lookup
  - Automatic quality validation
  - Comprehensive duplicate detection
  - Detailed quality control reporting

- **v1.4.0**: Improved identifier support
  - Added ISBN and ISSN support
  - Better identifier extraction
  - Multiple identifier format support

- **v1.3.0**: Duplicate detection
  - Perfect identifier matching
  - Fuzzy matching
  - Automatic merge handling

- **v1.0.0**: Initial implementation
  - DOI, PMID, ArXiv translation
  - Basic item creation


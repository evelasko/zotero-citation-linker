# PreviewIdentifier Endpoint Response Documentation

## Overview

The `/previewidentifier` endpoint translates bibliographic identifiers (DOI, PMID, ArXiv, ISBN, etc.) into complete metadata **without saving** to your Zotero library. It uses a capture-and-delete approach: items are temporarily created via Zotero's translation system, comprehensive metadata is extracted, and then the items are immediately deleted before returning the preview.

## Endpoint Details

- **Path**: `/citationlinker/previewidentifier`
- **Method**: POST
- **Content-Type**: application/json

## Request Format

```json
{
  "identifier": "10.1038/s41586-023-12345-6"
}
```

### Supported Identifier Types

- **DOI** (Digital Object Identifier): `10.1038/nature12345`, `doi:10.1126/science.abc123`
- **PMID** (PubMed ID): `12345678`, `PMID:12345678`
- **ArXiv ID**: `2301.12345`, `arXiv:2301.12345v1`
- **ISBN** (International Standard Book Number): `978-0-12-345678-9`, `ISBN-13: 978-0-12-345678-9`
- **ISSN** (International Standard Serial Number): `1234-5678`, `ISSN: 1234-567X`

## Response Structure

The endpoint returns a JSON object with the following structure:

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the translation succeeded (`true`) or failed (`false`) |
| `mode` | `string` | Always `"preview"` - indicates this is a preview-only response |
| `message` | `string` | Human-readable message about the operation result |
| `timestamp` | `string` | ISO 8601 timestamp when the preview was generated |
| `translator` | `string` | Name of the Zotero translator used (e.g., "DOI Content Negotiation") |
| `itemCount` | `number` | Number of items in the preview (typically 1) |
| `identifier` | `object` | Information about the processed identifier |
| `items` | `array` | Array of item metadata objects (see Item Metadata Structure below) |
| `_links` | `object` | Useful related links for documentation and processing |
| `_note` | `string` | Reminder that this is preview-only, not saved to library |

### Identifier Object

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string \| null` | Detected identifier type: `"DOI"`, `"PMID"`, `"ARXIV"`, `"ISBN"`, or `null` if undetected |
| `value` | `string \| null` | Extracted identifier value, or `null` if extraction failed |

### Links Object

| Field | Type | Description |
|-------|------|-------------|
| `documentation` | `string` | URL to plugin documentation |
| `processEndpoint` | `string` | Path to the corresponding endpoint to save items (`/citationlinker/processidentifier`) |

## Item Metadata Structure

Each item in the `items` array contains comprehensive bibliographic metadata:

### Core Identification Fields

| Field | Type | Description |
|-------|------|-------------|
| `itemKey` | `string` | Temporary Zotero item key (deleted after preview) |
| `itemType` | `string` | Zotero item type: `"journalArticle"`, `"book"`, `"conferencePaper"`, `"thesis"`, etc. |
| `libraryID` | `number` | Zotero library ID where item was temporarily created |

### Basic Bibliographic Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Full title of the work |
| `abstractNote` | `string` | Abstract or summary (may be empty) |
| `date` | `string` | Publication date (format varies: `"2023-05-15"`, `"2023"`, etc.) |
| `url` | `string` | Canonical URL for the work |
| `accessDate` | `string` | Date the metadata was accessed (ISO 8601) |
| `rights` | `string` | Copyright or license information |
| `extra` | `string` | Additional metadata (may contain PMID, original-date, etc.) |

### Identifier Fields

| Field | Type | Description |
|-------|------|-------------|
| `DOI` | `string` | Digital Object Identifier (e.g., `"10.1038/nature12345"`) |
| `ISBN` | `string` | International Standard Book Number (for books) |
| `ISSN` | `string` | International Standard Serial Number (for journals) |

### Publication Details

| Field | Type | Description |
|-------|------|-------------|
| `publicationTitle` | `string` | Journal, magazine, or book series name |
| `volume` | `string` | Volume number |
| `issue` | `string` | Issue number |
| `pages` | `string` | Page range (e.g., `"123-130"`, `"e1234"`) |
| `series` | `string` | Book series name |
| `seriesNumber` | `string` | Number in series |
| `edition` | `string` | Edition number or description |
| `place` | `string` | Place of publication (city, country) |
| `publisher` | `string` | Publisher name |

### Additional Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `language` | `string` | Language code (e.g., `"en"`, `"es"`, `"fr"`) |
| `callNumber` | `string` | Library call number |
| `archive` | `string` | Archive name |
| `archiveLocation` | `string` | Location within archive |
| `shortTitle` | `string` | Abbreviated title |

### Structured Data Fields

#### Creators Array

| Field | Type | Description |
|-------|------|-------------|
| `creators` | `array` | Array of creator objects (authors, editors, etc.) |

Each creator object contains:

```typescript
{
  creatorType: string,    // "author", "editor", "translator", etc.
  firstName: string,      // Given name(s)
  lastName: string,       // Family name
  name: string           // Full name (used when firstName/lastName not applicable)
}
```

#### Tags Array

| Field | Type | Description |
|-------|------|-------------|
| `tags` | `array` | Array of tag objects |

Each tag object contains:

```typescript
{
  tag: string,    // Tag text
  type: number    // Tag type (0 = user, 1 = automatic)
}
```

#### Collections Array

| Field | Type | Description |
|-------|------|-------------|
| `collections` | `array` | Array of collection IDs (empty for preview items) |

#### Relations Object

| Field | Type | Description |
|-------|------|-------------|
| `relations` | `object` | Related items and URIs (typically empty for preview items) |

### Generated Citation

| Field | Type | Description |
|-------|------|-------------|
| `generatedCitation` | `string \| null` | Auto-generated inline citation (e.g., `"(Smith et al., 2023)"`) or `null` if generation failed |

## Response Examples

### Example 1: Successful DOI Preview (Journal Article)

**Request:**

```bash
curl -X POST http://localhost:23119/citationlinker/previewidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "10.1038/s41586-023-06825-8"}'
```

**Response:**

```json
{
  "success": true,
  "mode": "preview",
  "message": "Identifier translated successfully - items not saved to library",
  "timestamp": "2024-01-15T14:32:18.000Z",
  "translator": "DOI Content Negotiation",
  "itemCount": 1,
  "identifier": {
    "type": "DOI",
    "value": "10.1038/s41586-023-06825-8"
  },
  "items": [
    {
      "itemKey": "TEMP9X2K4M",
      "itemType": "journalArticle",
      "libraryID": 1,
      "title": "A genomic mutational constraint map using variation in 76,156 human genomes",
      "abstractNote": "Genetic variants that are predicted to seriously disrupt protein structure or function are less common in the general population...",
      "date": "2023-12-06",
      "url": "https://www.nature.com/articles/s41586-023-06825-8",
      "accessDate": "2024-01-15T14:32:18Z",
      "DOI": "10.1038/s41586-023-06825-8",
      "ISSN": "1476-4687",
      "publicationTitle": "Nature",
      "volume": "625",
      "issue": "7993",
      "pages": "92-100",
      "language": "en",
      "rights": "",
      "extra": "",
      "callNumber": "",
      "archive": "",
      "archiveLocation": "",
      "shortTitle": "",
      "series": "",
      "seriesNumber": "",
      "edition": "",
      "place": "",
      "publisher": "Nature Publishing Group",
      "creators": [
        {
          "creatorType": "author",
          "firstName": "Siân",
          "lastName": "Caravan",
          "name": ""
        },
        {
          "creatorType": "author",
          "firstName": "Grace",
          "lastName": "Tiao",
          "name": ""
        },
        {
          "creatorType": "author",
          "firstName": "Nicholas",
          "lastName": "Lim",
          "name": ""
        }
      ],
      "tags": [
        {
          "tag": "Genomics",
          "type": 1
        },
        {
          "tag": "Genetics",
          "type": 1
        }
      ],
      "collections": [],
      "relations": {},
      "generatedCitation": "(Caravan et al., 2023)"
    }
  ],
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "processEndpoint": "/citationlinker/processidentifier"
  },
  "_note": "This is a preview only. Use /processidentifier to save items to your library."
}
```

### Example 2: PMID Preview (Medical Article)

**Request:**

```bash
curl -X POST http://localhost:23119/citationlinker/previewidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "PMID:38000123"}'
```

**Response:**

```json
{
  "success": true,
  "mode": "preview",
  "message": "Identifier translated successfully - items not saved to library",
  "timestamp": "2024-01-15T14:35:42.000Z",
  "translator": "PMID",
  "itemCount": 1,
  "identifier": {
    "type": "PMID",
    "value": "38000123"
  },
  "items": [
    {
      "itemKey": "TEMPA7B3C9",
      "itemType": "journalArticle",
      "libraryID": 1,
      "title": "Targeting cancer stem cells: a new paradigm in cancer treatment",
      "abstractNote": "Cancer stem cells (CSCs) represent a small subpopulation of tumor cells...",
      "date": "2023-11-15",
      "url": "https://pubmed.ncbi.nlm.nih.gov/38000123/",
      "accessDate": "2024-01-15T14:35:42Z",
      "DOI": "10.1016/j.cell.2023.11.020",
      "publicationTitle": "Cell",
      "volume": "186",
      "issue": "24",
      "pages": "5234-5251",
      "language": "eng",
      "extra": "PMID: 38000123",
      "rights": "",
      "ISBN": "",
      "ISSN": "0092-8674",
      "callNumber": "",
      "archive": "",
      "archiveLocation": "",
      "shortTitle": "",
      "series": "",
      "seriesNumber": "",
      "edition": "",
      "place": "",
      "publisher": "",
      "creators": [
        {
          "creatorType": "author",
          "firstName": "Maria",
          "lastName": "Rodriguez",
          "name": ""
        },
        {
          "creatorType": "author",
          "firstName": "John",
          "lastName": "Smith",
          "name": ""
        }
      ],
      "tags": [
        {
          "tag": "Cancer Stem Cells",
          "type": 1
        },
        {
          "tag": "Targeted Therapy",
          "type": 1
        }
      ],
      "collections": [],
      "relations": {},
      "generatedCitation": "(Rodriguez & Smith, 2023)"
    }
  ],
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "processEndpoint": "/citationlinker/processidentifier"
  },
  "_note": "This is a preview only. Use /processidentifier to save items to your library."
}
```

### Example 3: ArXiv Preview (Preprint)

**Request:**

```bash
curl -X POST http://localhost:23119/citationlinker/previewidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "2301.07041"}'
```

**Response:**

```json
{
  "success": true,
  "mode": "preview",
  "message": "Identifier translated successfully - items not saved to library",
  "timestamp": "2024-01-15T14:38:15.000Z",
  "translator": "arXiv.org",
  "itemCount": 1,
  "identifier": {
    "type": "ARXIV",
    "value": "2301.07041"
  },
  "items": [
    {
      "itemKey": "TEMPX9Y2Z1",
      "itemType": "preprint",
      "libraryID": 1,
      "title": "Attention Is All You Need: Transformers for Natural Language Processing",
      "abstractNote": "We introduce a novel neural network architecture based solely on attention mechanisms...",
      "date": "2023-01-17",
      "url": "http://arxiv.org/abs/2301.07041",
      "accessDate": "2024-01-15T14:38:15Z",
      "DOI": "",
      "publicationTitle": "arXiv:2301.07041 [cs]",
      "volume": "",
      "issue": "",
      "pages": "",
      "language": "",
      "extra": "arXiv:2301.07041 [cs.CL]",
      "rights": "",
      "ISBN": "",
      "ISSN": "",
      "callNumber": "",
      "archive": "arXiv",
      "archiveLocation": "",
      "shortTitle": "",
      "series": "",
      "seriesNumber": "",
      "edition": "",
      "place": "",
      "publisher": "",
      "creators": [
        {
          "creatorType": "author",
          "firstName": "Jane",
          "lastName": "Chen",
          "name": ""
        },
        {
          "creatorType": "author",
          "firstName": "Robert",
          "lastName": "Williams",
          "name": ""
        }
      ],
      "tags": [
        {
          "tag": "Computer Science - Computation and Language",
          "type": 1
        }
      ],
      "collections": [],
      "relations": {},
      "generatedCitation": "(Chen & Williams, 2023)"
    }
  ],
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "processEndpoint": "/citationlinker/processidentifier"
  },
  "_note": "This is a preview only. Use /processidentifier to save items to your library."
}
```

### Example 4: ISBN Preview (Book)

**Request:**

```bash
curl -X POST http://localhost:23119/citationlinker/previewidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "978-0-262-03506-0"}'
```

**Response:**

```json
{
  "success": true,
  "mode": "preview",
  "message": "Identifier translated successfully - items not saved to library",
  "timestamp": "2024-01-15T14:40:28.000Z",
  "translator": "Library Catalog (ISBN)",
  "itemCount": 1,
  "identifier": {
    "type": "ISBN",
    "value": "978-0-262-03506-0"
  },
  "items": [
    {
      "itemKey": "TEMPM5N8P2",
      "itemType": "book",
      "libraryID": 1,
      "title": "Deep Learning",
      "abstractNote": "An introduction to a broad range of topics in deep learning, covering mathematical and conceptual background...",
      "date": "2016-11-18",
      "url": "https://www.deeplearningbook.org/",
      "accessDate": "2024-01-15T14:40:28Z",
      "DOI": "",
      "ISBN": "978-0-262-03506-0",
      "ISSN": "",
      "publicationTitle": "",
      "volume": "",
      "issue": "",
      "pages": "775",
      "language": "en",
      "extra": "",
      "rights": "",
      "callNumber": "",
      "archive": "",
      "archiveLocation": "",
      "shortTitle": "",
      "series": "Adaptive Computation and Machine Learning",
      "seriesNumber": "",
      "edition": "1",
      "place": "Cambridge, MA",
      "publisher": "MIT Press",
      "creators": [
        {
          "creatorType": "author",
          "firstName": "Ian",
          "lastName": "Goodfellow",
          "name": ""
        },
        {
          "creatorType": "author",
          "firstName": "Yoshua",
          "lastName": "Bengio",
          "name": ""
        },
        {
          "creatorType": "author",
          "firstName": "Aaron",
          "lastName": "Courville",
          "name": ""
        }
      ],
      "tags": [
        {
          "tag": "Machine Learning",
          "type": 1
        },
        {
          "tag": "Neural Networks",
          "type": 1
        }
      ],
      "collections": [],
      "relations": {},
      "generatedCitation": "(Goodfellow et al., 2016)"
    }
  ],
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "processEndpoint": "/citationlinker/processidentifier"
  },
  "_note": "This is a preview only. Use /processidentifier to save items to your library."
}
```

### Example 5: Translation Failed (Invalid Identifier)

**Request:**

```bash
curl -X POST http://localhost:23119/citationlinker/previewidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "invalid-doi-12345"}'
```

**Response:**

```json
{
  "success": false,
  "error": {
    "message": "Identifier translation failed: No valid identifiers found in the provided string",
    "code": 422,
    "timestamp": "2024-01-15T14:42:35.000Z"
  }
}
```

### Example 6: Translation Failed (No Translator Available)

**Request:**

```bash
curl -X POST http://localhost:23119/citationlinker/previewidentifier \
  -H "Content-Type: application/json" \
  -d '{"identifier": "10.9999/nonexistent.doi"}'
```

**Response:**

```json
{
  "success": false,
  "error": {
    "message": "Identifier translation failed: No suitable translators found for this identifier",
    "code": 422,
    "timestamp": "2024-01-15T14:45:12.000Z"
  }
}
```

### Example 7: Validation Error (Missing Identifier)

**Request:**

```bash
curl -X POST http://localhost:23119/citationlinker/previewidentifier \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**

```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Missing required field: identifier",
    "timestamp": "2024-01-15T14:46:52.000Z"
  }
}
```

## Item Type Variations

The `itemType` field can be one of many Zotero item types. Common types include:

### Academic Publications

- `journalArticle` - Journal, magazine, or newspaper article
- `conferencePaper` - Conference or proceedings paper
- `book` - Complete book
- `bookSection` - Chapter or section within a book
- `thesis` - Master's thesis or PhD dissertation
- `preprint` - Preprint or working paper

### Other Types

- `report` - Technical or research report
- `patent` - Patent document
- `webpage` - Web page or blog post
- `manuscript` - Unpublished manuscript
- `presentation` - Conference presentation or talk

Each item type may have different available fields. For example:

- **Books** have `publisher`, `place`, `edition`, `series`
- **Journal articles** have `publicationTitle`, `volume`, `issue`, `pages`
- **Conference papers** have `conferenceName`, `proceedingsTitle`
- **Theses** have `university`, `thesisType`

## Client Integration Guide

### Basic Preview Workflow

```typescript
// Preview an identifier before saving
async function previewIdentifier(identifier: string) {
  const response = await fetch('http://localhost:23119/citationlinker/previewidentifier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  })
  
  const preview = await response.json()
  
  if (preview.success) {
    const item = preview.items[0]
    console.log(`Title: ${item.title}`)
    console.log(`Authors: ${formatAuthors(item.creators)}`)
    console.log(`Citation: ${item.generatedCitation}`)
    console.log(`Type: ${item.itemType}`)
    
    // Show preview to user and ask if they want to save
    if (await userConfirmsSave()) {
      // Use processidentifier endpoint to actually save
      await saveIdentifier(identifier)
    }
  } else {
    console.error('Preview failed:', preview.error.message)
  }
}

function formatAuthors(creators: any[]): string {
  const authors = creators.filter(c => c.creatorType === 'author')
  if (authors.length === 0) return 'Unknown'
  if (authors.length === 1) return `${authors[0].lastName}`
  if (authors.length === 2) return `${authors[0].lastName} & ${authors[1].lastName}`
  return `${authors[0].lastName} et al.`
}
```

### Extract Specific Metadata

```typescript
// Extract just the metadata you need
function extractCitationData(previewResponse: any) {
  const item = previewResponse.items[0]
  
  return {
    citation: item.generatedCitation,
    title: item.title,
    year: item.date ? new Date(item.date).getFullYear() : null,
    doi: item.DOI || null,
    authors: item.creators
      .filter((c: any) => c.creatorType === 'author')
      .map((c: any) => ({
        first: c.firstName,
        last: c.lastName
      })),
    journal: item.publicationTitle || null,
    abstract: item.abstractNote || null,
    url: item.url || null
  }
}
```

### Batch Preview (Multiple Identifiers)

```typescript
// Preview multiple identifiers in parallel
async function previewMultipleIdentifiers(identifiers: string[]) {
  const previews = await Promise.all(
    identifiers.map(id => 
      fetch('http://localhost:23119/citationlinker/previewidentifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id })
      }).then(r => r.json())
    )
  )
  
  // Filter successful previews
  const successful = previews.filter(p => p.success)
  const failed = previews.filter(p => !p.success)
  
  console.log(`${successful.length} previews succeeded`)
  console.log(`${failed.length} previews failed`)
  
  return { successful, failed }
}
```

### Compare Preview vs Saved Item

```typescript
// Preview before saving, then compare
async function previewAndSave(identifier: string) {
  // 1. Get preview
  const previewRes = await fetch('http://localhost:23119/citationlinker/previewidentifier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  })
  const preview = await previewRes.json()
  
  if (!preview.success) {
    throw new Error('Preview failed')
  }
  
  console.log('Preview:', preview.items[0].title)
  
  // 2. Actually save
  const saveRes = await fetch('http://localhost:23119/citationlinker/processidentifier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier })
  })
  const saved = await saveRes.json()
  
  console.log('Saved:', saved.items[0].title)
  console.log('Item key:', saved.items[0].key)
  
  return saved.items[0]
}
```

### Error Handling Best Practices

```typescript
async function robustPreview(identifier: string) {
  try {
    const response = await fetch('http://localhost:23119/citationlinker/previewidentifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    })
    
    // Check HTTP status
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error('Invalid request - check identifier format')
      } else if (response.status === 422) {
        throw new Error('Identifier could not be translated')
      } else if (response.status === 500) {
        throw new Error('Server error - try again later')
      }
    }
    
    const preview = await response.json()
    
    // Check response success field
    if (!preview.success) {
      throw new Error(preview.error?.message || 'Preview failed')
    }
    
    // Validate essential fields
    if (!preview.items || preview.items.length === 0) {
      throw new Error('No items in preview')
    }
    
    const item = preview.items[0]
    if (!item.title || item.title.trim() === '') {
      console.warn('Preview succeeded but item has no title')
    }
    
    return preview
    
  } catch (error) {
    console.error('Preview error:', error)
    throw error
  }
}
```

## Use Cases

### 1. Preview Before Import

Show users what will be imported before committing to their library:

```typescript
// Display preview modal
const preview = await previewIdentifier(userDOI)
displayModal({
  title: preview.items[0].title,
  authors: formatAuthors(preview.items[0].creators),
  journal: preview.items[0].publicationTitle,
  year: new Date(preview.items[0].date).getFullYear(),
  action: 'Import to Library'
})
```

### 2. Metadata Extraction for External Systems

Extract citation metadata without cluttering Zotero library:

```typescript
// Extract metadata for custom database
const preview = await previewIdentifier(doi)
const metadata = {
  title: preview.items[0].title,
  abstract: preview.items[0].abstractNote,
  keywords: preview.items[0].tags.map(t => t.tag),
  citation: preview.items[0].generatedCitation
}
saveToDatabase(metadata)
```

### 3. Identifier Validation

Verify identifiers are valid and retrievable:

```typescript
// Batch validate identifiers
const results = await Promise.all(
  dois.map(async doi => ({
    doi,
    valid: await previewIdentifier(doi).then(() => true).catch(() => false)
  }))
)
console.log(`${results.filter(r => r.valid).length} valid DOIs`)
```

### 4. Citation Format Comparison

Test different citation styles without saving:

```typescript
// Preview gives you the data to format as needed
const preview = await previewIdentifier(doi)
const item = preview.items[0]

console.log('APA:', formatAPA(item))
console.log('MLA:', formatMLA(item))
console.log('Chicago:', formatChicago(item))
```

## Performance Considerations

- **Translation Time**: Varies by identifier type and source
  - DOI: 1-3 seconds (CrossRef/DataCite lookup)
  - PMID: 2-5 seconds (PubMed API)
  - ArXiv: 1-2 seconds (arXiv API)
  - ISBN: 3-7 seconds (library catalog lookup)

- **Network Dependency**: Requires internet connection for translation

- **Temporary Item Creation**: Items are created and deleted in Zotero
  - Library must be editable
  - Brief database write operations occur
  - Items never persist after response

- **Rate Limiting**: Subject to external API rate limits
  - CrossRef: ~50 requests/second
  - PubMed: ~3 requests/second
  - ArXiv: ~1 request/second

## Comparison: Preview vs Process

| Feature | `/previewidentifier` | `/processidentifier` |
|---------|---------------------|----------------------|
| **Creates Library Item** | ❌ No (deleted immediately) | ✅ Yes (saved permanently) |
| **Returns Metadata** | ✅ Full metadata | ✅ Full metadata + validation |
| **Duplicate Detection** | ❌ No | ✅ Yes |
| **Quality Validation** | ❌ No | ✅ Yes |
| **Use Case** | Preview, validation, extraction | Import to library |
| **Library Impact** | Temporary (0 items) | Permanent (+1 item) |
| **Response Time** | ~1-5 seconds | ~2-7 seconds |

**When to use Preview:**

- Testing identifier validity
- Extracting metadata for external use
- Showing preview to user before import
- Validating batch identifiers
- Building citation exports without Zotero

**When to use Process:**

- Actually importing to Zotero library
- Building personal reference collection
- Need duplicate detection
- Want quality validation
- Permanent storage required

## Related Endpoints

- **`/processidentifier`** - Save identifier to library (with validation & duplicate detection)
- **`/detectidentifier`** - Check if identifier has available translators
- **`/analyzeurl`** - Comprehensive URL analysis including identifier extraction
- **`/processurl`** - Translate URL using web translators

## Error Reference

| Error Code | Error Type | Description | Solution |
|------------|------------|-------------|----------|
| 400 | ValidationError | Missing or invalid identifier field | Provide valid `identifier` in request body |
| 422 | TranslationError | No valid identifiers found | Check identifier format (DOI, PMID, etc.) |
| 422 | TranslationError | No suitable translators found | Identifier may not be in translation databases |
| 500 | ServerError | Library not editable | Check Zotero library permissions |
| 500 | ServerError | Internal error | Check logs, try again later |

## Changelog

- **v1.5.0**: Initial release of preview identifier endpoint
- **v1.5.0**: Added comprehensive metadata extraction (30+ fields)
- **v1.5.0**: Added automatic citation generation
- **v1.5.0**: Implemented capture-and-delete workflow

## Technical Notes

### Why Capture-and-Delete?

Zotero's translation API (`Translate.Search`) doesn't support preview-only mode. Items must be created to extract full metadata. The capture-and-delete approach ensures:

1. **Full Metadata Access**: Complete item data from Zotero's translation system
2. **Clean Library**: Items immediately deleted, no clutter
3. **Reliable Citations**: Generated citations use Zotero's citation engine
4. **Type Safety**: Proper item type detection and field population

### Metadata Completeness

Not all fields are populated for every item type:

- **DOI records** typically have: title, authors, journal, volume, issue, pages, DOI, date
- **PMID records** include: abstract, MeSH terms (as tags), PMID in `extra` field
- **ArXiv records** have: arXiv ID, category, submission date, often no journal info
- **ISBN records** provide: publisher, place, ISBN, edition, often no abstract

Missing fields return empty strings (`""`) rather than `null` for consistency.

# API Preview PDF Endpoint

## Overview

The **Preview PDF Endpoint** (`/previewpdf`) accepts PDF file uploads, extracts metadata using Zotero's built-in PDFWorker, identifies embedded identifiers (DOI, ISBN, arXiv, PMID), and returns both the raw PDF data and found identifiers. No items are created in the library during this process.

This endpoint is designed for analyzing PDF files before deciding whether to import them into Zotero, making it ideal for validation, duplicate detection workflows, or automated PDF processing pipelines.

---

## Endpoint Details

- **URL**: `/citationlinker/previewpdf`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Authentication**: None (local server only)
- **Default Port**: `23119`

---

## Request Format

The endpoint accepts PDF files via multipart/form-data uploads. The PDF file should be sent as a file field in the multipart request.

**Important**: This endpoint **only** accepts `multipart/form-data` content type. Other content types like `application/json` or `application/pdf` will be rejected.

### Request Headers

```text
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

### Form Field

- **Field Name**: Any (e.g., `pdf`, `file`, `document`)
- **File Type**: PDF (`application/pdf`)
- **Max Size**: 50MB (configurable via preferences)

---

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "mode": "preview",
  "message": "PDF processed successfully",
  "timestamp": "2025-11-12T10:30:45.123Z",
  "fileInfo": {
    "filename": "research-paper.pdf",
    "size": 1234567,
    "contentType": "application/pdf"
  },
  "extraction": {
    "pageCount": 15,
    "pagesAnalyzed": 10,
    "textLength": 45678,
    "hasText": true,
    "textSample": "Title: Deep Learning for Image Recognition\nAbstract: This paper presents..."
  },
  "identifiers": [
    {
      "type": "DOI",
      "value": "10.1234/example.2024",
      "location": "page 1",
      "confidence": "high"
    },
    {
      "type": "ARXIV",
      "value": "2024.12345",
      "location": "page 1",
      "confidence": "high"
    },
    {
      "type": "PMID",
      "value": "12345678",
      "location": "page 2",
      "confidence": "medium"
    }
  ],
  "rawData": {
    "pages": [
      [1, [595, 842], [[50, 100, 200, 12, "Title: Research Paper", ...], ...]],
      [2, [595, 842], [[50, 100, 200, 12, "Introduction text...", ...], ...]]
    ],
    "metadata": {
      "title": "Research Paper",
      "author": "John Doe"
    }
  },
  "_links": {
    "documentation": "https://github.com/evelasko/zotero-citation-linker",
    "processIdentifier": "/citationlinker/processidentifier"
  },
  "_note": "This is a preview only. No items were created. Use identifiers with /processidentifier to save to library."
}
```

### Response Fields

#### `success` (boolean)

- Indicates whether the PDF was processed successfully

#### `mode` (string)

- Always `"preview"` for this endpoint

#### `message` (string)

- Human-readable status message

#### `timestamp` (string)

- ISO 8601 timestamp of when the response was generated

#### `fileInfo` (object)

- `filename`: Original filename of the uploaded PDF
- `size`: File size in bytes
- `contentType`: MIME type (always `application/pdf`)

#### `extraction` (object)

- `pageCount`: Total number of pages in the PDF
- `pagesAnalyzed`: Number of pages analyzed (limited by configuration)
- `textLength`: Total characters of text extracted
- `hasText`: Whether any text was found in the PDF
- `textSample`: First 500 characters of extracted text

#### `identifiers` (array)

Array of identified bibliographic identifiers. Each identifier has:

- `type`: Identifier type (`DOI`, `ISBN`, `ARXIV`, `PMID`)
- `value`: The identifier value (normalized)
- `location`: Page where the identifier was found
- `confidence`: Confidence level (`high`, `medium`, `low`)

#### `rawData` (object)

- `pages`: Raw page data from Zotero's PDFWorker (page number, dimensions, text blocks)
- `metadata`: PDF metadata if available (title, author, etc.)

---

## Error Responses

### 400 Bad Request - No PDF File

```json
{
  "success": false,
  "error": "No PDF file found in request. Please upload a PDF file."
}
```

### 400 Bad Request - Empty File

```json
{
  "success": false,
  "error": "PDF file is empty"
}
```

### 413 Payload Too Large

```json
{
  "success": false,
  "error": "PDF file too large. Maximum size: 50MB, received: 75.50MB"
}
```

### 422 Unprocessable Entity - Invalid PDF

```json
{
  "success": false,
  "error": "Invalid PDF file. The uploaded file does not appear to be a valid PDF."
}
```

### 422 Unprocessable Entity - Password Protected

```json
{
  "success": false,
  "error": "PDF is password-protected. Please provide an unencrypted PDF."
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to process PDF: [error details]"
}
```

---

## Usage Examples

### Example 1: Basic cURL Upload

```bash
curl -X POST \
  http://localhost:23119/citationlinker/previewpdf \
  -F "file=@/path/to/document.pdf"
```

### Example 2: Python with requests

```python
import requests

# Upload PDF file
with open('research-paper.pdf', 'rb') as f:
    response = requests.post(
        'http://localhost:23119/citationlinker/previewpdf',
        files={'pdf': f}
    )

# Parse response
result = response.json()

if result['success']:
    print(f"Found {len(result['identifiers'])} identifiers:")
    for identifier in result['identifiers']:
        print(f"  {identifier['type']}: {identifier['value']} ({identifier['confidence']})")
        
    # Extract DOI if present
    dois = [i['value'] for i in result['identifiers'] if i['type'] == 'DOI']
    if dois:
        print(f"\nDOI: {dois[0]}")
        
        # Now you can use /processidentifier to actually save this to Zotero
        process_response = requests.post(
            'http://localhost:23119/citationlinker/processidentifier',
            json={'identifier': dois[0]}
        )
        print("Item saved to Zotero:", process_response.json())
else:
    print(f"Error: {result['error']}")
```

### Example 3: JavaScript/Node.js with FormData

```javascript
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function previewPdf(filePath) {
  const form = new FormData();
  form.append('pdf', fs.createReadStream(filePath));

  try {
    const response = await axios.post(
      'http://localhost:23119/citationlinker/previewpdf',
      form,
      {
        headers: form.getHeaders()
      }
    );

    const result = response.data;
    
    console.log(`Extracted ${result.extraction.pageCount} pages`);
    console.log(`Found ${result.identifiers.length} identifiers:`);
    
    result.identifiers.forEach(id => {
      console.log(`  - ${id.type}: ${id.value}`);
    });

    return result;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
previewPdf('./research-paper.pdf');
```

### Example 4: Batch Processing Script

```python
import os
import requests
from pathlib import Path

def process_pdf_directory(directory):
    """Process all PDFs in a directory"""
    pdf_files = list(Path(directory).glob('*.pdf'))
    
    results = []
    for pdf_path in pdf_files:
        print(f"\nProcessing: {pdf_path.name}")
        
        with open(pdf_path, 'rb') as f:
            response = requests.post(
                'http://localhost:23119/citationlinker/previewpdf',
                files={'pdf': f}
            )
        
        if response.status_code == 200:
            result = response.json()
            
            # Collect PDFs with identifiers
            if result['identifiers']:
                results.append({
                    'filename': pdf_path.name,
                    'identifiers': result['identifiers'],
                    'pages': result['extraction']['pageCount']
                })
                print(f"  ✓ Found {len(result['identifiers'])} identifiers")
            else:
                print(f"  ⚠ No identifiers found")
        else:
            print(f"  ✗ Error: {response.status_code}")
    
    # Summary
    print(f"\n=== Summary ===")
    print(f"Total PDFs processed: {len(pdf_files)}")
    print(f"PDFs with identifiers: {len(results)}")
    
    return results

# Process all PDFs in a directory
results = process_pdf_directory('./papers')

# Save results to file
import json
with open('pdf_analysis.json', 'w') as f:
    json.dump(results, f, indent=2)
```

---

## Identifier Extraction

The endpoint uses sophisticated pattern matching to extract identifiers from PDF text:

### DOI (Digital Object Identifier)

- **Pattern**: `10.xxxx/...`
- **Confidence**: High on first 2 pages, medium elsewhere
- **Example**: `10.1234/example.2024.12345`

### ISBN (International Standard Book Number)

- **Pattern**: ISBN-10 or ISBN-13 formats
- **Validation**: Uses Zotero's `cleanISBN()` utility
- **Example**: `978-0-123456-78-9`

### arXiv Identifier

- **Pattern**: `arXiv:YYMM.NNNNN` or `YYMM.NNNNN`
- **Confidence**: High on first page, medium elsewhere
- **Example**: `2024.12345` or `arXiv:2024.12345v2`

### PMID (PubMed ID)

- **Pattern**: `PMID: ########` or `pubmed/########`
- **Confidence**: High for explicit PMID prefix, medium for URL patterns
- **Example**: `12345678`

---

## Configuration

### Preferences (set via Zotero preferences)

```javascript
// Maximum upload file size (bytes)
extensions.zotero-citation-linker.maxPdfUploadSize = 52428800  // 50MB

// Maximum pages to analyze for identifiers
extensions.zotero-citation-linker.maxPdfPagesToAnalyze = 10
```

---

## Limitations

### File Size

- **Default**: 50MB maximum
- **Rationale**: Prevents memory issues and timeout
- **Workaround**: Increase `maxPdfUploadSize` preference if needed

### Page Analysis

- **Default**: First 10 pages analyzed for identifiers
- **Rationale**: Most identifiers appear in first few pages; improves performance
- **Impact**: Full PDF text is still extracted, but identifier search is limited

### Scanned PDFs

- PDFs without embedded text (scanned images) will return no identifiers
- Use OCR software to add text layer before uploading
- The endpoint will still process but return empty `identifiers` array

### Password Protection

- Password-protected PDFs are not supported
- Remove encryption before uploading
- Returns 422 error with helpful message

### Concurrent Requests

- Zotero's PDFWorker processes requests sequentially
- Multiple simultaneous uploads will be queued automatically
- Consider implementing client-side rate limiting for batch processing

---

## Integration Workflow

### Typical Use Case: PDF Import Validation

```diagram
1. User/Script uploads PDF to /previewpdf
   ↓
2. Endpoint extracts metadata and identifiers
   ↓
3. Client checks for DOI/ISBN/etc.
   ↓
4a. If identifier found:
    → Use /processidentifier to create proper Zotero item
    → Attach original PDF to new item
    
4b. If no identifier found:
    → Prompt user for manual metadata entry
    → Or use /analyzeurl with PDF URL if available
```

### Example: Duplicate Detection Before Import

```python
def smart_pdf_import(pdf_path):
    """Import PDF only if not duplicate"""
    
    # Step 1: Preview PDF to extract identifiers
    with open(pdf_path, 'rb') as f:
        preview = requests.post(
            'http://localhost:23119/citationlinker/previewpdf',
            files={'pdf': f}
        ).json()
    
    if not preview['success']:
        print(f"Error: {preview['error']}")
        return
    
    # Step 2: Check if we found a DOI
    dois = [i['value'] for i in preview['identifiers'] if i['type'] == 'DOI']
    
    if not dois:
        print("No DOI found - manual import required")
        return
    
    doi = dois[0]
    
    # Step 3: Check if item with this DOI already exists
    check_response = requests.post(
        'http://localhost:23119/citationlinker/itemkeybyurl',
        json={'url': f'https://doi.org/{doi}'}
    ).json()
    
    if check_response['found']:
        print(f"Duplicate detected! Item already exists: {check_response['itemKey']}")
        return
    
    # Step 4: Not a duplicate - import it!
    process_response = requests.post(
        'http://localhost:23119/citationlinker/processidentifier',
        json={'identifier': doi}
    ).json()
    
    if process_response['success']:
        print(f"Successfully imported: {process_response['items'][0]['title']}")
        # TODO: Attach original PDF to the new item
    else:
        print(f"Import failed: {process_response.get('error', 'Unknown error')}")

# Usage
smart_pdf_import('./new-paper.pdf')
```

---

## Technical Details

### PDF Processing Pipeline

1. **File Upload**: Multipart form data received and validated
2. **Temporary File**: Written to Zotero's temp directory with unique filename
3. **Attachment Creation**: Temporary attachment item created in user's library
4. **PDF Extraction**: `Zotero.PDFWorker.getRecognizerData()` extracts text and structure
5. **Identifier Parsing**: Custom regex patterns scan extracted text
6. **Response Generation**: Format results as JSON
7. **Cleanup**: Delete temporary attachment item and temp file

### Security Considerations

- **Local Only**: Server binds to `127.0.0.1` (localhost only)
- **File Validation**: Content-Type and extension checked
- **Size Limits**: Enforced to prevent DOS attacks
- **Path Sanitization**: Filenames sanitized to prevent path traversal
- **Temporary Files**: Cleaned up even on error
- **No Persistence**: No files or items remain after processing

### Performance Characteristics

- **Small PDFs** (< 5 pages): ~1-2 seconds
- **Medium PDFs** (5-20 pages): ~2-5 seconds  
- **Large PDFs** (> 20 pages): ~5-10 seconds (with page limit)
- **Memory Usage**: ~2-3x file size during processing
- **Concurrent Limit**: Queued by Zotero's PDFWorker

---

## Troubleshooting

### "Endpoint does not support content-type"
- **Cause**: Wrong Content-Type header being sent
- **Solution**: Ensure you're using `multipart/form-data`, not `application/json` or `application/pdf`
- **cURL**: Use `-F` flag (automatically sets multipart/form-data)
- **Python requests**: Use `files=` parameter (automatically sets multipart/form-data)
- **JavaScript/Node**: Use FormData object (automatically sets correct headers)

### "No PDF file found in request"

- Ensure you're using `multipart/form-data` content type
- Verify the file field is being sent correctly
- Check that the file has `.pdf` extension or `application/pdf` MIME type

### "PDF file too large"

- Check file size: `ls -lh file.pdf`
- Increase `maxPdfUploadSize` preference if needed
- Consider compressing PDF or splitting into parts

### "Invalid PDF file"

- Verify file is actually a PDF: `file document.pdf`
- Try opening in PDF viewer to confirm integrity
- Re-export from source if corrupted

### "PDF is password-protected"

- Remove password using PDF tools
- Use `qpdf --decrypt input.pdf output.pdf` (if password known)

### No identifiers found

- Check if PDF has embedded text: Try selecting/copying text
- Scanned PDFs need OCR processing first
- Some PDFs may not contain identifiers in first 10 pages

### Timeout on large files

- Increase `maxPdfPagesToAnalyze` to lower value
- Split large PDF into smaller files
- Process sequentially rather than concurrently

---

## Related Endpoints

- **[Process Identifier](API_PROCESS_IDENTIFIER_ENDPOINT.md)**: Import items using extracted identifiers
- **[Preview Identifier](API_PREVIEW_IDENTIFIER_RESPONSE.md)**: Preview identifier metadata before import
- **[Get Item](API_GET_ITEM_ENDPOINT.md)**: Retrieve existing items by key
- **[Delete Item](API_DELETE_ITEM_ENDPOINT.md)**: Remove items from library

---

## Changelog

### Version 1.5.3 (2025-11-12)

- Initial implementation of Preview PDF endpoint
- Support for DOI, ISBN, arXiv, and PMID extraction
- Automatic cleanup of temporary resources
- Comprehensive error handling for edge cases

---

## Support

For issues, questions, or feature requests:

- **GitHub**: [zotero-citation-linker](https://github.com/evelasko/zotero-citation-linker)
- **Documentation**: [Full API Documentation](ZOTERO_HTTP_SERVER_API.md)

# Get Item Endpoint

## Overview

The Get Item endpoint allows you to retrieve comprehensive information about a Zotero item by its key. This endpoint returns detailed metadata including fields, creators, tags, collections, attachments, notes, and generated citations.

## Endpoint Details

- **Path**: `/citationlinker/item`
- **Method**: `GET`
- **Query Parameters**: `key` (item key)

## Request Format

### URL Pattern

```request
GET http://localhost:23119/citationlinker/item?key=ABC123XYZ
```

### Query Parameters

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| key       | string | Yes      | The unique key of the item to retrieve         |

## Response Format

### Success Response (200 OK)

```json
{
  "status": "success",
  "data": {
    "key": "ABC123XYZ",
    "version": 123,
    "itemType": "journalArticle",
    "libraryID": 1,
    "dateAdded": "2024-01-15T10:30:00Z",
    "dateModified": "2024-01-16T14:45:00Z",
    "title": "Example Article Title",
    "fields": {
      "title": "Example Article Title",
      "abstractNote": "This is the abstract...",
      "publicationTitle": "Journal Name",
      "volume": "10",
      "issue": "2",
      "pages": "123-145",
      "date": "2024-01-15",
      "DOI": "10.1234/example.doi",
      "url": "https://example.com/article",
      "accessDate": "2024-01-20",
      "language": "en"
    },
    "creators": [
      {
        "creatorType": "author",
        "firstName": "John",
        "lastName": "Doe",
        "name": ""
      },
      {
        "creatorType": "author",
        "firstName": "Jane",
        "lastName": "Smith",
        "name": ""
      }
    ],
    "tags": [
      {
        "tag": "machine learning",
        "type": 0
      },
      {
        "tag": "neural networks",
        "type": 0
      }
    ],
    "collections": [
      "COLLECTION1",
      "COLLECTION2"
    ],
    "relations": {
      "dc:relation": [
        "http://zotero.org/users/123456/items/RELATED1"
      ]
    },
    "attachments": [
      {
        "key": "ATTACH123",
        "title": "Full Text PDF",
        "contentType": "application/pdf",
        "path": "/path/to/file.pdf",
        "linkMode": "imported_file"
      }
    ],
    "notes": [
      {
        "key": "NOTE123",
        "note": "<p>This is a note about the article</p>",
        "dateAdded": "2024-01-15T11:00:00Z",
        "dateModified": "2024-01-15T11:05:00Z"
      }
    ],
    "citation": "[Doe, J., & Smith, J. (2024). Example Article Title. *Journal Name*, *10*(2), 123-145.](https://example.com/article)",
    "citationFormat": "markdown",
    "apiURL": "https://api.zotero.org/users/123456/items/ABC123XYZ",
    "webURL": "https://www.zotero.org/users/123456/items/ABC123XYZ"
  },
  "metadata": {
    "message": "Item retrieved successfully"
  }
}
```

### Response Fields

| Field           | Type     | Description                                          |
|-----------------|----------|------------------------------------------------------|
| key             | string   | Unique item key                                      |
| version         | number   | Item version number                                  |
| itemType        | string   | Type of item (e.g., journalArticle, book, webpage)   |
| libraryID       | number   | ID of the library containing the item                |
| dateAdded       | string   | ISO 8601 timestamp when item was added               |
| dateModified    | string   | ISO 8601 timestamp when item was last modified       |
| title           | string   | Item title (for convenience, also in fields)         |
| fields          | object   | All item fields with their values                    |
| creators        | array    | List of creators (authors, editors, etc.)            |
| tags            | array    | List of tags associated with the item                |
| collections     | array    | List of collection keys the item belongs to          |
| relations       | object   | Related items and resources                          |
| attachments     | array    | Attached files (PDFs, snapshots, etc.)               |
| notes           | array    | Notes associated with the item                       |
| citation        | string   | Formatted citation (if available)                    |
| citationFormat  | string   | Format of the citation (e.g., markdown)              |
| apiURL          | string   | Zotero API URL for this item                         |
| webURL          | string   | Zotero web library URL for this item                 |

### Error Responses

#### 400 Bad Request - Missing or Invalid Key

```json
{
  "status": "error",
  "message": "key query parameter is required and must be a string"
}
```

#### 404 Not Found - Item Does Not Exist

```json
{
  "status": "error",
  "message": "Item with key ABC123XYZ not found"
}
```

#### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Internal server error: [error details]"
}
```

## Usage Examples

### Using cURL

```bash
curl -X GET "http://localhost:23119/citationlinker/item?key=ABC123XYZ"
```

### Using JavaScript (fetch)

```javascript
const getItem = async (itemKey) => {
  const response = await fetch(
    `http://localhost:23119/citationlinker/item?key=${encodeURIComponent(itemKey)}`
  );
  
  const result = await response.json();
  
  if (result.status === 'success') {
    console.log('Item retrieved:', result.data.title);
    console.log('Authors:', result.data.creators.map(c => 
      c.lastName ? `${c.firstName} ${c.lastName}` : c.name
    ).join(', '));
    console.log('Citation:', result.data.citation);
  } else {
    console.error('Error:', result.message);
  }
  
  return result;
};

// Usage
getItem('ABC123XYZ');
```

### Using JavaScript (async/await with error handling)

```javascript
async function retrieveItemDetails(itemKey) {
  try {
    const response = await fetch(
      `http://localhost:23119/citationlinker/item?key=${encodeURIComponent(itemKey)}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      const item = result.data;
      
      return {
        title: item.title,
        authors: item.creators
          .filter(c => c.creatorType === 'author')
          .map(c => c.lastName ? `${c.firstName} ${c.lastName}` : c.name),
        year: item.fields.date ? new Date(item.fields.date).getFullYear() : null,
        doi: item.fields.DOI || null,
        url: item.fields.url || item.webURL,
        citation: item.citation,
        tags: item.tags.map(t => t.tag),
        hasPDF: item.attachments.some(a => a.contentType === 'application/pdf'),
      };
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Failed to retrieve item:', error);
    throw error;
  }
}

// Usage
try {
  const details = await retrieveItemDetails('ABC123XYZ');
  console.log('Retrieved item details:', details);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Using Python (requests)

```python
import requests
from urllib.parse import urlencode

def get_item(item_key):
    base_url = 'http://localhost:23119/citationlinker/item'
    params = {'key': item_key}
    url = f"{base_url}?{urlencode(params)}"
    
    response = requests.get(url)
    result = response.json()
    
    if result['status'] == 'success':
        item = result['data']
        print(f"Title: {item['title']}")
        print(f"Type: {item['itemType']}")
        
        # Print authors
        authors = [
            f"{c['firstName']} {c['lastName']}" if c['lastName'] else c['name']
            for c in item['creators'] if c['creatorType'] == 'author'
        ]
        print(f"Authors: {', '.join(authors)}")
        
        # Print citation
        if 'citation' in item:
            print(f"Citation: {item['citation']}")
        
        # Check for PDF attachments
        has_pdf = any(a['contentType'] == 'application/pdf' for a in item['attachments'])
        print(f"Has PDF: {has_pdf}")
        
    else:
        print(f"Error: {result['message']}")
    
    return result

# Usage
get_item('ABC123XYZ')
```

### Using Python (with detailed field extraction)

```python
import requests
from typing import Dict, List, Optional

class ZoteroItemRetriever:
    def __init__(self, base_url: str = 'http://localhost:23119'):
        self.base_url = base_url
    
    def get_item(self, item_key: str) -> Optional[Dict]:
        """Retrieve an item by its key."""
        url = f"{self.base_url}/citationlinker/item"
        params = {'key': item_key}
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            
            if result['status'] == 'success':
                return result['data']
            else:
                print(f"Error: {result['message']}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def get_item_citation(self, item_key: str) -> Optional[str]:
        """Get just the citation for an item."""
        item = self.get_item(item_key)
        return item.get('citation') if item else None
    
    def get_item_fields(self, item_key: str, field_names: List[str]) -> Dict[str, str]:
        """Get specific fields from an item."""
        item = self.get_item(item_key)
        if not item:
            return {}
        
        fields = item.get('fields', {})
        return {field: fields.get(field) for field in field_names if field in fields}
    
    def has_pdf(self, item_key: str) -> bool:
        """Check if an item has a PDF attachment."""
        item = self.get_item(item_key)
        if not item:
            return False
        
        attachments = item.get('attachments', [])
        return any(a.get('contentType') == 'application/pdf' for a in attachments)

# Usage
retriever = ZoteroItemRetriever()

# Get full item
item = retriever.get_item('ABC123XYZ')
if item:
    print(f"Retrieved: {item['title']}")

# Get just the citation
citation = retriever.get_item_citation('ABC123XYZ')
print(f"Citation: {citation}")

# Get specific fields
fields = retriever.get_item_fields('ABC123XYZ', ['title', 'DOI', 'date'])
print(f"Fields: {fields}")

# Check for PDF
has_pdf = retriever.has_pdf('ABC123XYZ')
print(f"Has PDF: {has_pdf}")
```

## Integration Patterns

### Export Item Data

```javascript
async function exportItemToJSON(itemKey) {
  const response = await fetch(
    `http://localhost:23119/citationlinker/item?key=${itemKey}`
  );
  const result = await response.json();
  
  if (result.status === 'success') {
    const item = result.data;
    
    // Create a simplified export format
    const exportData = {
      title: item.title,
      type: item.itemType,
      authors: item.creators.map(c => ({
        type: c.creatorType,
        name: c.lastName ? `${c.firstName} ${c.lastName}` : c.name
      })),
      year: item.fields.date ? new Date(item.fields.date).getFullYear() : null,
      doi: item.fields.DOI,
      url: item.fields.url,
      abstract: item.fields.abstractNote,
      citation: item.citation,
      tags: item.tags.map(t => t.tag),
      zoteroURL: item.webURL,
    };
    
    // Save to file or send to another service
    console.log(JSON.stringify(exportData, null, 2));
    return exportData;
  }
  
  return null;
}
```

### Check Item Before Deletion

```javascript
async function deleteItemWithConfirmation(itemKey) {
  // First, retrieve item details
  const getResponse = await fetch(
    `http://localhost:23119/citationlinker/item?key=${itemKey}`
  );
  const getResult = await getResponse.json();
  
  if (getResult.status === 'success') {
    const item = getResult.data;
    
    // Show item details to user
    console.log(`About to delete: ${item.title}`);
    console.log(`Type: ${item.itemType}`);
    console.log(`Added: ${new Date(item.dateAdded).toLocaleDateString()}`);
    
    // Confirm deletion (in a real app, this would be a UI prompt)
    const confirmed = confirm(`Delete "${item.title}"?`);
    
    if (confirmed) {
      // Proceed with deletion
      const deleteResponse = await fetch(
        'http://localhost:23119/citationlinker/deleteitem',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemKey })
        }
      );
      
      const deleteResult = await deleteResponse.json();
      console.log('Deletion result:', deleteResult);
      return deleteResult;
    }
  }
  
  return null;
}
```

### Sync Item with External Database

```javascript
async function syncItemToDatabase(itemKey, databaseAPI) {
  const response = await fetch(
    `http://localhost:23119/citationlinker/item?key=${itemKey}`
  );
  const result = await response.json();
  
  if (result.status === 'success') {
    const item = result.data;
    
    // Transform Zotero item to database format
    const dbRecord = {
      zotero_key: item.key,
      title: item.title,
      item_type: item.itemType,
      authors: item.creators.map(c => c.lastName || c.name),
      publication_date: item.fields.date,
      doi: item.fields.DOI,
      citation: item.citation,
      tags: item.tags.map(t => t.tag),
      has_pdf: item.attachments.some(a => a.contentType === 'application/pdf'),
      zotero_url: item.webURL,
      last_synced: new Date().toISOString(),
    };
    
    // Send to external database
    await databaseAPI.upsert('citations', dbRecord);
    
    return dbRecord;
  }
  
  return null;
}
```

### Generate Bibliography Entry

```javascript
async function generateBibliographyEntry(itemKey, format = 'apa') {
  const response = await fetch(
    `http://localhost:23119/citationlinker/item?key=${itemKey}`
  );
  const result = await response.json();
  
  if (result.status === 'success') {
    const item = result.data;
    
    // Use the provided citation or generate custom format
    if (format === 'markdown') {
      return item.citation;
    }
    
    // Generate custom format
    const authors = item.creators
      .filter(c => c.creatorType === 'author')
      .map(c => c.lastName || c.name)
      .join(', ');
    
    const year = item.fields.date ? 
      new Date(item.fields.date).getFullYear() : 'n.d.';
    
    return `${authors} (${year}). ${item.title}. ${item.fields.publicationTitle || ''}`;
  }
  
  return null;
}
```

## Notes

- **Comprehensive Data**: This endpoint returns all available metadata for an item, including attachments and notes (for regular items).
- **Citation Generation**: The endpoint automatically generates a formatted citation using the plugin's citation generator service.
- **URLs Included**: Both API and web library URLs are provided for easy linking.
- **Attachment Details**: Full attachment metadata is included, though file contents are not returned.
- **Note HTML**: Notes are returned with their HTML formatting intact.
- **Query Parameter**: Unlike POST endpoints, this uses a GET request with a query parameter.

## Field Availability

The `fields` object contains all used fields for the item type. Common fields include:

- **General**: `title`, `abstractNote`, `date`, `url`, `accessDate`, `language`
- **Journal Articles**: `publicationTitle`, `volume`, `issue`, `pages`, `DOI`, `ISSN`
- **Books**: `publisher`, `place`, `edition`, `numPages`, `ISBN`
- **Web Pages**: `websiteTitle`, `websiteType`

## Error Handling

The endpoint performs several checks:

1. **Query Parameter Validation**: Ensures `key` is provided and is a string
2. **Item Existence**: Confirms the item exists in the library
3. **Data Extraction**: Gracefully handles missing or unavailable fields
4. **Citation Generation**: Falls back gracefully if citation cannot be generated

## Related Endpoints

- **Delete Item**: `/citationlinker/deleteitem` - Delete an item by key (POST)
- **Process URL**: `/citationlinker/processurl` - Create items from URLs (POST)
- **Item Key By URL**: `/citationlinker/itemkeybyurl` - Get item key from URL (POST)

## Technical Details

### Implementation

The endpoint is implemented in `src/api/endpoints/GetItemEndpoint.ts` and extends the `BaseEndpoint` class. It:

1. Validates query parameters from `searchParams` (GET requests use URLSearchParams object)
2. Retrieves the item using `Zotero.Items.getByLibraryAndKeyAsync()`
3. Extracts comprehensive item data including fields, creators, tags, collections
4. Retrieves and formats attachments and notes
5. Generates citation using the citation service
6. Constructs API and web URLs
7. Returns formatted response

**Important Note:** GET requests in Zotero's server use `searchParams` (a URLSearchParams object) rather than the `data` or `query` properties used by POST requests. The endpoint accesses query parameters via `requestData.searchParams.get('key')`.

### Zotero API Methods Used

- `Zotero.Items.getByLibraryAndKeyAsync()` - Retrieves item by library and key
- `item.getUsedFields()` - Gets list of fields with values
- `item.getField()` - Gets field value
- `item.getCreators()` - Gets item creators
- `item.getTags()` - Gets item tags
- `item.getCollections()` - Gets collection membership
- `item.getRelations()` - Gets item relations
- `item.getAttachments()` - Gets attachment IDs
- `item.getNotes()` - Gets note IDs
- `Zotero.Users.getCurrentUserID()` - Gets current user ID for URLs

### Response Builder

The endpoint uses the `ResponseBuilder` utility for consistent response formatting:

- `successResponse()` - Formats successful retrieval responses
- `errorResponse()` - Formats error responses with appropriate status codes
- `validationErrorResponse()` - Formats validation error responses

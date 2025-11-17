# Edit Item Endpoint

## Overview

The Edit Item endpoint allows you to update a Zotero item's metadata by its key. This endpoint supports updating fields, creators, tags, collections, relations, and note content. All updates are validated against Zotero's schema to ensure data integrity.

## Endpoint Details

- **Path**: `/citationlinker/edititem`
- **Methods**: `POST`
- **Content-Type**: `application/json`

## Request Format

### Request Body

```json
{
  "itemKey": "ABC123XYZ",
  "fields": {
    "title": "Updated Title",
    "date": "2024-01-15",
    "abstractNote": "Updated abstract...",
    "DOI": "10.1234/updated.doi"
  },
  "creators": [
    {
      "creatorType": "author",
      "firstName": "John",
      "lastName": "Doe"
    },
    {
      "creatorType": "editor",
      "firstName": "Jane",
      "lastName": "Smith"
    }
  ],
  "tags": [
    "machine learning",
    "artificial intelligence",
    { "tag": "automated", "type": 1 }
  ],
  "collections": [
    "COLLKEY1",
    "COLLKEY2"
  ],
  "relations": {
    "dc:relation": [
      "http://zotero.org/users/123456/items/RELATEDKEY"
    ]
  }
}
```

### Parameters

| Parameter   | Type   | Required | Description                                           |
|-------------|--------|----------|-------------------------------------------------------|
| itemKey     | string | Yes      | The unique key of the item to edit                    |
| fields      | object | No*      | Object containing field names and values to update    |
| creators    | array  | No*      | Array of creator objects to replace existing creators |
| tags        | array  | No*      | Array of tags (strings or objects) to replace tags    |
| collections | array  | No*      | Array of collection keys to assign item to            |
| relations   | object | No*      | Object containing relation predicates and URIs        |
| note        | string | No*      | Note content (HTML) - only for note items             |

\* At least one of these parameters must be provided.

### Fields Object

The `fields` object can contain any valid Zotero field for the item type:

```json
{
  "fields": {
    "title": "Article Title",
    "abstractNote": "Article abstract...",
    "publicationTitle": "Journal Name",
    "volume": "10",
    "issue": "2",
    "pages": "123-145",
    "date": "2024-01-15",
    "DOI": "10.1234/example.doi",
    "url": "https://example.com/article",
    "accessDate": "2024-01-20",
    "language": "en",
    "rights": "CC BY 4.0"
  }
}
```

**Field Validation:**

- Only fields valid for the item's type will be updated
- Invalid fields will be reported in warnings
- Empty strings clear field values
- All values are converted to strings

### Creators Array

Creators can be specified in two formats:

**Two-field format** (most common):

```json
{
  "creatorType": "author",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Single-field format** (for institutions, mononyms):

```json
{
  "creatorType": "author",
  "name": "Harvard University"
}
```

**Valid Creator Types:**

- `author`, `editor`, `contributor`, `translator`
- `seriesEditor`, `director`, `producer`, `performer`
- `composer`, `artist`, `interviewee`, `interviewer`
- And more (varies by item type)

### Tags Array

Tags can be simple strings or objects with type:

```json
{
  "tags": [
    "machine learning",           // Manual tag (type 0)
    "neural networks",            // Manual tag (type 0)
    { "tag": "AI", "type": 0 },  // Manual tag (explicit)
    { "tag": "auto", "type": 1 } // Automatic tag
  ]
}
```

- **Type 0**: Manual tags (default)
- **Type 1**: Automatic tags

### Collections Array

Provide collection keys (not IDs):

```json
{
  "collections": [
    "COLLECTION1",
    "COLLECTION2"
  ]
}
```

Collections must exist in the library or the operation will fail.

### Relations Object

Relations use RDF predicates with URI arrays:

```json
{
  "relations": {
    "dc:relation": [
      "http://zotero.org/users/123456/items/RELATED1",
      "http://zotero.org/users/123456/items/RELATED2"
    ],
    "owl:sameAs": [
      "http://example.com/resource/123"
    ]
  }
}
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "updated": true,
  "itemKey": "ABC123XYZ",
  "itemType": "journalArticle",
  "title": "Updated Title",
  "updatedFields": [
    "title",
    "date",
    "abstractNote",
    "DOI",
    "creators",
    "tags"
  ],
  "version": 124,
  "dateModified": "2024-01-20T10:30:00Z",
  "message": "Item updated successfully",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### Partial Success Response (200 OK with warnings)

When some fields fail validation but others succeed:

```json
{
  "success": true,
  "updated": true,
  "itemKey": "ABC123XYZ",
  "itemType": "journalArticle",
  "title": "Updated Title",
  "updatedFields": [
    "title",
    "date"
  ],
  "version": 124,
  "dateModified": "2024-01-20T10:30:00Z",
  "message": "Item updated successfully",
  "warnings": [
    "Field \"invalidField\" does not exist in Zotero schema",
    "Field \"studio\" is not valid for item type \"journalArticle\""
  ],
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### Error Responses

#### 400 Bad Request - Missing Item Key

```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "itemKey is required and must be a string",
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

#### 400 Bad Request - No Update Fields Provided

```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "At least one of fields, creators, tags, collections, relations, or note must be provided",
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

#### 400 Bad Request - All Fields Failed Validation

```json
{
  "success": false,
  "error": {
    "message": "No fields were updated due to validation errors",
    "code": 400,
    "timestamp": "2024-01-20T10:30:00Z"
  },
  "data": {
    "errors": [
      "Field \"invalidField\" does not exist in Zotero schema",
      "Creator at index 0 missing required field: creatorType"
    ]
  }
}
```

#### 403 Forbidden - Library Not Editable

```json
{
  "success": false,
  "error": {
    "message": "Target library is not editable",
    "code": 403,
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

#### 404 Not Found - Item Does Not Exist

```json
{
  "success": false,
  "error": {
    "message": "Item with key ABC123XYZ not found",
    "code": 404,
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "message": "Failed to save item: [error details]",
    "code": 500,
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```

## Usage Examples

### Using cURL

#### Update Fields Only

```bash
curl -X POST http://localhost:23119/citationlinker/edititem \
  -H "Content-Type: application/json" \
  -d '{
    "itemKey": "ABC123XYZ",
    "fields": {
      "title": "Updated Article Title",
      "date": "2024-01-15",
      "volume": "11"
    }
  }'
```

#### Update Multiple Components

```bash
curl -X POST http://localhost:23119/citationlinker/edititem \
  -H "Content-Type: application/json" \
  -d '{
    "itemKey": "ABC123XYZ",
    "fields": {
      "title": "Complete Update",
      "abstractNote": "New abstract..."
    },
    "creators": [
      {
        "creatorType": "author",
        "firstName": "John",
        "lastName": "Doe"
      }
    ],
    "tags": ["updated", "revised"]
  }'
```

### Using JavaScript (fetch)

#### Basic Field Update

```javascript
const updateItemFields = async (itemKey, fields) => {
  const response = await fetch('http://localhost:23119/citationlinker/edititem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      itemKey: itemKey,
      fields: fields
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Item updated:', result.title);
    console.log('Updated fields:', result.updatedFields.join(', '));
    
    if (result.warnings) {
      console.warn('Warnings:', result.warnings);
    }
  } else {
    console.error('Error:', result.error.message);
  }
  
  return result;
};

// Usage
await updateItemFields('ABC123XYZ', {
  title: 'New Title',
  date: '2024-01-15',
  DOI: '10.1234/updated'
});
```

#### Update Creators

```javascript
const updateCreators = async (itemKey, creators) => {
  const response = await fetch('http://localhost:23119/citationlinker/edititem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      itemKey: itemKey,
      creators: creators
    })
  });
  
  return await response.json();
};

// Usage - Replace all creators
await updateCreators('ABC123XYZ', [
  {
    creatorType: 'author',
    firstName: 'Jane',
    lastName: 'Smith'
  },
  {
    creatorType: 'author',
    firstName: 'John',
    lastName: 'Doe'
  },
  {
    creatorType: 'editor',
    name: 'Editorial Board'
  }
]);
```

#### Add Tags

```javascript
const addTags = async (itemKey, newTags) => {
  // First, get current tags
  const getResponse = await fetch(
    `http://localhost:23119/citationlinker/item?key=${itemKey}`
  );
  const item = await getResponse.json();
  
  if (item.success) {
    // Combine existing and new tags
    const existingTags = item.data.tags.map(t => t.tag);
    const allTags = [...new Set([...existingTags, ...newTags])];
    
    // Update item with combined tags
    const updateResponse = await fetch(
      'http://localhost:23119/citationlinker/edititem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemKey: itemKey,
          tags: allTags
        })
      }
    );
    
    return await updateResponse.json();
  }
};

// Usage
await addTags('ABC123XYZ', ['new-tag', 'another-tag']);
```

#### Move Item to Different Collections

```javascript
const moveToCollections = async (itemKey, collectionKeys) => {
  const response = await fetch('http://localhost:23119/citationlinker/edititem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      itemKey: itemKey,
      collections: collectionKeys
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Moved item to ${collectionKeys.length} collections`);
  }
  
  return result;
};

// Usage
await moveToCollections('ABC123XYZ', ['COLLKEY1', 'COLLKEY2']);
```

#### Comprehensive Update Function

```javascript
const updateZoteroItem = async (itemKey, updates) => {
  try {
    const response = await fetch('http://localhost:23119/citationlinker/edititem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemKey: itemKey,
        ...updates
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✓ Updated ${result.updatedFields.length} components`);
      console.log(`  - Updated: ${result.updatedFields.join(', ')}`);
      console.log(`  - New version: ${result.version}`);
      
      if (result.warnings && result.warnings.length > 0) {
        console.warn('⚠ Warnings:');
        result.warnings.forEach(w => console.warn(`  - ${w}`));
      }
      
      return {
        success: true,
        data: result
      };
    } else {
      console.error('✗ Update failed:', result.error.message);
      
      if (result.data && result.data.errors) {
        console.error('  Validation errors:');
        result.data.errors.forEach(e => console.error(`  - ${e}`));
      }
      
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('✗ Request failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Usage - Update multiple components
await updateZoteroItem('ABC123XYZ', {
  fields: {
    title: 'Updated Title',
    date: '2024-01-15',
    abstractNote: 'New abstract...'
  },
  creators: [
    { creatorType: 'author', firstName: 'John', lastName: 'Doe' }
  ],
  tags: ['machine-learning', 'ai', 'research'],
  collections: ['COLLKEY1']
});
```

### Using Python (requests)

#### Basic Update

```python
import requests

def update_item_fields(item_key, fields):
    url = 'http://localhost:23119/citationlinker/edititem'
    
    payload = {
        'itemKey': item_key,
        'fields': fields
    }
    
    response = requests.post(url, json=payload)
    result = response.json()
    
    if result.get('success'):
        print(f"Updated: {result['title']}")
        print(f"Fields: {', '.join(result['updatedFields'])}")
        
        if 'warnings' in result:
            print("Warnings:")
            for warning in result['warnings']:
                print(f"  - {warning}")
    else:
        print(f"Error: {result['error']['message']}")
    
    return result

# Usage
update_item_fields('ABC123XYZ', {
    'title': 'New Title',
    'date': '2024-01-15',
    'volume': '11'
})
```

#### Update with Creators and Tags

```python
import requests
from typing import Dict, List, Optional

class ZoteroItemEditor:
    def __init__(self, base_url: str = 'http://localhost:23119'):
        self.base_url = base_url
        self.edit_url = f"{base_url}/citationlinker/edititem"
    
    def update_item(self,
                    item_key: str,
                    fields: Optional[Dict] = None,
                    creators: Optional[List[Dict]] = None,
                    tags: Optional[List] = None,
                    collections: Optional[List[str]] = None) -> Dict:
        """Update a Zotero item with various components."""
        
        payload = {'itemKey': item_key}
        
        if fields:
            payload['fields'] = fields
        if creators:
            payload['creators'] = creators
        if tags:
            payload['tags'] = tags
        if collections:
            payload['collections'] = collections
        
        try:
            response = requests.post(self.edit_url, json=payload)
            response.raise_for_status()
            result = response.json()
            
            if result.get('success'):
                print(f"✓ Updated item: {result['title']}")
                print(f"  Updated: {', '.join(result['updatedFields'])}")
                
                if 'warnings' in result:
                    print("  Warnings:")
                    for warning in result['warnings']:
                        print(f"    - {warning}")
            else:
                print(f"✗ Update failed: {result['error']['message']}")
                if 'data' in result and 'errors' in result['data']:
                    print("  Validation errors:")
                    for error in result['data']['errors']:
                        print(f"    - {error}")
            
            return result
        except requests.exceptions.RequestException as e:
            print(f"✗ Request failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def update_fields(self, item_key: str, fields: Dict) -> Dict:
        """Update only item fields."""
        return self.update_item(item_key, fields=fields)
    
    def update_creators(self, item_key: str, creators: List[Dict]) -> Dict:
        """Replace all creators."""
        return self.update_item(item_key, creators=creators)
    
    def update_tags(self, item_key: str, tags: List) -> Dict:
        """Replace all tags."""
        return self.update_item(item_key, tags=tags)
    
    def add_to_collections(self, item_key: str, collection_keys: List[str]) -> Dict:
        """Move item to specified collections."""
        return self.update_item(item_key, collections=collection_keys)

# Usage
editor = ZoteroItemEditor()

# Update fields
editor.update_fields('ABC123XYZ', {
    'title': 'Updated Title',
    'date': '2024-01-15',
    'abstractNote': 'New abstract...'
})

# Update creators
editor.update_creators('ABC123XYZ', [
    {
        'creatorType': 'author',
        'firstName': 'Jane',
        'lastName': 'Smith'
    },
    {
        'creatorType': 'editor',
        'name': 'Editorial Board'
    }
])

# Update multiple components
editor.update_item(
    'ABC123XYZ',
    fields={'title': 'New Title', 'volume': '12'},
    tags=['updated', 'machine-learning'],
    collections=['COLLKEY1', 'COLLKEY2']
)
```

#### Batch Update Multiple Items

```python
import requests
from typing import List, Dict

def batch_update_items(updates: List[Dict]) -> Dict:
    """Update multiple items with different changes."""
    url = 'http://localhost:23119/citationlinker/edititem'
    
    results = {
        'successful': [],
        'failed': []
    }
    
    for update in updates:
        try:
            response = requests.post(url, json=update)
            result = response.json()
            
            if result.get('success'):
                results['successful'].append({
                    'itemKey': update['itemKey'],
                    'title': result['title'],
                    'updatedFields': result['updatedFields']
                })
            else:
                results['failed'].append({
                    'itemKey': update['itemKey'],
                    'error': result['error']['message']
                })
        except Exception as e:
            results['failed'].append({
                'itemKey': update['itemKey'],
                'error': str(e)
            })
    
    print(f"Batch update complete:")
    print(f"  Successful: {len(results['successful'])}")
    print(f"  Failed: {len(results['failed'])}")
    
    return results

# Usage
updates = [
    {
        'itemKey': 'ITEM1',
        'fields': {'volume': '10'}
    },
    {
        'itemKey': 'ITEM2',
        'tags': ['reviewed', 'important']
    },
    {
        'itemKey': 'ITEM3',
        'fields': {'date': '2024-01-15'},
        'tags': ['updated']
    }
]

batch_update_items(updates)
```

## Validation Rules

### Field Validation

1. **Schema Validation**: Fields must exist in Zotero's schema
2. **Item Type Validation**: Fields must be valid for the item's type
3. **Base Field Mapping**: Base fields are automatically mapped to type-specific fields
4. **Empty Values**: Empty strings clear the field value
5. **Type Conversion**: All values are converted to strings

### Creator Validation

1. **Creator Type**: Must be valid for the item type
2. **Name Fields**: Must have either:
   - `name` (single-field mode) OR
   - `lastName` (two-field mode, `firstName` optional)
3. **Array Order**: Creators are stored in the order provided

### Tag Validation

1. **Format**: Can be strings or objects with `tag` and optional `type`
2. **Tag Type**: Type must be 0 (manual) or 1 (automatic)
3. **Duplicates**: Duplicate tags are handled by Zotero

### Collection Validation

1. **Collection Keys**: Must be valid 8-character keys
2. **Existence**: Collections must exist in the library
3. **Permissions**: User must have access to the collections

### Relation Validation

1. **Predicates**: Must be valid RDF predicates
2. **URIs**: Object values must be URI strings
3. **Arrays**: Each predicate must map to an array of URIs

## Integration Patterns

### Normalize Item Data

```javascript
async function normalizeZoteroItem(itemKey) {
  // Get current item
  const getResponse = await fetch(
    `http://localhost:23119/citationlinker/item?key=${itemKey}`
  );
  const item = await getResponse.json();
  
  if (!item.success) return;
  
  // Prepare normalized fields
  const fields = {};
  
  // Normalize date format
  if (item.data.fields.date) {
    const date = new Date(item.data.fields.date);
    if (!isNaN(date)) {
      fields.date = date.toISOString().split('T')[0];
    }
  }
  
  // Normalize title (trim whitespace)
  if (item.data.fields.title) {
    fields.title = item.data.fields.title.trim();
  }
  
  // Normalize DOI (remove URL part)
  if (item.data.fields.DOI) {
    fields.DOI = item.data.fields.DOI.replace(/^https?:\/\/doi\.org\//, '');
  }
  
  // Update item with normalized data
  if (Object.keys(fields).length > 0) {
    const updateResponse = await fetch(
      'http://localhost:23119/citationlinker/edititem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey, fields })
      }
    );
    
    return await updateResponse.json();
  }
}
```

### Merge Item Metadata from External Source

```javascript
async function mergeMetadataFromDOI(itemKey, doi) {
  // Fetch metadata from DOI API
  const doiResponse = await fetch(`https://api.crossref.org/works/${doi}`);
  const doiData = await doiResponse.json();
  
  if (!doiData.message) return;
  
  const metadata = doiData.message;
  
  // Build update payload
  const fields = {};
  
  if (metadata.title && metadata.title[0]) {
    fields.title = metadata.title[0];
  }
  
  if (metadata['container-title'] && metadata['container-title'][0]) {
    fields.publicationTitle = metadata['container-title'][0];
  }
  
  if (metadata.volume) {
    fields.volume = metadata.volume;
  }
  
  if (metadata.issue) {
    fields.issue = metadata.issue;
  }
  
  if (metadata.page) {
    fields.pages = metadata.page;
  }
  
  // Build creators from authors
  const creators = metadata.author?.map(author => ({
    creatorType: 'author',
    firstName: author.given || '',
    lastName: author.family || author.name || ''
  })) || [];
  
  // Update Zotero item
  const updateResponse = await fetch(
    'http://localhost:23119/citationlinker/edititem',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemKey,
        fields,
        creators: creators.length > 0 ? creators : undefined
      })
    }
  );
  
  return await updateResponse.json();
}
```

### Bulk Tag Management

```javascript
async function addTagToMultipleItems(itemKeys, tag) {
  const results = await Promise.all(
    itemKeys.map(async (itemKey) => {
      // Get current tags
      const getResponse = await fetch(
        `http://localhost:23119/citationlinker/item?key=${itemKey}`
      );
      const item = await getResponse.json();
      
      if (!item.success) return { itemKey, success: false };
      
      // Add new tag to existing tags
      const existingTags = item.data.tags.map(t => t.tag);
      const newTags = [...new Set([...existingTags, tag])];
      
      // Update item
      const updateResponse = await fetch(
        'http://localhost:23119/citationlinker/edititem',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemKey,
            tags: newTags
          })
        }
      );
      
      const result = await updateResponse.json();
      return { itemKey, success: result.success };
    })
  );
  
  const successful = results.filter(r => r.success).length;
  console.log(`Tagged ${successful} of ${itemKeys.length} items`);
  
  return results;
}
```

### Clean Up Item Fields

```javascript
async function cleanUpItemFields(itemKey) {
  // Get current item
  const getResponse = await fetch(
    `http://localhost:23119/citationlinker/item?key=${itemKey}`
  );
  const item = await getResponse.json();
  
  if (!item.success) return;
  
  const fields = {};
  
  // Remove placeholder text
  const placeholders = ['untitled', 'no title', 'n/a', 'unknown'];
  
  if (item.data.fields.title) {
    const title = item.data.fields.title.toLowerCase();
    if (placeholders.some(p => title.includes(p))) {
      fields.title = ''; // Clear placeholder
    }
  }
  
  // Remove duplicate whitespace
  for (const [key, value] of Object.entries(item.data.fields)) {
    if (typeof value === 'string' && value.includes('  ')) {
      fields[key] = value.replace(/\s+/g, ' ').trim();
    }
  }
  
  // Clean up DOI
  if (item.data.fields.DOI) {
    // Remove common prefixes and clean up
    fields.DOI = item.data.fields.DOI
      .replace(/^doi:\s*/i, '')
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .trim();
  }
  
  // Remove empty tags
  const cleanTags = item.data.tags.filter(t => t.tag.trim() !== '');
  
  // Update item
  if (Object.keys(fields).length > 0 || cleanTags.length !== item.data.tags.length) {
    const payload = { itemKey };
    
    if (Object.keys(fields).length > 0) {
      payload.fields = fields;
    }
    
    if (cleanTags.length !== item.data.tags.length) {
      payload.tags = cleanTags.map(t => t.tag);
    }
    
    const updateResponse = await fetch(
      'http://localhost:23119/citationlinker/edititem',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    
    return await updateResponse.json();
  }
}
```

## Notes

- **Atomic Updates**: All changes are applied atomically within a Zotero transaction
- **Validation**: Extensive validation ensures only valid data is saved
- **Partial Success**: Some components can succeed even if others fail (with warnings)
- **Field Mapping**: Base fields are automatically mapped to type-specific fields
- **Library Permissions**: Library must be editable
- **Version Tracking**: Item version number is updated and returned
- **Creator Replacement**: Providing creators replaces ALL existing creators
- **Tag Replacement**: Providing tags replaces ALL existing tags
- **Collection Replacement**: Providing collections replaces ALL collection memberships

## Field Availability by Item Type

Different item types support different fields. Common item types:

### Journal Article

- title, abstractNote, publicationTitle, volume, issue, pages
- date, DOI, ISSN, url, accessDate, language
- journalAbbreviation, shortTitle, rights, extra

### Book

- title, abstractNote, series, seriesNumber, volume
- edition, place, publisher, date, numPages
- ISBN, language, shortTitle, url, accessDate

### Webpage

- title, abstractNote, websiteTitle, websiteType
- url, accessDate, date, language, rights

### Thesis

- title, abstractNote, thesisType, university
- place, date, numPages, language, url, accessDate

### Conference Paper

- title, abstractNote, proceedingsTitle, conferenceName
- place, date, volume, pages, series, DOI, ISBN

For a complete list of fields for each item type, see the [Zotero Item Types documentation](ZOTERO_ITEM_TYPES_AND_LOCAL_API.md).

## Error Handling

The endpoint performs comprehensive validation:

1. **Request Structure**: Validates JSON and required parameters
2. **Library Permissions**: Checks if library is editable
3. **Item Existence**: Confirms item exists
4. **Field Validation**: Validates each field against schema and item type
5. **Creator Validation**: Validates creator structure and types
6. **Tag Validation**: Validates tag format
7. **Collection Validation**: Validates collection existence
8. **Relation Validation**: Validates relation structure
9. **Save Operation**: Uses transaction for safe saving

## Security Considerations

- **Local Only**: The API server binds to `localhost` by default
- **No Authentication**: Since the server is local-only, authentication is not required
- **Validation**: All inputs are validated before being applied
- **Transaction Safety**: Updates use Zotero's transaction mechanism
- **Schema Enforcement**: Only valid Zotero fields and values are accepted

## Related Endpoints

- **Get Item**: `/citationlinker/item` - Retrieve item details (GET)
- **Delete Item**: `/citationlinker/deleteitem` - Delete an item (POST)
- **Process URL**: `/citationlinker/processurl` - Create items from URLs (POST)
- **Process Identifier**: `/citationlinker/processidentifier` - Create items from DOI/PMID/etc. (POST)

## Technical Details

### Implementation

The endpoint is implemented in `src/api/endpoints/EditItemEndpoint.ts` and extends the `BaseEndpoint` class. It:

1. Validates request structure and parameters
2. Checks library write permissions
3. Retrieves the item using `Zotero.Items.getByLibraryAndKeyAsync()`
4. Validates and updates fields using `updateItemFields()`
5. Validates and updates creators using `updateItemCreators()`
6. Validates and updates tags using `updateItemTags()`
7. Validates and updates collections using `updateItemCollections()`
8. Validates and updates relations using `updateItemRelations()`
9. Saves changes using `item.saveTx()` (transactional save)
10. Returns detailed success/error responses with warnings for partial failures

### Zotero API Methods Used

- `Zotero.Items.getByLibraryAndKeyAsync()` - Retrieves item by library and key
- `Zotero.ItemTypes.getID()` - Gets item type ID from name
- `Zotero.ItemFields.getID()` - Gets field ID from name
- `Zotero.ItemFields.getName()` - Gets field name from ID
- `Zotero.ItemFields.getItemTypeFields()` - Gets valid fields for item type
- `Zotero.ItemFields.isValidForType()` - Validates field for item type
- `Zotero.CreatorTypes.getTypesForItemType()` - Gets valid creator types
- `Zotero.Collections.getByLibraryAndKeyAsync()` - Validates collections
- `item.setField()` - Sets field value
- `item.setCreators()` - Sets creators
- `item.setTags()` - Sets tags
- `item.setCollections()` - Sets collection membership
- `item.addRelation()` - Adds relations
- `item.setNote()` - Sets note content (for note items)
- `item.saveTx()` - Saves item within transaction

### Response Builder

The endpoint uses the `ResponseBuilder` utility for consistent response formatting:

- `successResponse()` - Formats successful update responses
- `errorResponse()` - Formats error responses with appropriate status codes
- `validationErrorResponse()` - Formats validation error responses

### Validation Strategy

The endpoint uses a **partial success** strategy:

1. Attempts to update all provided components
2. Collects validation errors without stopping
3. If any component succeeds, returns success with warnings
4. If all components fail, returns error with all validation messages
5. Always reports which fields were successfully updated

This allows for resilient updates where some data can be saved even if other parts have validation issues.

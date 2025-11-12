# Delete Item Endpoint

## Overview

The Delete Item endpoint allows you to delete a Zotero item by its key. This endpoint will permanently remove the item from your Zotero library if it exists.

## Endpoint Details

- **Path**: `/citationlinker/deleteitem`
- **Method**: `POST`
- **Content-Type**: `application/json`

## Request Format

### Request Body

```json
{
  "itemKey": "ABC123XYZ"
}
```

### Parameters

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| itemKey   | string | Yes      | The unique key of the item to delete           |

## Response Format

### Success Response (200 OK)

```json
{
  "status": "success",
  "data": {
    "deleted": true,
    "itemKey": "ABC123XYZ",
    "itemInfo": {
      "key": "ABC123XYZ",
      "title": "Example Article Title",
      "itemType": "journalArticle"
    }
  },
  "metadata": {
    "message": "Item deleted successfully"
  }
}
```

### Error Responses

#### 400 Bad Request - Missing or Invalid Item Key

```json
{
  "status": "error",
  "message": "itemKey is required and must be a string"
}
```

#### 403 Forbidden - Library Not Editable

```json
{
  "status": "error",
  "message": "Target library is not editable"
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
  "message": "Failed to delete item: [error details]"
}
```

## Usage Examples

### Using cURL

```bash
curl -X POST http://localhost:23119/citationlinker/deleteitem \
  -H "Content-Type: application/json" \
  -d '{
    "itemKey": "ABC123XYZ"
  }'
```

### Using JavaScript (fetch)

```javascript
const deleteItem = async (itemKey) => {
  const response = await fetch('http://localhost:23119/citationlinker/deleteitem', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      itemKey: itemKey
    })
  });
  
  const result = await response.json();
  
  if (result.status === 'success') {
    console.log('Item deleted:', result.data.itemInfo.title);
  } else {
    console.error('Error:', result.message);
  }
  
  return result;
};

// Usage
deleteItem('ABC123XYZ');
```

### Using Python (requests)

```python
import requests

def delete_item(item_key):
    url = 'http://localhost:23119/citationlinker/deleteitem'
    
    payload = {
        'itemKey': item_key
    }
    
    response = requests.post(url, json=payload)
    result = response.json()
    
    if result['status'] == 'success':
        print(f"Item deleted: {result['data']['itemInfo']['title']}")
    else:
        print(f"Error: {result['message']}")
    
    return result

# Usage
delete_item('ABC123XYZ')
```

## Notes

- **Permanent Deletion**: This operation permanently deletes the item from your Zotero library. The deletion cannot be undone through the API.
- **Library Permissions**: The target library must be editable. Read-only libraries will result in a 403 Forbidden error.
- **Item Validation**: The endpoint checks if the item exists before attempting deletion. If the item key is invalid or the item doesn't exist, a 404 error is returned.
- **Transaction Safety**: The deletion is performed within a Zotero transaction (`eraseTx()`), ensuring database consistency.

## Error Handling

The endpoint performs several validation checks:

1. **Request Validation**: Ensures the request body contains valid JSON
2. **Parameter Validation**: Checks that `itemKey` is provided and is a string
3. **Library Check**: Verifies the library is editable
4. **Item Existence**: Confirms the item exists before deletion
5. **Deletion Safety**: Uses Zotero's transaction mechanism for safe deletion

## Security Considerations

- **Local Only**: The API server binds to `localhost` by default, preventing external access
- **No Authentication**: Since the server is local-only, authentication is not required
- **Permanent Action**: There is no undo mechanism - use with caution

## Related Endpoints

- **Process URL**: `/citationlinker/processurl` - Create items from URLs
- **Process Identifier**: `/citationlinker/processidentifier` - Create items from DOI/PMID/etc.
- **Item Key By URL**: `/citationlinker/itemkeybyurl` - Get item key from URL

## Integration Patterns

### Cleanup After Failed Processing

```javascript
async function processUrlWithCleanup(url) {
  try {
    const response = await fetch('http://localhost:23119/citationlinker/previewurl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const preview = await response.json();
    
    // User decides not to keep the item
    if (preview.status === 'success' && preview.data.items[0]) {
      const itemKey = preview.data.items[0].key;
      
      // Delete the preview item
      await fetch('http://localhost:23119/citationlinker/deleteitem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey })
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Batch Deletion

```javascript
async function deleteManyItems(itemKeys) {
  const results = await Promise.all(
    itemKeys.map(async (itemKey) => {
      const response = await fetch('http://localhost:23119/citationlinker/deleteitem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey })
      });
      
      return {
        itemKey,
        result: await response.json()
      };
    })
  );
  
  const successful = results.filter(r => r.result.status === 'success');
  const failed = results.filter(r => r.result.status === 'error');
  
  return { successful, failed };
}
```

## Technical Details

### Implementation

The endpoint is implemented in `src/api/endpoints/DeleteItemEndpoint.ts` and extends the `BaseEndpoint` class. It:

1. Validates the request structure and parameters
2. Checks library write permissions
3. Retrieves the item using `Zotero.Items.getByLibraryAndKeyAsync()`
4. Stores item information for the response
5. Deletes the item using `item.eraseTx()` (transactional deletion)
6. Returns detailed success/error responses

### Zotero API Methods Used

- `Zotero.Items.getByLibraryAndKeyAsync()` - Retrieves item by library and key
- `item.eraseTx()` - Deletes item within a transaction
- `item.getField()` - Gets item field values
- `Zotero.Libraries.userLibraryID` - Gets the user's library ID

### Response Builder

The endpoint uses the `ResponseBuilder` utility for consistent response formatting:

- `successResponse()` - Formats successful deletion responses
- `errorResponse()` - Formats error responses with appropriate status codes
- `validationErrorResponse()` - Formats validation error responses


# Business Document Preview Fix

## Problem
When users upload a new business document in the client edit page and then navigate to the client details page to preview it, they see the old document instead of the newly uploaded one.

## Root Cause
The issue was in how business documents were handled in the preview logic. Business documents can be stored in three different locations:
1. `client.documents['business_document']` (new format)
2. `client.processed_documents['business_document']` (legacy format)
3. `client.business_document_url` (old format from enquiry)

The preview logic was only checking the old `business_document_url` field and not the newer storage formats where updated documents are stored.

## Solution
Updated the business document preview logic to check all three storage locations in the correct priority order:

1. **New Format First**: Check `client.documents['business_document']` 
2. **Legacy Format Second**: Check `client.processed_documents['business_document']`
3. **Old Format Last**: Fallback to `client.business_document_url`

## Changes Made

### 1. `previewDocumentWithUpdatedData` method
- Enhanced business document handling to check all three storage locations
- Added logic to preview documents from the new `documents` format
- Maintained backward compatibility with legacy formats

### 2. `getDocumentFileName` method
- Updated to check the new `documents` format first for business documents
- Added proper fallback chain for all storage formats

### 3. `getDocumentFileSize` method
- Updated to check the new `documents` format first for business documents
- Added proper fallback chain for all storage formats

### 4. `canPreviewDocumentByType` method
- Added specific handling for business documents
- Checks if any business document exists in any format

### 5. `getDocumentKeys` method
- Updated to include business documents from all storage formats
- Prevents duplicates in the document list

## How It Works

1. **User uploads new business document** in edit client page
2. **Document is stored** in `client.documents['business_document']` (new format)
3. **User navigates to client detail page**
4. **User clicks preview** on business document
5. **System refreshes client data** to get latest document information
6. **Preview logic checks** all three storage locations in priority order:
   - First: `client.documents['business_document']` (new format)
   - Second: `client.processed_documents['business_document']` (legacy format)
   - Third: `client.business_document_url` (old format)
7. **System previews the document** from the first available location
8. **User sees the updated document** instead of the old one

## Testing
The fix has been implemented to ensure:
- Business documents are always previewed from the most recent storage location
- Backward compatibility is maintained with legacy document formats
- All document types are handled correctly
- Client data is refreshed before previewing to ensure latest information

This resolves the issue where users were seeing stale business document previews after uploading new versions.
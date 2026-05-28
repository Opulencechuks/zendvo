# Avatar Upload Feature - Implementation Guide

## Overview
The avatar upload feature enables users to upload and manage their profile pictures directly from the Settings page. Avatars are securely stored and displayed across the application.

## What's Implemented

### 1. Backend API Endpoint
**File**: `src/app/api/users/avatar/route.ts`

**Functionality**:
- Accepts multipart/form-data POST requests
- Validates authentication via Bearer token
- Validates file type (JPEG, PNG only)
- Validates file size (max 10MB)
- Stores files to `public/avatars/` directory
- Updates user's avatarUrl in database
- Returns success response with updated user data

**Endpoint Details**:
```
POST /api/users/avatar
Content-Type: multipart/form-data
Authorization: Bearer {token}

Request Body:
  file: <image file>

Success Response (200):
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "avatarUrl": "/avatars/user-id-timestamp.jpg"
  }
}

Error Response (400/401/413/500):
{
  "type": "about:blank",
  "title": "Error Type",
  "status": 400,
  "detail": "Error message describing the issue",
  "instance": "/api/users/avatar"
}
```

### 2. Frontend Components

#### ImageUpload Component
**File**: `src/components/ImageUpload.tsx`

**Features**:
- Drag-and-drop or click-to-upload interface
- Real-time preview of selected image
- File validation before upload
- Upload/Cancel buttons for confirmed uploads
- Error messages for invalid files
- Loading state during upload
- Callback handler for successful uploads

**Props**:
```typescript
interface ImageUploadProps extends HTMLAttributes<HTMLDivElement> {
  onUpload?: (avatarUrl: string) => void;  // Called on successful upload
  isUploading?: boolean;                    // External loading state
  authToken?: string;                       // Authentication token for API
}
```

#### UserAvatarLoader Component
**File**: `src/components/dashboard/global/UserAvatarLoader.tsx`

**Features**:
- Fetches current user data on mount
- Displays user avatar from database
- Shows loading skeleton while fetching
- Falls back to default image if no avatar
- Links to settings page on click
- Auto-refreshes when avatar updates

#### Settings Page
**File**: `src/app/settings/page.tsx`

**Features**:
- Full profile management interface
- Current avatar preview
- Image upload section using ImageUpload component
- User information display (email, name, username, status)
- Success notification after upload
- Loading and error states
- Back navigation
- Responsive design (mobile & desktop)

### 3. Custom Hook
**File**: `src/hooks/useUser.ts`

**Functionality**:
```typescript
function useUser() {
  return {
    user: User | null,           // Current user data
    isLoading: boolean,           // Loading state
    error: string | null,         // Error message
    token: string | null,         // Auth token
    updateUser: (user) => void    // Update user data
  }
}
```

## File Storage

### Storage Location
- **Path**: `public/avatars/`
- **URL Format**: `/avatars/{userId}-{timestamp}.{ext}`
- **Supported Extensions**: `.jpg` (for JPEG), `.png` (for PNG)

### Example
User ID: `550e8400-e29b-41d4-a716-446655440000`
File: `550e8400-e29b-41d4-a716-446655440000-1716909234567.jpg`
URL: `/avatars/550e8400-e29b-41d4-a716-446655440000-1716909234567.jpg`

## Database Integration

### Updated User Table Column
```sql
avatarUrl (text) - Stores the avatar URL path
```

The column already exists in the schema:
```typescript
avatarUrl: text("avatar_url"),
```

### Update Query Pattern
```typescript
await db
  .update(users)
  .set({ avatarUrl: "/avatars/..." })
  .where(eq(users.id, userId))
  .returning();
```

## User Flow

### 1. Settings Page Navigation
```
Dashboard → NavBar Avatar → Settings Page
```

### 2. Avatar Upload Flow
```
1. User clicks ImageUpload area
2. File dialog opens
3. User selects JPEG or PNG image
4. Image preview displayed with Cancel/Upload buttons
5. User clicks Upload
6. POST /api/users/avatar with FormData
7. Server validates and stores file
8. Database updated with new avatarUrl
9. Success notification shown
10. Settings page shows new avatar
11. NavBar avatar updates automatically
12. Profile page shows updated avatar
```

### 3. Avatar Display
```
Public Routes:
- NavBar (desktop view) - Shows current user avatar
- Profile Page (when implemented)
- Dashboard Header
- Gift sent confirmations (when implemented)
```

## Testing Instructions

### Test 1: Successful Upload
1. Navigate to `/settings`
2. Scroll to "Upload New Picture" section
3. Click the upload area
4. Select a JPEG or PNG image (< 10MB)
5. Verify preview shows the image
6. Click "Upload" button
7. Wait for success notification
8. Verify avatar appears in:
   - Settings page (current avatar section)
   - NavBar (desktop view)
   - Check browser DevTools Network tab - POST request to `/api/users/avatar`
   - Check filesystem: `public/avatars/` contains new file

### Test 2: File Type Validation
1. Navigate to `/settings`
2. Try to upload a non-image file (.txt, .pdf, .gif)
3. Verify error message: "Invalid file type. Only JPEG and PNG are allowed"
4. Try uploading a GIF image
5. Verify error message: "Invalid file type. Only JPEG and PNG are allowed"

### Test 3: File Size Validation
1. Create or find an image file > 10MB
2. Navigate to `/settings`
3. Try to upload the large file
4. Verify error message: "File size exceeds 10MB limit"

### Test 4: Authentication Validation
1. Open Browser DevTools Console
2. Manually call the API without token:
   ```javascript
   const formData = new FormData();
   fetch('/api/users/avatar', {
     method: 'POST',
     body: formData
   }).then(r => r.json()).then(console.log)
   ```
3. Verify error response (401): "Authentication required"

### Test 5: Avatar Persistence
1. Upload an avatar
2. Verify success and avatar displays
3. Refresh the page
4. Verify avatar still displays (persisted in database)
5. Open DevTools Console and check `GET /api/auth/me` response
6. Verify `avatarUrl` is returned in user object

### Test 6: Avatar Gallery (Optional)
1. Upload multiple avatars (create new user accounts if needed)
2. Each should have unique filename with timestamp
3. Files should accumulate in `public/avatars/`
4. Can delete old avatar files if needed

### Test 7: Image File Format Verification
```bash
# Check uploaded files
ls -la public/avatars/

# Should show files like:
# 550e8400-e29b-41d4-a716-446655440000-1716909234567.jpg
# 660f8401-e39c-41e4-b816-447766551111-1716909245678.png
```

## API Response Examples

### Success Response (200)
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "/avatars/550e8400-e29b-41d4-a716-446655440000-1716909234567.jpg"
  }
}
```

### Missing File Error (400)
```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "No file provided. Please upload an image file.",
  "instance": "/api/users/avatar"
}
```

### Invalid File Type Error (400)
```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid file type. Only JPEG and PNG are allowed. Received: image/gif",
  "instance": "/api/users/avatar"
}
```

### File Too Large Error (413)
```json
{
  "type": "about:blank",
  "title": "Payload Too Large",
  "status": 413,
  "detail": "File size exceeds 10MB limit. File size: 15.50MB",
  "instance": "/api/users/avatar"
}
```

### Unauthorized Error (401)
```json
{
  "type": "about:blank",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Authentication required. Please provide a valid Bearer token.",
  "instance": "/api/users/avatar"
}
```

### User Not Found Error (404)
```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "User not found",
  "instance": "/api/users/avatar"
}
```

### Server Error (500)
```json
{
  "type": "about:blank",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred while processing your avatar upload",
  "instance": "/api/users/avatar",
  "error": "ENOENT: no such file or directory..."
}
```

## Troubleshooting

### Upload Fails with 401 Unauthorized
- Verify you're logged in
- Check that Bearer token is being passed
- Ensure token is not expired

### Upload Fails with 400 Bad Request
- Check file type is JPEG or PNG
- Verify file size is under 10MB
- Ensure a file is actually selected

### Avatar Not Appearing After Upload
- Check browser console for errors
- Verify `public/avatars/` directory exists and is writable
- Check database: `SELECT avatarUrl FROM users WHERE id = '...'`
- Try hard-refresh the page (Ctrl+F5 or Cmd+Shift+R)

### Network Error During Upload
- Check console for CORS errors
- Verify API endpoint is running (`/api/users/avatar`)
- Check server logs for errors
- Verify form-data is being sent correctly

### File Size Calculation Wrong
- Note: JavaScript `file.size` is in bytes
- 10MB = 10 * 1024 * 1024 = 10,485,760 bytes
- Check file size before uploading

## Security Considerations

1. **Authentication**: All uploads require valid Bearer token
2. **File Validation**: Only JPEG and PNG files accepted
3. **Size Limits**: 10MB maximum file size enforced
4. **MIME Type**: Validated on server-side
5. **Filename**: Randomized with userId + timestamp to prevent overwrites
6. **Storage**: Files stored in public directory (accessible via HTTP)

## Future Enhancements

1. **Image Resizing**: Resize/crop large images
2. **CDN Integration**: Upload to S3, Cloudinary, or similar
3. **Advanced Validation**: Check image header for actual file type (magic bytes)
4. **Rate Limiting**: Limit upload frequency per user
5. **Deletion**: Allow users to remove avatar
6. **Multiple Formats**: Support WebP, SVG
7. **Image Compression**: Optimize images for faster loading
8. **Batch Operations**: Upload multiple images

## Environment Variables

No additional environment variables required. Uses existing:
- `DATABASE_URL`: For database operations
- `NEXT_PUBLIC_API_URL`: For API routing (if applicable)

## Dependencies

All dependencies already installed in project:
- `next/server`: For NextRequest/NextResponse
- `drizzle-orm`: For database operations
- `node:fs/promises`: For file writing (built-in Node.js)
- `node:path`: For path operations (built-in Node.js)

## Files Modified/Created

```
✅ src/app/api/users/avatar/route.ts (new)
✅ src/components/ImageUpload.tsx (updated)
✅ src/components/dashboard/global/NavBar.tsx (updated)
✅ src/components/dashboard/global/UserAvatarLoader.tsx (new)
✅ src/hooks/useUser.ts (new)
✅ src/app/settings/page.tsx (updated)
✅ public/avatars/.gitkeep (new)
```

## Support
For questions or issues, contact: emry_ss on Discord

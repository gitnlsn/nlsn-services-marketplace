# Storage Setup Guide

This marketplace supports two storage providers: Cloudinary and AWS S3. You can choose either one based on your needs.

## AWS S3 Setup

### 1. Install Required Packages

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
npm install --save-dev @types/uuid
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name

# Set storage provider to S3
STORAGE_PROVIDER=s3
```

### 3. Create S3 Bucket

1. Go to AWS S3 Console
2. Create a new bucket
3. Configure bucket settings:
   - Enable public access if you want images to be publicly accessible
   - OR configure CloudFront for CDN delivery
   - Set up CORS policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 4. Create IAM User

1. Go to AWS IAM Console
2. Create a new user with programmatic access
3. Attach policy with S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::your-bucket-name"
    }
  ]
}
```

## Cloudinary Setup

### 1. Configure Environment Variables

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Set storage provider to Cloudinary (optional, it's the default)
STORAGE_PROVIDER=cloudinary
```

### 2. Get Cloudinary Credentials

1. Sign up at https://cloudinary.com
2. Go to Dashboard
3. Copy your Cloud Name, API Key, and API Secret

## Usage in the Application

The application automatically uses the configured storage provider. The unified storage service handles:

- File uploads
- File deletion
- Signed URL generation for direct uploads
- Image optimization (Cloudinary only)

### Upload Images

Images can be uploaded through:
1. Service creation/editing forms
2. Profile image updates
3. Any form with the ImageUpload component

### Storage Provider Status

You can check which storage provider is configured by calling the `getStorageStatus` API:

```typescript
const { data } = api.upload.getStorageStatus.useQuery();
console.log(data); 
// Output: { provider: 's3', configured: true, providers: { cloudinary: false, s3: true } }
```

## Switching Storage Providers

To switch between providers:

1. Update the `STORAGE_PROVIDER` environment variable
2. Ensure the required credentials are configured
3. Restart the application

Note: Existing images will remain accessible from their original provider. The system stores the full URL for each image.

## Best Practices

### For AWS S3:
- Use CloudFront for global CDN delivery
- Enable versioning for backup
- Set up lifecycle policies for old images
- Monitor costs with AWS Cost Explorer

### For Cloudinary:
- Use transformations for on-the-fly image optimization
- Set up upload presets for consistent processing
- Monitor usage to stay within free tier limits
- Use auto-tagging for better organization

## Troubleshooting

### S3 Upload Fails
- Check IAM permissions
- Verify bucket exists and region is correct
- Ensure CORS is properly configured
- Check if bucket allows public access (if needed)

### Cloudinary Upload Fails
- Verify API credentials
- Check upload preset settings
- Monitor API rate limits
- Ensure file size is within limits

### General Issues
- Check `STORAGE_PROVIDER` environment variable
- Verify all required credentials are set
- Check browser console for errors
- Monitor server logs for detailed error messages
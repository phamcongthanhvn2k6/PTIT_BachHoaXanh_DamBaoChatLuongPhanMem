import { v2 as cloudinary } from 'cloudinary';

// Check if Cloudinary is fully configured in the environment
const isConfigured = !!(
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME &&
   process.env.CLOUDINARY_API_KEY &&
   process.env.CLOUDINARY_API_SECRET)
);

if (isConfigured) {
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  console.log('[Cloudinary] ✅ Cloudinary configured successfully.');
} else {
  console.info('[Cloudinary] ⚠️ Cloudinary is not configured. Will use local GridFS fallback.');
}

/**
 * Uploads a file buffer directly to Cloudinary.
 * @param {Buffer} fileBuffer - The file buffer to upload.
 * @param {string} category - The folder/category name.
 * @returns {Promise<string|null>} Resolves with the secure_url, or null if Cloudinary is not configured.
 */
export const uploadToCloudinary = (fileBuffer, category = 'general') => {
  return new Promise((resolve, reject) => {
    if (!isConfigured) {
      return resolve(null);
    }

    const folder = `bachhoaxanh/${category}s`;
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Upload stream error:', error);
          return reject(error);
        }
        if (result && result.secure_url) {
          resolve(result.secure_url);
        } else {
          resolve(null);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export const isCloudinaryReady = () => isConfigured;

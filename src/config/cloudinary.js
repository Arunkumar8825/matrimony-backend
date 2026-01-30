const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Upload image to Cloudinary
const uploadToCloudinary = async (file, folder = 'yadhavar_matrimony') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `${folder}/${Date.now()}`,
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};

// Upload multiple images
const uploadMultipleToCloudinary = async (files, folder = 'yadhavar_matrimony') => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    throw new Error('Failed to upload images');
  }
};

// Generate image URL with transformations
const generateImageUrl = (public_id, transformations = []) => {
  return cloudinary.url(public_id, {
    transformation: transformations
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  generateImageUrl
};
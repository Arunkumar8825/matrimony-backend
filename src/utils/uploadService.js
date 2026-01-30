const fs = require('fs');
const path = require('path');
const { cloudinary, uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

class UploadService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.ensureUploadDirectories();
  }

  // Ensure upload directories exist
  ensureUploadDirectories() {
    const directories = [
      'profiles',
      'documents', 
      'horoscopes',
      'chat',
      'temp'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  // Upload single file
  async uploadFile(file, folder = 'profiles', options = {}) {
    try {
      const { public_id, url } = await uploadToCloudinary(file, folder);
      
      return {
        success: true,
        data: {
          public_id,
          url,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        }
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: 'Failed to upload file'
      };
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(files, folder = 'profiles', options = {}) {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, folder, options));
      const results = await Promise.all(uploadPromises);

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: true,
        data: {
          uploaded: successful.map(r => r.data),
          failed: failed.length,
          total: files.length
        }
      };
    } catch (error) {
      console.error('Multiple upload error:', error);
      return {
        success: false,
        error: 'Failed to upload files'
      };
    }
  }

  // Delete file
  async deleteFile(public_id) {
    try {
      const result = await deleteFromCloudinary(public_id);
      
      if (result.result === 'ok') {
        return {
          success: true,
          message: 'File deleted successfully'
        };
      } else {
        return {
          success: false,
          error: 'Failed to delete file'
        };
      }
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: 'Failed to delete file'
      };
    }
  }

  // Delete multiple files
  async deleteMultipleFiles(public_ids) {
    try {
      const deletePromises = public_ids.map(public_id => this.deleteFile(public_id));
      const results = await Promise.all(deletePromises);

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: true,
        data: {
          deleted: successful.length,
          failed: failed.length,
          total: public_ids.length
        }
      };
    } catch (error) {
      console.error('Multiple delete error:', error);
      return {
        success: false,
        error: 'Failed to delete files'
      };
    }
  }

  // Compress image
  async compressImage(file, options = {}) {
    try {
      // This is a simplified version
      // In production, use sharp or imagemagick for image compression
      
      const { quality = 80, maxWidth = 800, maxHeight = 800 } = options;
      
      // For now, return the original file
      // Implement actual compression logic here
      
      return {
        success: true,
        data: file
      };
    } catch (error) {
      console.error('Compression error:', error);
      return {
        success: false,
        error: 'Failed to compress image'
      };
    }
  }

  // Validate file
  validateFile(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
    const errors = [];

    // Check if file exists
    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      errors.push(`File size exceeds ${maxSizeMB}MB limit`);
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate file URL
  generateFileUrl(public_id, transformations = []) {
    try {
      const url = cloudinary.url(public_id, {
        transformation: transformations
      });
      return url;
    } catch (error) {
      console.error('URL generation error:', error);
      return null;
    }
  }

  // Get file information
  async getFileInfo(public_id) {
    try {
      const result = await cloudinary.api.resource(public_id);
      return {
        success: true,
        data: {
          public_id: result.public_id,
          url: result.secure_url,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          createdAt: result.created_at
        }
      };
    } catch (error) {
      console.error('File info error:', error);
      return {
        success: false,
        error: 'Failed to get file information'
      };
    }
  }

  // Create thumbnail
  async createThumbnail(public_id, width = 150, height = 150) {
    try {
      const thumbnailUrl = cloudinary.url(public_id, {
        transformation: [
          { width, height, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      
      return {
        success: true,
        data: {
          thumbnailUrl,
          width,
          height
        }
      };
    } catch (error) {
      console.error('Thumbnail creation error:', error);
      return {
        success: false,
        error: 'Failed to create thumbnail'
      };
    }
  }

  // Save file locally (for testing/development)
  saveFileLocally(file, subfolder = 'temp') {
    try {
      const uploadPath = path.join(this.uploadDir, subfolder);
      
      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const extension = path.extname(file.originalname);
      const filename = `${timestamp}-${randomString}${extension}`;
      const filepath = path.join(uploadPath, filename);

      // Save file
      fs.writeFileSync(filepath, file.buffer);

      return {
        success: true,
        data: {
          filename,
          filepath,
          url: `/uploads/${subfolder}/${filename}`,
          size: file.size,
          mimetype: file.mimetype
        }
      };
    } catch (error) {
      console.error('Local save error:', error);
      return {
        success: false,
        error: 'Failed to save file locally'
      };
    }
  }

  // Clean up temporary files
  cleanupTempFiles(maxAgeHours = 24) {
    try {
      const tempPath = path.join(this.uploadDir, 'temp');
      
      if (!fs.existsSync(tempPath)) {
        return { success: true, deleted: 0 };
      }

      const files = fs.readdirSync(tempPath);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      files.forEach(file => {
        const filePath = path.join(tempPath, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      });

      return {
        success: true,
        deleted: deletedCount
      };
    } catch (error) {
      console.error('Cleanup error:', error);
      return {
        success: false,
        error: 'Failed to cleanup temporary files'
      };
    }
  }
}

module.exports = new UploadService();
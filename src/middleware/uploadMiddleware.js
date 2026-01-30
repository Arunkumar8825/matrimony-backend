const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Images, PDFs and Word docs only!'));
  }
};

// Local storage for development
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    let folder = 'uploads/';
    
    if (file.fieldname === 'profilePhoto') {
      folder += 'profiles/';
    } else if (file.fieldname === 'horoscope') {
      folder += 'horoscopes/';
    } else if (file.fieldname === 'document') {
      folder += 'documents/';
    } else {
      folder += 'others/';
    }
    
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    
    cb(null, folder);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Cloudinary storage for production
const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      let folder = 'yadhavar_matrimony/';
      
      if (file.fieldname === 'profilePhoto') {
        folder += 'profiles/';
      } else if (file.fieldname === 'horoscope') {
        folder += 'horoscopes/';
      } else if (file.fieldname === 'document') {
        folder += 'documents/';
      } else {
        folder += 'others/';
      }
      
      return folder;
    },
    format: async (req, file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          return 'jpg';
        case '.png':
          return 'png';
        case '.gif':
          return 'gif';
        case '.pdf':
          return 'pdf';
        default:
          return 'jpg';
      }
    },
    public_id: (req, file) => {
      return `${Date.now()}-${path.parse(file.originalname).name}`;
    }
  }
});

// Choose storage based on environment
const usedStorage = process.env.NODE_ENV === 'production' ? cloudStorage : storage;

const upload = multer({
  storage: usedStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Single file upload
exports.uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple files upload
exports.uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);

// Mixed fields upload
exports.uploadFields = (fields) => upload.fields(fields);

// Error handler for multer
exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  next();
};
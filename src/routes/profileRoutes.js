const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadPhotos,
  deletePhoto,
  updatePrivacy,
  getProfileCompletion
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const { uploadSingle, uploadMultiple } = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getProfile)
  .put(protect, updateProfile);

router.route('/photo')
  .post(protect, uploadSingle('profilePhoto'), uploadProfilePhoto);

router.route('/photos')
  .post(protect, uploadMultiple('photos', 10), uploadPhotos);

router.route('/photos/:photoId')
  .delete(protect, deletePhoto);

router.route('/privacy')
  .put(protect, updatePrivacy);

router.route('/completion')
  .get(protect, getProfileCompletion);

router.route('/:userId')
  .get(protect, getProfile);

module.exports = router;
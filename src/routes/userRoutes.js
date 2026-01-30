const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/verify-email', userController.verifyEmail);
router.post('/resend-verification', userController.resendVerification);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Protected routes (require authentication)
router.use(authMiddleware.protect);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', uploadMiddleware.uploadPhotos, userController.updateProfile);
router.get('/profile/:id', userController.getPublicProfile);
router.post('/profile/complete', userController.completeProfile);
router.put('/profile/visibility', userController.updateVisibility);

// Subscription & Payment routes
router.get('/subscription', userController.getSubscription);
router.post('/subscription/upgrade', userController.upgradeSubscription);
router.get('/payment-history', userController.getPaymentHistory);
router.post('/payment/verify', userController.verifyPayment);

// Matching & Interaction routes
router.get('/matches', userController.getMatches);
router.post('/interest/:userId', userController.sendInterest);
router.post('/interest/:interestId/accept', userController.acceptInterest);
router.post('/interest/:interestId/decline', userController.declineInterest);
router.get('/interests/received', userController.getReceivedInterests);
router.get('/interests/sent', userController.getSentInterests);

// Search routes
router.get('/search', userController.searchProfiles);
router.post('/search/save', userController.saveSearch);
router.get('/search/saved', userController.getSavedSearches);

// Communication routes
router.get('/messages', userController.getMessages);
router.post('/messages/:userId', userController.sendMessage);
router.get('/messages/:userId', userController.getConversation);

// Privacy & Settings
router.put('/settings/privacy', userController.updatePrivacySettings);
router.put('/settings/notifications', userController.updateNotificationSettings);
router.post('/block/:userId', userController.blockUser);
router.post('/report/:userId', userController.reportUser);

// Account management
router.put('/change-password', userController.changePassword);
router.put('/update-email', userController.updateEmail);
router.delete('/account', userController.deleteAccount);
router.get('/activity', userController.getActivityLog);

// Admin only routes
router.use(authMiddleware.restrictTo('admin', 'moderator'));
router.get('/admin/users', userController.getAllUsers);
router.put('/admin/users/:id/status', userController.updateUserStatus);
router.get('/admin/reports', userController.getReports);
router.post('/admin/verify-profile/:userId', userController.verifyProfile);
router.get('/admin/analytics', userController.getAnalytics);

module.exports = router;
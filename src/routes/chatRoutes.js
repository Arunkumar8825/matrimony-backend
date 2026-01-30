const express = require('express');
const router = express.Router();
const {
  getOrCreateChat,
  getUserChats,
  getChatMessages,
  sendMessage,
  markAsRead,
  deleteChat,
  blockChat,
  unblockChat
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getUserChats)
  .post(protect, getOrCreateChat);

router.route('/:chatId/messages')
  .get(protect, getChatMessages)
  .post(protect, sendMessage);

router.route('/:chatId/read')
  .put(protect, markAsRead);

router.route('/:chatId')
  .delete(protect, deleteChat);

router.route('/:chatId/block')
  .put(protect, blockChat);

router.route('/:chatId/unblock')
  .put(protect, unblockChat);

module.exports = router;
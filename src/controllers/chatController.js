const Chat = require('../models/Chat');
const Interest = require('../models/Interest');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get or create chat
// @route   POST /api/chats
// @access  Private
exports.getOrCreateChat = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, userId] }
    }).populate('participants', 'firstName lastName profilePhoto');

    if (!chat) {
      // Check if users have accepted each other
      const interest = await Interest.findOne({
        $or: [
          { fromUser: req.user.id, toUser: userId, status: 'Accepted' },
          { fromUser: userId, toUser: req.user.id, status: 'Accepted' }
        ]
      });

      if (!interest && !req.user.isPremium) {
        return res.status(403).json({
          success: false,
          error: 'You need to be premium or have accepted interest to start chat'
        });
      }

      // Create new chat
      chat = await Chat.create({
        participants: [req.user.id, userId]
      });

      chat = await Chat.findById(chat._id)
        .populate('participants', 'firstName lastName profilePhoto');
    }

    res.status(200).json({
      success: true,
      data: chat
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get user chats
// @route   GET /api/chats
// @access  Private
exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
      deletedFor: { $ne: req.user.id }
    })
    .populate('participants', 'firstName lastName profilePhoto')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get chat messages
// @route   GET /api/chats/:chatId/messages
// @access  Private
exports.getChatMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Check if user is participant
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    const messages = await Message.find({
      chatId: req.params.chatId,
      deletedFor: { $ne: req.user.id }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('sender', 'firstName lastName profilePhoto');

    const total = await Message.countDocuments({
      chatId: req.params.chatId,
      deletedFor: { $ne: req.user.id }
    });

    res.status(200).json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: messages.reverse() // Return in chronological order
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Send message
// @route   POST /api/chats/:chatId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;

    // Check if user is participant
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Check if chat is blocked
    if (chat.isBlocked && chat.blockedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Chat is blocked'
      });
    }

    // Get receiver
    const receiverId = chat.participants.find(
      p => p.toString() !== req.user.id.toString()
    );

    // Create message
    const message = await Message.create({
      chatId: req.params.chatId,
      sender: req.user.id,
      receiver: receiverId,
      content,
      type
    });

    // Update chat last message
    chat.lastMessage = message._id;
    
    // Increment unread count for receiver
    const unreadCount = chat.unreadCount.get(receiverId.toString()) || 0;
    chat.unreadCount.set(receiverId.toString(), unreadCount + 1);
    
    await chat.save();

    // Populate sender info
    await message.populate('sender', 'firstName lastName profilePhoto');

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chats/:chatId/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Mark all messages as read
    await Message.updateMany(
      {
        chatId: req.params.chatId,
        receiver: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: Date.now()
      }
    );

    // Reset unread count for user
    chat.unreadCount.set(req.user.id.toString(), 0);
    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Delete chat
// @route   DELETE /api/chats/:chatId
// @access  Private
exports.deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Soft delete - add user to deletedFor array
    if (!chat.deletedFor.includes(req.user.id)) {
      chat.deletedFor.push(req.user.id);
      await chat.save();
    }

    res.status(200).json({
      success: true,
      message: 'Chat deleted'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Block chat
// @route   PUT /api/chats/:chatId/block
// @access  Private
exports.blockChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    chat.isBlocked = true;
    chat.blockedBy = req.user.id;
    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Chat blocked'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Unblock chat
// @route   PUT /api/chats/:chatId/unblock
// @access  Private
exports.unblockChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Only the user who blocked can unblock
    if (chat.blockedBy.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to unblock'
      });
    }

    chat.isBlocked = false;
    chat.blockedBy = null;
    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Chat unblocked'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

class SocketService {
  constructor() {
    this.io = null;
    this.onlineUsers = new Map(); // userId -> socketId
  }

  // Initialize socket service
  initialize(io) {
    this.io = io;

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    // Connection handler
    io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.user._id} (${socket.user.email})`);
      
      // Add user to online users
      this.onlineUsers.set(socket.user._id.toString(), socket.id);
      
      // Broadcast online status
      this.broadcastOnlineStatus(socket.user._id, true);

      // Join user to their personal room
      socket.join(`user:${socket.user._id}`);

      // Join chat rooms
      this.joinChatRooms(socket);

      // Event handlers
      this.setupEventHandlers(socket);

      // Disconnect handler
      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.user._id}`);
        
        // Remove user from online users
        this.onlineUsers.delete(socket.user._id.toString());
        
        // Broadcast offline status
        this.broadcastOnlineStatus(socket.user._id, false);
      });
    });

    console.log('✅ Socket service initialized');
  }

  // Join user to their chat rooms
  async joinChatRooms(socket) {
    try {
      const chats = await Chat.find({
        participants: socket.user._id,
        deletedFor: { $ne: socket.user._id }
      });

      chats.forEach(chat => {
        socket.join(`chat:${chat._id}`);
      });
    } catch (error) {
      console.error('Error joining chat rooms:', error);
    }
  }

  // Setup event handlers
  setupEventHandlers(socket) {
    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, type = 'text' } = data;
        
        if (!chatId || !content) {
          return socket.emit('error', { message: 'Missing required fields' });
        }

        // Check if user is participant in chat
        const chat = await Chat.findOne({
          _id: chatId,
          participants: socket.user._id
        });

        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        // Get receiver
        const receiverId = chat.participants.find(
          p => p.toString() !== socket.user._id.toString()
        );

        // Create message
        const message = await Message.create({
          chatId,
          sender: socket.user._id,
          receiver: receiverId,
          content,
          type
        });

        // Update chat
        chat.lastMessage = message._id;
        
        // Increment unread count for receiver
        const unreadCount = chat.unreadCount.get(receiverId.toString()) || 0;
        chat.unreadCount.set(receiverId.toString(), unreadCount + 1);
        
        await chat.save();

        // Populate sender info
        await message.populate('sender', 'firstName lastName profilePhoto');

        // Emit to chat room
        this.io.to(`chat:${chatId}`).emit('receive_message', {
          message,
          chatId
        });

        // Emit notification to receiver
        const receiverSocketId = this.onlineUsers.get(receiverId.toString());
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('new_message_notification', {
            message,
            chatId,
            sender: message.sender
          });
        }

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', async (data) => {
      try {
        const { chatId, isTyping } = data;
        
        if (!chatId) {
          return socket.emit('error', { message: 'Chat ID is required' });
        }

        // Check if user is participant in chat
        const chat = await Chat.findOne({
          _id: chatId,
          participants: socket.user._id
        });

        if (!chat) {
          return socket.emit('error', { message: 'Chat not found' });
        }

        // Get receiver
        const receiverId = chat.participants.find(
          p => p.toString() !== socket.user._id.toString()
        );

        // Emit typing indicator to receiver
        const receiverSocketId = this.onlineUsers.get(receiverId.toString());
        if (receiverSocketId) {
          this.io.to(receiverSocketId).emit('user_typing', {
            chatId,
            userId: socket.user._id,
            isTyping,
            userName: `${socket.user.firstName} ${socket.user.lastName}`
          });
        }

      } catch (error) {
        console.error('Typing indicator error:', error);
      }
    });

    // Mark messages as read
    socket.on('mark_read', async (data) => {
      try {
        const { chatId, messageIds } = data;
        
        if (!chatId || !messageIds || !Array.isArray(messageIds)) {
          return socket.emit('error', { message: 'Missing required fields' });
        }

        // Update messages as read
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            receiver: socket.user._id,
            isRead: false
          },
          {
            isRead: true,
            readAt: Date.now()
          }
        );

        // Update chat unread count
        const chat = await Chat.findById(chatId);
        if (chat) {
          chat.unreadCount.set(socket.user._id.toString(), 0);
          await chat.save();
        }

        // Emit read receipt to sender
        const chatParticipants = chat.participants.map(p => p.toString());
        const senderId = chatParticipants.find(id => id !== socket.user._id.toString());
        
        if (senderId) {
          const senderSocketId = this.onlineUsers.get(senderId);
          if (senderSocketId) {
            this.io.to(senderSocketId).emit('messages_read', {
              chatId,
              messageIds,
              readBy: socket.user._id,
              readAt: new Date()
            });
          }
        }

      } catch (error) {
        console.error('Mark read error:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Call events
    socket.on('call_user', (data) => {
      const { userId, callType } = data;
      
      const receiverSocketId = this.onlineUsers.get(userId);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit('incoming_call', {
          callerId: socket.user._id,
          callerName: `${socket.user.firstName} ${socket.user.lastName}`,
          callType,
          callId: data.callId
        });
      }
    });

    socket.on('call_accepted', (data) => {
      const { callerId, callId } = data;
      
      const callerSocketId = this.onlineUsers.get(callerId);
      if (callerSocketId) {
        this.io.to(callerSocketId).emit('call_accepted', {
          callId,
          acceptedBy: socket.user._id
        });
      }
    });

    socket.on('call_rejected', (data) => {
      const { callerId, callId } = data;
      
      const callerSocketId = this.onlineUsers.get(callerId);
      if (callerSocketId) {
        this.io.to(callerSocketId).emit('call_rejected', {
          callId,
          rejectedBy: socket.user._id
        });
      }
    });

    socket.on('call_ended', (data) => {
      const { callId, participantIds } = data;
      
      participantIds.forEach(participantId => {
        const participantSocketId = this.onlineUsers.get(participantId);
        if (participantSocketId) {
          this.io.to(participantSocketId).emit('call_ended', {
            callId,
            endedBy: socket.user._id
          });
        }
      });
    });

    // Online status
    socket.on('get_online_status', (data) => {
      const { userIds } = data;
      
      if (!Array.isArray(userIds)) {
        return socket.emit('error', { message: 'User IDs must be an array' });
      }

      const statuses = userIds.map(userId => ({
        userId,
        isOnline: this.onlineUsers.has(userId),
        lastSeen: new Date() // In production, store and retrieve actual last seen
      }));

      socket.emit('online_statuses', statuses);
    });

    // New interest notification
    socket.on('new_interest', (data) => {
      const { receiverId, interestData } = data;
      
      const receiverSocketId = this.onlineUsers.get(receiverId);
      if (receiverSocketId) {
        this.io.to(receiverSocketId).emit('interest_received', interestData);
      }
    });

    // Interest response notification
    socket.on('interest_response', (data) => {
      const { senderId, responseData } = data;
      
      const senderSocketId = this.onlineUsers.get(senderId);
      if (senderSocketId) {
        this.io.to(senderSocketId).emit('interest_responded', responseData);
      }
    });
  }

  // Broadcast online status to relevant users
  broadcastOnlineStatus(userId, isOnline) {
    // In production, you would track which users should be notified
    // For now, broadcast to all online users
    this.io.emit('user_status_change', {
      userId,
      isOnline,
      timestamp: new Date()
    });
  }

  // Send notification to specific user
  sendNotification(userId, notification) {
    const socketId = this.onlineUsers.get(userId.toString());
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }

  // Send notification to multiple users
  sendNotificationToUsers(userIds, notification) {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId.toString());
  }

  // Get socket ID for user
  getUserSocketId(userId) {
    return this.onlineUsers.get(userId.toString());
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.onlineUsers.size;
  }

  // Get online users list
  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }
}

module.exports = new SocketService();
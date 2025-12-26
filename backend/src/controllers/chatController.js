const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

// @desc    Get all messages for user
// @route   GET /api/chat
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { receiver_id } = req.query;
    const query = {
      $or: [
        { sender_id: req.user._id },
        { receiver_id: req.user._id }
      ]
    };

    if (receiver_id) {
      query.$or = [
        { sender_id: req.user._id, receiver_id },
        { sender_id: receiver_id, receiver_id: req.user._id }
      ];
    }

    const messages = await ChatMessage.find(query)
      .populate('sender_id', 'username first_name last_name profile_picture')
      .populate('receiver_id', 'username first_name last_name profile_picture')
      .sort({ created_at: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single message
// @route   GET /api/chat/:id
// @access  Private
const getMessage = async (req, res, next) => {
  try {
    const message = await ChatMessage.findById(req.params.id)
      .populate('sender_id', 'username first_name last_name profile_picture')
      .populate('receiver_id', 'username first_name last_name profile_picture');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check authorization
    if (message.sender_id._id.toString() !== req.user._id.toString() &&
        message.receiver_id._id.toString() !== req.user._id.toString() &&
        req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this message'
      });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/chat
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { receiver_id, message, message_type } = req.body;

    // Verify receiver exists
    const receiver = await User.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const chatMessage = await ChatMessage.create({
      sender_id: req.user._id,
      receiver_id,
      message,
      message_type: message_type || 'Text'
    });

    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate('sender_id', 'username first_name last_name profile_picture')
      .populate('receiver_id', 'username first_name last_name profile_picture');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update message (mark as resolved, etc.)
// @route   PUT /api/chat/:id
// @access  Private
const updateMessage = async (req, res, next) => {
  try {
    let chatMessage = await ChatMessage.findById(req.params.id);

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check authorization
    if (chatMessage.sender_id.toString() !== req.user._id.toString() &&
        chatMessage.receiver_id.toString() !== req.user._id.toString() &&
        req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this message'
      });
    }

    chatMessage = await ChatMessage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('sender_id', 'username first_name last_name profile_picture')
      .populate('receiver_id', 'username first_name last_name profile_picture');

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: chatMessage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message
// @route   DELETE /api/chat/:id
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const chatMessage = await ChatMessage.findById(req.params.id);

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check authorization
    if (chatMessage.sender_id.toString() !== req.user._id.toString() &&
        req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await chatMessage.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  getMessage,
  sendMessage,
  updateMessage,
  deleteMessage
};


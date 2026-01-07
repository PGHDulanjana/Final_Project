const express = require('express');
const router = express.Router();
const {
  getMessages,
  getMessage,
  sendMessage,
  updateMessage,
  deleteMessage,
  sendBotMessage
} = require('../controllers/chatController');
const authenticate = require('../middlewares/authMiddleware');

router.get('/', authenticate, getMessages);
router.get('/:id', authenticate, getMessage);
router.post('/', authenticate, sendMessage);
router.post('/bot', authenticate, sendBotMessage);
router.put('/:id', authenticate, updateMessage);
router.delete('/:id', authenticate, deleteMessage);

module.exports = router;


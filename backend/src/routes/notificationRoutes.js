const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotification,
  createNotification,
  updateNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const authenticate = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authenticate, getNotifications);
router.get('/:id', authenticate, getNotification);
router.post('/', authenticate, roleMiddleware('Admin', 'Organizer'), createNotification);
router.put('/:id', authenticate, roleMiddleware('Admin', 'Organizer'), updateNotification);
router.put('/:id/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllAsRead);
router.delete('/:id', authenticate, deleteNotification);

module.exports = router;


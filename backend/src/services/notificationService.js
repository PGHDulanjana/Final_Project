const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitNotification } = require('../utils/socket');
const { sendNotificationEmail } = require('../utils/emailService');

// Create and send notification
const createAndSendNotification = async (userId, title, message, notificationType) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      title,
      message,
      notification_type: notificationType
    });

    // Emit real-time notification
    emitNotification(userId, notification.toObject());

    // Send email notification
    const user = await User.findById(userId);
    if (user && user.email) {
      await sendNotificationEmail(user.email, title, message);
    }

    return notification;
  } catch (error) {
    throw error;
  }
};

// Send bulk notifications
const sendBulkNotifications = async (userIds, title, message, notificationType) => {
  try {
    const notifications = [];
    for (const userId of userIds) {
      const notification = await createAndSendNotification(userId, title, message, notificationType);
      notifications.push(notification);
    }
    return notifications;
  } catch (error) {
    throw error;
  }
};

// Send match schedule notification
const sendMatchScheduleNotification = async (participantIds, matchName, scheduledTime) => {
  try {
    const title = 'Match Schedule Notification';
    const message = `Your match "${matchName}" is scheduled for ${scheduledTime}.`;
    
    return await sendBulkNotifications(
      participantIds,
      title,
      message,
      'Match Schedule'
    );
  } catch (error) {
    throw error;
  }
};

// Send payment reminder
const sendPaymentReminder = async (userId, tournamentName, amount) => {
  try {
    const title = 'Payment Reminder';
    const message = `Please complete your payment of $${amount} for ${tournamentName}.`;
    
    return await createAndSendNotification(userId, title, message, 'Payment');
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createAndSendNotification,
  sendBulkNotifications,
  sendMatchScheduleNotification,
  sendPaymentReminder
};


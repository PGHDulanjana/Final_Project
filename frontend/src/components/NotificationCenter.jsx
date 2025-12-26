import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiCheck, FiAlertCircle, FiInfo, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { initSocket, disconnectSocket, socket } from '../utils/socket';
import { notificationService } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { isPlayer, isAdmin, isJudge, isCoach, isOrganizer } = useAuth();

  useEffect(() => {
    // Load existing notifications from API
    loadNotifications();

    // Initialize socket for real-time notifications
    initSocket();

    socket?.on('notification', (data) => {
      const newNotification = {
        _id: Date.now().toString(),
        type: data.type || 'info',
        title: data.title || 'Notification',
        message: data.message || '',
        created_at: new Date().toISOString(),
        is_read: false,
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.info(data.message || data.title, {
        position: 'top-right',
        autoClose: 3000,
      });
    });

    return () => {
      // Don't disconnect socket here as it might be used elsewhere
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getNotifications();
      const notificationsData = response.data || [];
      
      // Sort by created_at (newest first) and take last 10 for dropdown
      const sorted = notificationsData
        .sort((a, b) => 
          new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
        )
        .slice(0, 10);
      
      setNotifications(sorted);
      setUnreadCount(sorted.filter(n => !n.is_read && !n.isRead).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Don't show error toast here as it might be annoying
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === id ? { ...notif, is_read: true, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Still update UI even if API call fails
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === id ? { ...notif, is_read: true, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
      // Still update UI even if API call fails
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true, isRead: true }))
      );
      setUnreadCount(0);
    }
  };

  const deleteNotification = (id) => {
    const notification = notifications.find(n => n._id === id);
    if (!notification.is_read && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifications(prev => prev.filter(n => n._id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <FiAlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <FiAlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <FiInfo className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <FiBell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Notifications</h3>
              <div className="flex items-center space-x-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Mark all as read
                  </button>
                )}
                {(isPlayer || isAdmin || isJudge || isCoach || isOrganizer) && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      if (isPlayer) navigate('/player/notifications');
                      else if (isCoach) navigate('/coach/notifications');
                      // Add other role notification pages if needed
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    View All
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <FiBell className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => {
                    const isRead = notification.is_read || notification.isRead;
                    const notificationDate = notification.created_at || notification.createdAt;
                    
                    return (
                      <motion.div
                        key={notification._id || notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-gray-50 transition ${
                          !isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type || notification.notification_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">
                              {notification.title || notification.message || 'Notification'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message || notification.content || notification.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notificationDate 
                                ? new Date(notificationDate).toLocaleString()
                                : notification.timestamp?.toLocaleTimeString() || 'Just now'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!isRead && (
                              <button
                                onClick={() => markAsRead(notification._id || notification.id)}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Mark as read"
                              >
                                <FiCheck className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification._id || notification.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Delete"
                            >
                              <FiX className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;


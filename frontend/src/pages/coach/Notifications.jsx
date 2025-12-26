import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiX, FiCheck, FiAlertCircle, FiInfo, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { notificationService } from '../../services/notificationService';
import { format } from 'date-fns';

const CoachNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications();
      const notificationsData = response.data || [];
      
      // Sort by created_at (newest first)
      const sorted = notificationsData.sort((a, b) => 
        new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
      );
      
      setNotifications(sorted);
      setUnreadCount(sorted.filter(n => !n.is_read && !n.isRead).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
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
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true, isRead: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      // Note: If backend has delete endpoint, use it here
      // For now, just remove from state
      const notification = notifications.find(n => n._id === id);
      if (!notification.is_read && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
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

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  Notifications
                </h1>
                <p className="text-gray-600">Stay updated with your team activities and tournaments</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
                >
                  <FiCheck className="w-4 h-4" />
                  <span>Mark all as read</span>
                </button>
              )}
            </div>
            {unreadCount > 0 && (
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  You have <span className="font-semibold">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FiBell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Notifications</h3>
              <p className="text-gray-600">You're all caught up! No new notifications.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const isRead = notification.is_read || notification.isRead;
                const notificationDate = notification.created_at || notification.createdAt;
                
                return (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
                      isRead
                        ? 'border-gray-300'
                        : 'border-blue-500 bg-blue-50'
                    } hover:shadow-xl transition-all`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type || notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold mb-2 ${
                              isRead ? 'text-gray-700' : 'text-gray-900'
                            }`}>
                              {notification.title || notification.message || 'Notification'}
                            </h3>
                            <p className="text-gray-600 mb-2">
                              {notification.message || notification.content || notification.title}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              {notificationDate && (
                                <span>
                                  {format(new Date(notificationDate), 'MMM dd, yyyy HH:mm')}
                                </span>
                              )}
                              {!isRead && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                                  New
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!isRead && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition"
                            title="Mark as read"
                          >
                            <FiCheck className="w-5 h-5 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition"
                          title="Delete"
                        >
                          <FiTrash2 className="w-5 h-5 text-gray-600 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CoachNotifications;


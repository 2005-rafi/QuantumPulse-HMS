/**
 * frontend/src/components/shell/NotificationCenter.jsx
 * Persistent Notification Bell & Alert Center.
 * Handles role-based broadcasts, urgent clinical alerts, and unread counts.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../constants/endpoints';
import './NotificationCenter.css';

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(API_ENDPOINTS.NOTIFICATIONS.BASE, {
        params: { unreadOnly: unreadOnly ? 'true' : 'false', limit: 25 },
      });
      const data = res.data?.data || { notifications: [], unreadCount: 0 };
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  // Initial load and periodic refresh every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'CRITICAL':
        return { icon: 'emergency_home', color: 'critical' };
      case 'WARNING':
        return { icon: 'warning', color: 'warning' };
      case 'CLINICAL_ALERT':
        return { icon: 'stethoscope', color: 'clinical' };
      case 'PHARMACY_ALERT':
        return { icon: 'medication', color: 'pharmacy' };
      case 'BILLING_ALERT':
        return { icon: 'receipt_long', color: 'billing' };
      default:
        return { icon: 'notifications', color: 'info' };
    }
  };

  return (
    <div className="md3-notif-container" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`md3-notif-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Staff Notifications"
        title="Hospital Alert Center"
      >
        <span className="material-symbols-rounded md3-notif-bell-icon">notifications</span>
        {unreadCount > 0 && (
          <span className="md3-notif-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Surface */}
      {isOpen && (
        <div className="md3-notif-dropdown">
          {/* Header */}
          <div className="md3-notif-header">
            <div className="md3-notif-header-title">
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                notifications_active
              </span>
              <span>Hospital Alerts</span>
              {unreadCount > 0 && (
                <span className="md3-notif-unread-pill">{unreadCount} New</span>
              )}
            </div>

            <div className="md3-notif-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="md3-notif-text-btn"
                  onClick={handleMarkAllAsRead}
                  title="Mark all notifications as read"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="md3-notif-filter-bar">
            <button
              type="button"
              className={`md3-notif-filter-btn ${!unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(false)}
            >
              All Alerts
            </button>
            <button
              type="button"
              className={`md3-notif-filter-btn ${unreadOnly ? 'active' : ''}`}
              onClick={() => setUnreadOnly(true)}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="md3-notif-list">
            {loading && notifications.length === 0 ? (
              <div className="md3-notif-empty">
                <span className="material-symbols-rounded md3-notif-spinner">progress_activity</span>
                <span>Checking alert channel...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="md3-notif-empty">
                <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.4 }}>
                  notifications_paused
                </span>
                <span style={{ fontWeight: 600 }}>All Caught Up</span>
                <span style={{ fontSize: '0.74rem', opacity: 0.8 }}>No hospital alerts pending.</span>
              </div>
            ) : (
              notifications.map((n) => {
                const typeInfo = getTypeIcon(n.type);
                return (
                  <div
                    key={n._id}
                    className={`md3-notif-item ${!n.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className={`md3-notif-item-icon ${typeInfo.color}`}>
                      <span className="material-symbols-rounded">{typeInfo.icon}</span>
                    </div>

                    <div className="md3-notif-item-content">
                      <div className="md3-notif-item-title-row">
                        <span className="md3-notif-item-title">{n.title}</span>
                        <span className="md3-notif-item-time">{formatTimeAgo(n.createdAt)}</span>
                      </div>
                      <div className="md3-notif-item-msg">{n.message}</div>
                    </div>

                    {!n.isRead && (
                      <button
                        type="button"
                        className="md3-notif-mark-btn"
                        title="Mark as read"
                        onClick={(e) => handleMarkAsRead(n._id, e)}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                          done
                        </span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

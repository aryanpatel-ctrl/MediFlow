import { useState, useEffect, useRef } from "react";
import { Bell, Search, Settings, Menu, Check, X } from "lucide-react";
import { useAuth } from "../hooks";
import api from "../services/api";

const formatRole = (role) =>
  (role || "Admin")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatTimeAgo = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'queue_started': return '▶️';
    case 'your_turn': return '📢';
    case 'patient_checked_in': return '👋';
    case 'consultation_completed': return '✅';
    case 'delay_notification': return '⏰';
    case 'appointment_reminder': return '📅';
    default: return '🔔';
  }
};

function Topbar({ title, subtitle, onMenuClick }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const userName = user?.name || "City Hospital Admin";
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=2A9D8F&color=fff`;

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications', { params: { limit: 10 } });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and periodically
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      fetchNotifications();
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-title" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="icon-button topbar-hamburger" type="button" onClick={onMenuClick} style={{ marginRight: '12px', background: 'transparent', border: 'none' }}>
          <Menu size={18} strokeWidth={2} />
        </button>
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        <label className="searchbar">
          <span className="searchbar-icon" aria-hidden="true">
            <Search size={16} strokeWidth={2} />
          </span>
          <input type="search" placeholder="Search anything" />
        </label>

        <div className="notification-container" ref={dropdownRef}>
          <button
            className="icon-button"
            type="button"
            aria-label="Notifications"
            onClick={toggleNotifications}
            style={{ position: 'relative' }}
          >
            <Bell size={15} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="mark-all-read">
                    <Check size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div className="notification-list">
                {loading ? (
                  <div className="notification-loading">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">No notifications</div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification._id}
                      className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                      onClick={() => !notification.isRead && markAsRead(notification._id)}
                    >
                      <span className="notification-icon">{getNotificationIcon(notification.type)}</span>
                      <div className="notification-content">
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                        <span className="notification-time">{formatTimeAgo(notification.createdAt)}</span>
                      </div>
                      {!notification.isRead && <span className="unread-dot"></span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button className="icon-button" type="button" aria-label="Settings">
          <Settings size={15} strokeWidth={2} />
        </button>

        <div className="profile-chip">
          <div className="avatar" style={{ padding: 0, overflow: 'hidden' }}>
            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <strong>{userName}</strong>
            <p>{formatRole(user?.role)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;

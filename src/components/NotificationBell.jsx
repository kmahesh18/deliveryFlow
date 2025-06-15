import React, { useState, useEffect, useRef } from "react";
import { Bell, X, Package, User, Clock, CheckCircle } from "lucide-react";
import { wsService } from "../services/websocket";
import { useAuth } from "../contexts/AuthContext";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Setup WebSocket listeners for real-time notifications
    const handleOrderCreated = (order) => {
      if (user.role === "admin") {
        addNotification({
          id: `order-created-${order.id}`,
          type: "order_created",
          title: "New Order",
          message: `Order #${order.id} has been placed`,
          timestamp: new Date().toISOString(),
          data: order,
        });
      }
    };

    const handleOrderAssigned = (data) => {
      if (user.role === "customer" && (data.customerId === user._id || data.customerId === user.id)) {
        addNotification({
          id: `order-assigned-${data.orderId}`,
          type: "order_assigned",
          title: "Order Assigned",
          message: `Your order has been assigned to ${data.deliveryPersonName}`,
          timestamp: new Date().toISOString(),
          data,
        });
      }
    };

    const handleNewAssignment = (data) => {
      if (user.role === "delivery") {
        addNotification({
          id: `new-assignment-${data.orderId}`,
          type: "new_assignment",
          title: "New Assignment",
          message: `You have a new delivery assignment`,
          timestamp: new Date().toISOString(),
          data,
        });
      }
    };

    const handleOrderStatusUpdate = (data) => {
      if (user.role === "customer" && (data.customerId === user._id || data.customerId === user.id)) {
        const statusMessages = {
          assigned: "Your order has been assigned",
          "picked-up": "Your order has been picked up",
          delivered: "Your order has been delivered",
        };

        addNotification({
          id: `status-update-${data.orderId}-${data.newStatus}`,
          type: "order_status_update",
          title: "Order Update",
          message:
            statusMessages[data.newStatus] ||
            `Order status updated to ${data.newStatus}`,
          timestamp: new Date().toISOString(),
          data,
        });
      }
    };

    // Add event listeners
    wsService.on("orderCreated", handleOrderCreated);
    wsService.on("orderAssignedNotification", handleOrderAssigned);
    wsService.on("newAssignment", handleNewAssignment);
    wsService.on("orderStatusUpdateNotification", handleOrderStatusUpdate);

    // Cleanup
    return () => {
      wsService.off("orderCreated", handleOrderCreated);
      wsService.off("orderAssignedNotification", handleOrderAssigned);
      wsService.off("newAssignment", handleNewAssignment);
      wsService.off("orderStatusUpdateNotification", handleOrderStatusUpdate);
    };
  }, [user]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Update unread count
    const unread = notifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const addNotification = (notification) => {
    setNotifications((prev) => [notification, ...prev.slice(0, 19)]); // Keep only last 20
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_created":
      case "new_assignment":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "order_assigned":
        return <User className="h-5 w-5 text-green-500" />;
      case "order_status_update":
        return <CheckCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diffMs = now - notifTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return notifTime.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-strong border border-gray-200 z-50 animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimestamp(notification.timestamp)}
                            </p>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button
                onClick={() => setNotifications([])}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

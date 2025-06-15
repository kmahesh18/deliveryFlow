import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Connect to WebSocket server
  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    console.log("🔌 Connecting to WebSocket server...");

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners(token);
  }

  // Setup default event listeners
  setupEventListeners(token) {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("✅ Connected to WebSocket server");
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Authenticate immediately after connection
      if (token) {
        this.authenticate(token);
      }

      // Emit custom connect event
      this.emit("connected");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from WebSocket server:", reason);
      this.isConnected = false;
      this.emit("disconnected", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("🔌 Connection error:", error);
      this.reconnectAttempts++;
      this.emit("connection_error", error);
    });

    this.socket.on("authenticated", (data) => {
      console.log("🔐 WebSocket authenticated:", data.user?.name);
      this.emit("authenticated", data);
    });

    this.socket.on("authentication_error", (error) => {
      console.error("🔐 Authentication error:", error);
      this.emit("authentication_error", error);
    });

    // Order-related events
    this.socket.on("orderCreated", (order) => {
      console.log("📦 New order created:", order.id);
      this.emit("orderCreated", order);
    });

    this.socket.on("orderAssigned", (data) => {
      console.log("👤 Order assigned:", data);
      this.emit("orderAssigned", data);
    });

    this.socket.on("orderStatusUpdated", (data) => {
      console.log("📱 Order status updated:", data);
      this.emit("orderStatusUpdated", data);
    });

    this.socket.on("orderUpdate", (data) => {
      console.log("🔄 Order update:", data);
      this.emit("orderUpdate", data);
    });

    // Real-time location updates
    this.socket.on("delivery_location", (data) => {
      console.log("📍 Delivery location update:", data);
      this.emit("deliveryLocation", data);
    });

    // Admin-specific events
    this.socket.on("new_order", (data) => {
      console.log("🆕 New order for admin:", data);
      this.emit("newOrder", data);
    });

    this.socket.on("order_assigned", (data) => {
      console.log("✅ Order assigned notification:", data);
      this.emit("orderAssignedNotification", data);
    });

    this.socket.on("new_assignment", (data) => {
      console.log("📋 New assignment for delivery person:", data);
      this.emit("newAssignment", data);
    });

    this.socket.on("order_status_update", (data) => {
      console.log("📊 Order status update notification:", data);
      this.emit("orderStatusUpdateNotification", data);
    });

    // Error handling
    this.socket.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
      this.emit("error", error);
    });
  }

  // Authenticate with the server
  authenticate(token) {
    if (this.socket && this.isConnected) {
      this.socket.emit("authenticate", token);
    }
  }

  // Subscribe to order updates
  subscribeToOrders() {
    if (this.socket && this.isConnected) {
      this.socket.emit("subscribe_to_orders");
    }
  }

  // Send location update (for delivery personnel)
  sendLocationUpdate(orderId, latitude, longitude) {
    if (this.socket && this.isConnected) {
      this.socket.emit("location_update", {
        orderId,
        latitude,
        longitude,
      });
    }
  }

  // Generic event listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove event listener
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit custom events to listeners
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Join a specific room
  joinRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit("join_room", room);
    }
  }

  // Leave a specific room
  leaveRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit("leave_room", room);
    }
  }

  // Send ping to check connection
  ping() {
    if (this.socket && this.isConnected) {
      this.socket.emit("ping");
    }
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      console.log("🔌 Disconnecting from WebSocket server...");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Create and export a singleton instance
export const wsService = new WebSocketService();
export default wsService;

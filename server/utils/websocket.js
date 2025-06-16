import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "uhd9739gf93uef92ufef9u239fueu293fh9u29fe";

export const setupWebSocket = (io) => {
  console.log("🔌 Setting up WebSocket server...");

  // Store connected users
  const connectedUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`👤 User connected: ${socket.id}`);

    // Handle authentication
    socket.on("authenticate", async (token) => {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user && user.isActive) {
          socket.userId = user._id.toString();
          socket.userRole = user.role;
          socket.userName = user.name;

          connectedUsers.set(socket.id, {
            userId: user._id.toString(),
            role: user.role,
            name: user.name,
          });

          socket.emit("authenticated", {
            message: "Successfully authenticated",
            user: {
              id: user._id,
              name: user.name,
              role: user.role,
            },
          });

          // Join role-specific rooms
          socket.join(`role_${user.role}`);

          // Join user-specific room
          socket.join(`user_${user._id}`);

          console.log(`✅ User authenticated: ${user.name} (${user.role})`);
        } else {
          socket.emit("authentication_error", {
            message: "User not found or inactive",
          });
        }
      } catch (error) {
        console.error("Authentication error:", error);
        socket.emit("authentication_error", { message: "Invalid token" });
      }
    });

    // Handle order updates subscription
    socket.on("subscribe_to_orders", () => {
      if (!socket.userId) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      if (socket.userRole === "customer") {
        // Subscribe to own orders
        socket.join(`customer_${socket.userId}`);
      } else if (socket.userRole === "delivery") {
        // Subscribe to assigned orders
        socket.join(`delivery_${socket.userId}`);
      } else if (socket.userRole === "admin") {
        // Subscribe to all orders
        socket.join("admin_orders");
      }

      socket.emit("subscribed", { message: "Subscribed to order updates" });
    });

    // Handle real-time location updates (for delivery personnel)
    socket.on("location_update", async (data) => {
      if (socket.userRole !== "delivery") {
        socket.emit("error", {
          message: "Only delivery personnel can send location updates",
        });
        return;
      }

      const { orderId, latitude, longitude } = data;

      try {
        const Order = (await import("../models/Order.js")).default;

        // Validate the order belongs to this delivery person
        const order = await Order.findById(orderId);
        if (!order || order.deliveryPersonId.toString() !== socket.userId) {
          socket.emit("error", {
            message: "Order not found or not assigned to you",
          });
          return;
        }

        // Update order location
        await order.updateLocation(latitude, longitude);

        // Broadcast location to customer and admin
        io.to(`customer_${order.customerId}`).emit("delivery_location", {
          orderId,
          latitude,
          longitude,
          deliveryPersonName: socket.userName,
          timestamp: new Date().toISOString(),
        });

        io.to("admin_orders").emit("delivery_location", {
          orderId,
          latitude,
          longitude,
          deliveryPersonId: socket.userId,
          deliveryPersonName: socket.userName,
          customerId: order.customerId,
          timestamp: new Date().toISOString(),
        });

        console.log(`📍 Location updated for order ${orderId}`);
      } catch (error) {
        console.error("Location update error:", error);
        socket.emit("error", { message: "Failed to update location" });
      }
    });

    // Handle custom events
    socket.on("join_room", (room) => {
      socket.join(room);
      socket.emit("joined_room", { room });
    });

    socket.on("leave_room", (room) => {
      socket.leave(room);
      socket.emit("left_room", { room });
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong");
    });

    // Handle typing indicators (for chat features)
    socket.on("typing", (data) => {
      socket.to(data.room).emit("user_typing", {
        userId: socket.userId,
        userName: socket.userName,
        isTyping: data.isTyping,
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`👋 User disconnected: ${socket.id}`);
      connectedUsers.delete(socket.id);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  // Global event emitters for other parts of the application
  const emitToCustomer = (customerId, event, data) => {
    io.to(`customer_${customerId}`).emit(event, data);
  };

  const emitToDeliveryPerson = (deliveryPersonId, event, data) => {
    io.to(`delivery_${deliveryPersonId}`).emit(event, data);
  };

  const emitToAdmins = (event, data) => {
    io.to("admin_orders").emit(event, data);
  };

  const emitToAll = (event, data) => {
    io.emit(event, data);
  };

  const emitToRole = (role, event, data) => {
    io.to(`role_${role}`).emit(event, data);
  };

  const getConnectedUsers = () => {
    return Array.from(connectedUsers.values());
  };

  const getConnectedUsersByRole = (role) => {
    return Array.from(connectedUsers.values()).filter(
      (user) => user.role === role,
    );
  };

  const getUserSocketId = (userId) => {
    for (const [socketId, user] of connectedUsers.entries()) {
      if (user.userId === userId) {
        return socketId;
      }
    }
    return null;
  };

  const isUserOnline = (userId) => {
    return Array.from(connectedUsers.values()).some(
      (user) => user.userId === userId,
    );
  };

  // Export helper functions
  return {
    emitToCustomer,
    emitToDeliveryPerson,
    emitToAdmins,
    emitToAll,
    emitToRole,
    getConnectedUsers,
    getConnectedUsersByRole,
    getUserSocketId,
    isUserOnline,
  };
};

// Order-specific event handlers
export const notifyOrderCreated = (io, order) => {
  // Notify admins about new order
  io.to("admin_orders").emit("new_order", {
    orderId: order._id,
    customerId: order.customerId,
    pickupAddress: order.pickupAddress,
    dropAddress: order.dropAddress,
    itemDescription: order.itemDescription,
    timestamp: order.createdAt,
  });

  console.log(`📢 New order notification sent: ${order._id}`);
};

export const notifyOrderAssigned = (io, order, deliveryPersonName) => {
  // Notify customer
  io.to(`customer_${order.customerId}`).emit("order_assigned", {
    orderId: order._id,
    deliveryPersonName,
    message: `Your order has been assigned to ${deliveryPersonName}`,
  });

  // Notify delivery person
  io.to(`delivery_${order.deliveryPersonId}`).emit("new_assignment", {
    orderId: order._id,
    pickupAddress: order.pickupAddress,
    dropAddress: order.dropAddress,
    itemDescription: order.itemDescription,
    message: "You have a new delivery assignment",
  });

  console.log(`📢 Order assignment notifications sent: ${order._id}`);
};

export const notifyOrderStatusUpdate = (io, order, oldStatus, newStatus) => {
  const statusMessages = {
    assigned: "Your order has been assigned to a delivery person",
    "picked-up": "Your order has been picked up and is on the way",
    delivered: "Your order has been delivered successfully",
    cancelled: "Your order has been cancelled",
  };

  // Notify customer
  io.to(`customer_${order.customerId}`).emit("order_status_update", {
    orderId: order._id,
    oldStatus,
    newStatus,
    message:
      statusMessages[newStatus] || `Order status updated to ${newStatus}`,
  });

  // Notify admins
  io.to("admin_orders").emit("order_status_update", {
    orderId: order._id,
    customerId: order.customerId,
    deliveryPersonId: order.deliveryPersonId,
    oldStatus,
    newStatus,
  });

  console.log(
    `📢 Status update notifications sent: ${order._id} (${oldStatus} → ${newStatus})`,
  );
};

// System-wide notifications
export const notifySystemAlert = (
  io,
  message,
  type = "info",
  targetRole = null,
) => {
  const alertData = {
    message,
    type,
    timestamp: new Date().toISOString(),
  };

  if (targetRole) {
    io.to(`role_${targetRole}`).emit("system_alert", alertData);
  } else {
    io.emit("system_alert", alertData);
  }

  console.log(`📢 System alert sent: ${message} (${type})`);
};

// User connection events
export const notifyUserConnection = (io, userId, userName, isOnline) => {
  io.emit("user_connection_status", {
    userId,
    userName,
    isOnline,
    timestamp: new Date().toISOString(),
  });
};

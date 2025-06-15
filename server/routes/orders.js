import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Create order (Customer only)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const {
      pickupAddress,
      dropAddress,
      itemDescription,
      pickupCoords,
      dropCoords,
      deliveryInstructions,
      priority,
    } = req.body;

    if (req.user.role !== "customer") {
      return res
        .status(403)
        .json({ message: "Only customers can create orders" });
    }

    // Validation
    if (!pickupAddress || !dropAddress || !itemDescription) {
      return res
        .status(400)
        .json({
          message:
            "Pickup address, drop address, and item description are required",
        });
    }

    const orderData = {
      customerId: req.user.userId,
      pickupAddress: pickupAddress.trim(),
      dropAddress: dropAddress.trim(),
      itemDescription: itemDescription.trim(),
      deliveryInstructions: deliveryInstructions?.trim(),
      priority: priority || "normal",
      status: "pending",
    };

    // Add coordinates if provided
    if (pickupCoords && pickupCoords.lat && pickupCoords.lng) {
      orderData.pickupCoords = pickupCoords;
    }

    if (dropCoords && dropCoords.lat && dropCoords.lng) {
      orderData.dropCoords = dropCoords;
    }

    const order = new Order(orderData);
    await order.save();

    // Populate customer information
    await order.populate("customerId", "name email");

    // Emit real-time update
    const io = req.app.get("io");
    io.emit("orderCreated", order);
    io.emit("orderUpdate", { orderId: order._id, status: "pending" });

    console.log(
      `📦 New order created: ${order._id} by ${order.customerId.name}`,
    );

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get orders
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    let orders;

    if (req.user.role === "customer") {
      orders = await Order.getOrdersByCustomer(req.user.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      });
    } else if (req.user.role === "delivery") {
      orders = await Order.getOrdersByDeliveryPerson(req.user.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status: status || { $in: ["assigned", "picked-up"] },
      });
    } else if (req.user.role === "admin") {
      const query = status ? { status } : {};
      orders = await Order.find(query)
        .populate("customerId", "name email")
        .populate("deliveryPersonId", "name email deliveryStats")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));
    } else {
      return res.status(403).json({ message: "Invalid role" });
    }

    res.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get order by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email profile")
      .populate("deliveryPersonId", "name email deliveryStats");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    if (
      req.user.role === "customer" &&
      order.customerId._id.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    if (
      req.user.role === "delivery" &&
      (!order.deliveryPersonId ||
        order.deliveryPersonId._id.toString() !== req.user.userId)
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Assign order to delivery person (Admin only)
router.put("/:id/assign", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can assign orders" });
    }

    const { deliveryPersonId } = req.body;

    if (!deliveryPersonId) {
      return res
        .status(400)
        .json({ message: "Delivery person ID is required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Order is not in pending status" });
    }

    const deliveryPerson = await User.findById(deliveryPersonId);
    if (!deliveryPerson || deliveryPerson.role !== "delivery") {
      return res.status(400).json({ message: "Invalid delivery person" });
    }

    if (!deliveryPerson.isActive || !deliveryPerson.deliveryStats.isAvailable) {
      return res
        .status(400)
        .json({ message: "Delivery person is not available" });
    }

    // Update order
    order.deliveryPersonId = deliveryPersonId;
    order.status = "assigned";
    order.statusHistory.push({
      status: "assigned",
      timestamp: new Date(),
      updatedBy: req.user.userId,
      notes: `Assigned to ${deliveryPerson.name}`,
    });

    await order.save();

    // Populate the updated order
    await order.populate("customerId", "name email");
    await order.populate("deliveryPersonId", "name email");

    // Emit real-time update
    const io = req.app.get("io");
    io.emit("orderAssigned", {
      orderId: order._id,
      deliveryPersonId,
      deliveryPersonName: deliveryPerson.name,
      customerId: order.customerId._id,
    });
    io.emit("orderUpdate", { orderId: order._id, status: "assigned" });

    console.log(`✅ Order ${order._id} assigned to ${deliveryPerson.name}`);

    res.json({
      message: "Order assigned successfully",
      order,
    });
  } catch (error) {
    console.error("Assign order error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update order status (Delivery person only)
router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "delivery") {
      return res
        .status(403)
        .json({ message: "Only delivery personnel can update order status" });
    }

    const { status, notes } = req.body;
    const validStatuses = ["picked-up", "delivered"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id).populate(
      "customerId",
      "name email",
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      !order.deliveryPersonId ||
      order.deliveryPersonId.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    // Validate status transition
    if (status === "picked-up" && order.status !== "assigned") {
      return res
        .status(400)
        .json({ message: "Order must be assigned before it can be picked up" });
    }

    if (status === "delivered" && order.status !== "picked-up") {
      return res
        .status(400)
        .json({
          message: "Order must be picked up before it can be delivered",
        });
    }

    // Update order using the model method
    await order.updateStatus(status, req.user.userId, notes);

    // Update delivery person stats
    if (status === "delivered") {
      const deliveryPerson = await User.findById(req.user.userId);
      if (deliveryPerson) {
        deliveryPerson.deliveryStats.completedDeliveries += 1;
        deliveryPerson.deliveryStats.totalDeliveries = Math.max(
          deliveryPerson.deliveryStats.totalDeliveries,
          deliveryPerson.deliveryStats.completedDeliveries,
        );
        await deliveryPerson.save();
      }
    }

    // Emit real-time update
    const io = req.app.get("io");
    io.emit("orderStatusUpdated", {
      orderId: order._id,
      status,
      deliveryPersonId: req.user.userId,
      customerId: order.customerId._id,
    });
    io.emit("orderUpdate", { orderId: order._id, status });

    console.log(`📱 Order ${order._id} status updated to ${status}`);

    res.json({
      message: `Order marked as ${status.replace("-", " ")}`,
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update order location (Delivery person only)
router.put("/:id/location", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "delivery") {
      return res
        .status(403)
        .json({ message: "Only delivery personnel can update location" });
    }

    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      !order.deliveryPersonId ||
      order.deliveryPersonId.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    if (!["assigned", "picked-up"].includes(order.status)) {
      return res
        .status(400)
        .json({ message: "Can only update location for active deliveries" });
    }

    await order.updateLocation(lat, lng);

    // Emit real-time location update
    const io = req.app.get("io");
    io.emit("deliveryLocation", {
      orderId: order._id,
      latitude: lat,
      longitude: lng,
      deliveryPersonId: req.user.userId,
      customerId: order.customerId,
      timestamp: new Date().toISOString(),
    });

    res.json({
      message: "Location updated successfully",
      location: { lat, lng },
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get order statistics
router.get("/stats/overview", authenticateToken, async (req, res) => {
  try {
    let stats;

    if (req.user.role === "admin") {
      const orderStats = await Order.getOrderStats();
      stats = {
        total: 0,
        pending: 0,
        assigned: 0,
        "picked-up": 0,
        delivered: 0,
        cancelled: 0,
      };

      orderStats.forEach((stat) => {
        stats[stat._id] = stat.count;
        stats.total += stat.count;
      });
    } else if (req.user.role === "customer") {
      const orders = await Order.find({ customerId: req.user.userId });
      stats = {
        totalOrders: orders.length,
        pending: orders.filter((o) => o.status === "pending").length,
        inProgress: orders.filter((o) =>
          ["assigned", "picked-up"].includes(o.status),
        ).length,
        delivered: orders.filter((o) => o.status === "delivered").length,
      };
    } else if (req.user.role === "delivery") {
      const allOrders = await Order.find({ deliveryPersonId: req.user.userId });
      const activeOrders = await Order.find({
        deliveryPersonId: req.user.userId,
        status: { $in: ["assigned", "picked-up"] },
      });

      stats = {
        totalAssigned: allOrders.length,
        active: activeOrders.length,
        pickedUp: activeOrders.filter((o) => o.status === "picked-up").length,
        completed: allOrders.filter((o) => o.status === "delivered").length,
      };
    }

    res.json({ stats });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Cancel order (Customer only, for pending orders)
router.put("/:id/cancel", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "customer") {
      return res
        .status(403)
        .json({ message: "Only customers can cancel orders" });
    }

    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.customerId.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this order" });
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Can only cancel pending orders" });
    }

    await order.updateStatus(
      "cancelled",
      req.user.userId,
      reason || "Cancelled by customer",
    );

    // Emit real-time update
    const io = req.app.get("io");
    io.emit("orderUpdate", { orderId: order._id, status: "cancelled" });

    console.log(`❌ Order ${order._id} cancelled by customer`);

    res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

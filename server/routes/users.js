import express from "express";
import User from "../models/User.js";
import Order from "../models/Order.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get all delivery personnel (Admin only)
router.get("/delivery-personnel", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can view delivery personnel" });
    }

    const deliveryPersonnel = await User.findDeliveryPersonnel();

    res.json({ deliveryPersonnel });
  } catch (error) {
    console.error("Get delivery personnel error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user: user.getPublicProfile() });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || name.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters long" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user fields
    user.name = name.trim();
    if (phone !== undefined) user.profile.phone = phone;
    if (address !== undefined) user.profile.address = address;

    await user.save();

    console.log(`✅ Profile updated for user: ${user.email}`);

    res.json({
      message: "Profile updated successfully",
      user: user.getPublicProfile(),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update delivery availability (Delivery personnel only)
router.put("/availability", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "delivery") {
      return res
        .status(403)
        .json({ message: "Only delivery personnel can update availability" });
    }

    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res
        .status(400)
        .json({ message: "isAvailable must be a boolean value" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.deliveryStats.isAvailable = isAvailable;
    await user.save();

    console.log(
      `✅ Availability updated for ${user.name}: ${isAvailable ? "Available" : "Unavailable"}`,
    );

    res.json({
      message: `Availability updated to ${isAvailable ? "available" : "unavailable"}`,
      isAvailable,
    });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user statistics
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === "customer") {
      const orders = await Order.find({ customerId: req.user.userId });

      stats = {
        totalOrders: orders.length,
        pending: orders.filter((o) => o.status === "pending").length,
        inProgress: orders.filter((o) =>
          ["assigned", "picked-up"].includes(o.status),
        ).length,
        delivered: orders.filter((o) => o.status === "delivered").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
      };
    } else if (req.user.role === "delivery") {
      const allOrders = await Order.find({ deliveryPersonId: req.user.userId });
      const activeOrders = allOrders.filter((o) =>
        ["assigned", "picked-up"].includes(o.status),
      );

      stats = {
        totalAssigned: allOrders.length,
        active: activeOrders.length,
        pickedUp: activeOrders.filter((o) => o.status === "picked-up").length,
        completed: allOrders.filter((o) => o.status === "delivered").length,
        rating: 0, // Will be calculated from feedback when implemented
      };

      // Get user's delivery stats
      const user = await User.findById(req.user.userId);
      if (user && user.deliveryStats) {
        stats.rating = user.deliveryStats.rating;
        stats.isAvailable = user.deliveryStats.isAvailable;
      }
    } else if (req.user.role === "admin") {
      const [totalOrders, totalUsers, totalCustomers, totalDeliveryPersonnel] =
        await Promise.all([
          Order.countDocuments(),
          User.countDocuments(),
          User.countDocuments({ role: "customer" }),
          User.countDocuments({ role: "delivery" }),
        ]);

      const ordersByStatus = await Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      stats = {
        totalOrders,
        totalUsers,
        customers: totalCustomers,
        deliveryPersonnel: totalDeliveryPersonnel,
        pending: 0,
        inProgress: 0,
        delivered: 0,
        cancelled: 0,
      };

      // Map order status counts
      ordersByStatus.forEach((status) => {
        if (status._id === "pending") stats.pending = status.count;
        else if (["assigned", "picked-up"].includes(status._id)) {
          stats.inProgress += status.count;
        } else if (status._id === "delivered") stats.delivered = status.count;
        else if (status._id === "cancelled") stats.cancelled = status.count;
      });
    }

    res.json({ stats });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get delivery personnel performance (Admin only)
router.get("/delivery-performance", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can view delivery performance" });
    }

    const performance = await User.aggregate([
      {
        $match: { role: "delivery" },
      },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "deliveryPersonId",
          as: "orders",
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          deliveryStats: 1,
          totalOrders: { $size: "$orders" },
          completedOrders: {
            $size: {
              $filter: {
                input: "$orders",
                cond: { $eq: ["$$this.status", "delivered"] },
              },
            },
          },
          activeOrders: {
            $size: {
              $filter: {
                input: "$orders",
                cond: { $in: ["$$this.status", ["assigned", "picked-up"]] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          completionRate: {
            $cond: {
              if: { $gt: ["$totalOrders", 0] },
              then: {
                $multiply: [
                  { $divide: ["$completedOrders", "$totalOrders"] },
                  100,
                ],
              },
              else: 0,
            },
          },
        },
      },
      {
        $sort: { completedOrders: -1 },
      },
    ]);

    res.json({ performance });
  } catch (error) {
    console.error("Get delivery performance error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Deactivate user account (Admin only)
router.put("/:id/deactivate", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can deactivate accounts" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res
        .status(400)
        .json({ message: "Cannot deactivate admin accounts" });
    }

    user.isActive = false;
    await user.save();

    console.log(`⛔ User account deactivated: ${user.email}`);

    res.json({
      message: "User account deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reactivate user account (Admin only)
router.put("/:id/activate", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can activate accounts" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = true;
    await user.save();

    console.log(`✅ User account activated: ${user.email}`);

    res.json({
      message: "User account activated successfully",
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all users (Admin only)
router.get("/all", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can view all users" });
    }

    const { page = 1, limit = 20, role, isActive } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pickupAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    dropAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    pickupCoords: coordinateSchema,
    dropCoords: coordinateSchema,
    itemDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "assigned", "picked-up", "delivered", "cancelled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
    estimatedDeliveryTime: Date,
    actualPickupTime: Date,
    actualDeliveryTime: Date,
    deliveryInstructions: {
      type: String,
      maxlength: 500,
    },
    cost: {
      baseFee: { type: Number, default: 0 },
      distanceFee: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
    },
    tracking: {
      currentLocation: coordinateSchema,
      lastLocationUpdate: Date,
      estimatedArrival: Date,
    },
    feedback: {
      customerRating: { type: Number, min: 1, max: 5 },
      customerComment: String,
      deliveryPersonRating: { type: Number, min: 1, max: 5 },
      deliveryPersonComment: String,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "assigned", "picked-up", "delivered", "cancelled"],
        },
        timestamp: { type: Date, default: Date.now },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for better performance
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ deliveryPersonId: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

// Pre-save middleware to update status history
orderSchema.pre("save", function (next) {
  if (this.isModified("status") && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this.deliveryPersonId || this.customerId,
    });
  }
  next();
});

// Pre-save middleware to calculate estimated delivery time
orderSchema.pre("save", function (next) {
  if (this.isNew && this.pickupCoords && this.dropCoords) {
    // Simple estimation: 30 minutes + 2 minutes per km
    const distance = this.calculateDistance();
    const estimatedMinutes = 30 + distance * 2;
    this.estimatedDeliveryTime = new Date(
      Date.now() + estimatedMinutes * 60000,
    );
  }
  next();
});

// Instance methods
orderSchema.methods.calculateDistance = function () {
  if (!this.pickupCoords || !this.dropCoords) return 0;

  const R = 6371; // Earth's radius in km
  const dLat = ((this.dropCoords.lat - this.pickupCoords.lat) * Math.PI) / 180;
  const dLng = ((this.dropCoords.lng - this.pickupCoords.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((this.pickupCoords.lat * Math.PI) / 180) *
      Math.cos((this.dropCoords.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

orderSchema.methods.updateStatus = function (newStatus, updatedBy, notes) {
  this.status = newStatus;

  // Update timestamps based on status
  switch (newStatus) {
    case "picked-up":
      this.actualPickupTime = new Date();
      break;
    case "delivered":
      this.actualDeliveryTime = new Date();
      break;
  }

  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    notes,
  });

  return this.save();
};

orderSchema.methods.updateLocation = function (lat, lng) {
  this.tracking.currentLocation = { lat, lng };
  this.tracking.lastLocationUpdate = new Date();
  return this.save();
};

// Static methods
orderSchema.statics.getOrdersByCustomer = function (customerId, options = {}) {
  const { page = 1, limit = 10, status } = options;
  const query = { customerId };
  if (status) query.status = status;

  return this.find(query)
    .populate("deliveryPersonId", "name email deliveryStats")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

orderSchema.statics.getOrdersByDeliveryPerson = function (
  deliveryPersonId,
  options = {},
) {
  const { page = 1, limit = 10, status } = options;
  const query = { deliveryPersonId };
  if (status) query.status = status;

  return this.find(query)
    .populate("customerId", "name email profile.phone")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

orderSchema.statics.getPendingOrders = function () {
  return this.find({ status: "pending" })
    .populate("customerId", "name email profile.phone")
    .sort({ createdAt: 1 });
};

orderSchema.statics.getActiveOrders = function () {
  return this.find({ status: { $in: ["assigned", "picked-up"] } })
    .populate("customerId", "name email")
    .populate("deliveryPersonId", "name email")
    .sort({ createdAt: -1 });
};

orderSchema.statics.getOrderStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

const Order = mongoose.model("Order", orderSchema);

export default Order;

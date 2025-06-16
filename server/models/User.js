import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      required: true,
      enum: ["customer", "delivery", "admin"],
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profile: {
      phone: String,
      address: String,
      profilePicture: String,
    },
    // For delivery personnel
    deliveryStats: {
      totalDeliveries: { type: Number, default: 0 },
      completedDeliveries: { type: Number, default: 0 },
      rating: { type: Number, default: 5.0, min: 1, max: 5 },
      isAvailable: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for better performance
userSchema.index({ role: 1 });
userSchema.index({ "deliveryStats.isAvailable": 1 });

// Instance methods
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    createdAt: this.createdAt,
    ...(this.role === "delivery" && {
      deliveryStats: this.deliveryStats,
    }),
  };
};

// Static methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findDeliveryPersonnel = function () {
  return this.find({
    role: "delivery",
    isActive: true,
    "deliveryStats.isAvailable": true,
  }).select("-password");
};

const User = mongoose.model("User", userSchema);

export default User;

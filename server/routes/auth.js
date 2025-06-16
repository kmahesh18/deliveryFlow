import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "uhd9739gf93uef92ufef9u239fueu293fh9u29fe";

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["customer", "delivery", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
    });

    const savedUser = await user.save();

    // Generate JWT
    const token = jwt.sign(
      {
        userId: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    console.log(`✅ New user registered: ${savedUser.name} (${savedUser.role})`);

    res.status(201).json({
      message: "User registered successfully",
      user: savedUser.getPublicProfile(),
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate key error (email already exists)
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Email, password, and role are required" });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res
        .status(401)
        .json({ message: "Account is deactivated. Please contact support." });
    }

    // Check role
    if (user.role !== role) {
      return res.status(401).json({ message: "Invalid role for this account" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    console.log(`✅ User logged in: ${user.name} (${user.role})`);

    res.json({
      message: "Login successful",
      user: user.getPublicProfile(),
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Verify token
router.post("/verify", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    res.json({
      valid: true,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ valid: false, message: "Invalid token" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ valid: false, message: "Token expired" });
    }

    console.error("Token verification error:", error);
    res
      .status(401)
      .json({ valid: false, message: "Token verification failed" });
  }
});

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Verify the existing token (even if expired)
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        // Decode without verification to get the payload
        decoded = jwt.decode(token);
      } else {
        throw error;
      }
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      message: "Token refreshed successfully",
      user: user.getPublicProfile(),
      token: newToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({ message: "Token refresh failed" });
  }
});

// Change password
router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    await user.save();

    console.log(`✅ Password changed for user: ${user.email}`);

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

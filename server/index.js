import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

// Import database connection
import database from "./config/database.js";

// Import routes
import authRoutes from "./routes/auth.js";
import orderRoutes from "./routes/orders.js";
import userRoutes from "./routes/users.js";

// Import WebSocket handlers
import { setupWebSocket } from "./utils/websocket.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://delivery-flow.vercel.app",
      process.env.CLIENT_URL
    ].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Initialize database connection
async function initializeDatabase() {
  try {
    await database.connect();
    await database.createIndexes();

    // Seed data in development
    if (process.env.NODE_ENV === "development") {
      await database.seedData();
    }

    console.log("✅ Database initialization complete");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://delivery-flow.vercel.app", 
      process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Make io available to routes
app.set("io", io);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);

// Health check with database status
app.get("/api/health", async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    res.json({
      status: "OK",
      message: "Server is running",
      timestamp: new Date(),
      database: dbHealth,
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Health check failed",
      error: error.message,
    });
  }
});

// Database status endpoint
app.get("/api/db-status", async (req, res) => {
  try {
    const status = database.getConnectionStatus();
    const health = await database.healthCheck();
    res.json({ ...status, ...health });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      isConnected: false,
    });
  }
});

// Setup WebSocket
setupWebSocket(io);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      message: `${field} already exists`,
      type: "DUPLICATE_KEY_ERROR",
    });
  }

  // MongoDB validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: "Validation Error",
      errors,
      type: "VALIDATION_ERROR",
    });
  }

  // MongoDB cast error
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format",
      type: "CAST_ERROR",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Invalid token",
      type: "JWT_ERROR",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Token expired",
      type: "JWT_EXPIRED",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong!"
        : err.message,
    type: "SERVER_ERROR",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📤 SIGTERM received, shutting down gracefully...");
  await database.disconnect();
  server.close(() => {
    console.log("🔚 Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("📤 SIGINT received, shutting down gracefully...");
  await database.disconnect();
  server.close(() => {
    console.log("🔚 Process terminated");
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready for real-time updates`);
      console.log(
        `🌐 Frontend URL: ${process.env.CLIENT_URL || "http://localhost:5173"}`,
      );
      console.log(`🗄️  Database: MongoDB Atlas`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

export { io };

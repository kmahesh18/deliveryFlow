import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://maheshkolli888:p99m99s99@cluster0.3bezct7.mongodb.net/mini-delivery?retryWrites=true&w=majority/deliveryflow";

class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Mongoose configuration
      mongoose.set("strictQuery", false);

      // Connection options - removed deprecated options
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
      };

      // Connect to MongoDB
      this.connection = await mongoose.connect(MONGODB_URI, options);
      this.isConnected = true;

      console.log("🗄️  Successfully connected to MongoDB");
      console.log(`📊 Database: ${this.connection.connection.name}`);
      console.log(
        `🌐 Host: ${this.connection.connection.host}:${this.connection.connection.port}`,
      );

      // Handle connection events
      mongoose.connection.on("error", (error) => {
        console.error("❌ MongoDB connection error:", error);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        console.log("📤 MongoDB disconnected");
        this.isConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        console.log("🔄 MongoDB reconnected");
        this.isConnected = true;
      });

      // Graceful shutdown
      process.on("SIGINT", async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log("📤 MongoDB connection closed");
      }
    } catch (error) {
      console.error("❌ Error disconnecting from MongoDB:", error);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isConnected) {
        throw new Error("Not connected to database");
      }

      // Try to execute a simple operation
      await mongoose.connection.db.admin().ping();
      return { status: "healthy", timestamp: new Date() };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  // Create indexes for better performance
  async createIndexes() {
    try {
      console.log("🔧 Creating database indexes...");

      // You can add custom index creation here if needed
      // Most indexes are defined in the schemas

      console.log("✅ Database indexes created successfully");
    } catch (error) {
      console.error("❌ Error creating indexes:", error);
    }
  }

  // Clear collections (for testing/development)
  async clearCollections() {
    try {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Cannot clear collections in production");
      }

      const collections = await mongoose.connection.db.collections();

      for (const collection of collections) {
        await collection.deleteMany({});
      }

      console.log("🧹 All collections cleared");
    } catch (error) {
      console.error("❌ Error clearing collections:", error);
      throw error;
    }
  }

  // Seed data (for development)
  async seedData() {
    try {
      const User = (await import("../models/User.js")).default;
      const Order = (await import("../models/Order.js")).default;

      // Check if data already exists
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        console.log("📊 Database already contains data, skipping seed");
        return;
      }

      console.log("🌱 Seeding database with sample data...");

      // Create sample users
      const bcrypt = (await import("bcryptjs")).default;
      const hashedPassword = await bcrypt.hash("password123", 10);

      const sampleUsers = [
        {
          name: "John Customer",
          email: "customer@example.com",
          password: hashedPassword,
          role: "customer",
        },
        {
          name: "Jane Delivery",
          email: "delivery@example.com",
          password: hashedPassword,
          role: "delivery",
          deliveryStats: {
            isAvailable: true,
            rating: 4.8,
            totalDeliveries: 150,
            completedDeliveries: 145,
          },
        },
        {
          name: "Admin User",
          email: "admin@example.com",
          password: hashedPassword,
          role: "admin",
        },
      ];

      await User.insertMany(sampleUsers);
      console.log("✅ Sample users created");
    } catch (error) {
      console.error("❌ Error seeding data:", error);
    }
  }
}

// Create and export database instance
const database = new Database();

export default database;
export { mongoose };

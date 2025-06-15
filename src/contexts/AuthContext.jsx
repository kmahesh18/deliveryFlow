import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "../services/api";
import { wsService } from "../services/websocket";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        // Verify token with backend
        const response = await apiService.verifyToken(token);
        if (response.valid) {
          setUser(response.user);
          setupWebSocket(token);
        } else {
          // Token is invalid, clear it
          localStorage.removeItem("token");
          apiService.setToken(null);
        }
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      // Clear invalid token
      localStorage.removeItem("token");
      apiService.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setupWebSocket = (token) => {
    try {
      wsService.connect(token);

      wsService.on("connected", () => {
        setIsConnected(true);
        console.log("✅ WebSocket connected");
      });

      wsService.on("disconnected", () => {
        setIsConnected(false);
        console.log("❌ WebSocket disconnected");
      });

      wsService.on("authenticated", (data) => {
        console.log("🔐 WebSocket authenticated:", data.user?.name);
        wsService.subscribeToOrders();
      });

      wsService.on("authentication_error", (error) => {
        console.error("🔐 WebSocket authentication failed:", error);
        toast.error("Real-time connection failed");
      });

      wsService.on("connection_error", (error) => {
        console.error("🔌 WebSocket connection error:", error);
        setIsConnected(false);
      });
    } catch (error) {
      console.error("WebSocket setup error:", error);
    }
  };

  const login = async (email, password, role) => {
    try {
      setIsLoading(true);
      const response = await apiService.login({ email, password, role });

      setUser(response.user);
      setupWebSocket(response.token);

      toast.success(`Welcome back, ${response.user.name}!`);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    try {
      setIsLoading(true);
      const response = await apiService.register({
        name,
        email,
        password,
        role,
      });

      setUser(response.user);
      setupWebSocket(response.token);

      toast.success(`Welcome to DeliveryFlow, ${response.user.name}!`);
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsConnected(false);
    apiService.logout();
    wsService.disconnect();
    toast.success("You have been logged out");
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await apiService.updateProfile(profileData);
      setUser(response.user);
      toast.success("Profile updated successfully");
      return true;
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Failed to update profile");
      return false;
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
    isConnected,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

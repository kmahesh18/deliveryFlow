import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { wsService } from "../services/websocket";
import { mapsService } from "../services/maps";
import Layout from "../components/Layout";
import toast from "react-hot-toast";
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  Navigation,
  Phone,
  Truck,
} from "lucide-react";

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingOrders, setTrackingOrders] = useState(new Set());

  useEffect(() => {
    if (user) {
      loadAssignedOrders();
      loadStats();
      setupRealtimeListeners();
      startLocationTracking();
    }
  }, [user]);

  const setupRealtimeListeners = () => {
    // Listen for new assignments
    wsService.on("newAssignment", (data) => {
      loadAssignedOrders();
      toast.success("You have a new delivery assignment!", {
        duration: 5000,
        icon: "📦",
      });
    });

    // Listen for order updates
    wsService.on("orderUpdate", (data) => {
      setAssignedOrders((prev) =>
        prev.map((order) => {
          const orderId = order._id || order.id;
          const updateId = data.orderId;
          return orderId === updateId ? { ...order, status: data.status } : order;
        }),
      );
    });
  };

  const startLocationTracking = async () => {
    try {
      const location = await mapsService.getCurrentLocation();
      setCurrentLocation(location);

      // Update location every 10 seconds for active orders (more frequent updates)
      const interval = setInterval(async () => {
        try {
          const newLocation = await mapsService.getCurrentLocation();
          setCurrentLocation(newLocation);

          // Send location updates for orders being tracked
          trackingOrders.forEach((orderId) => {
            console.log("Sending location update for order:", orderId, newLocation);
            wsService.sendLocationUpdate(
              orderId,
              newLocation.lat,
              newLocation.lng,
            );
          });
        } catch (error) {
          console.error("Location update failed:", error);
        }
      }, 10000); // Changed from 30 seconds to 10 seconds

      return () => clearInterval(interval);
    } catch (error) {
      console.error("Failed to get initial location:", error);
    }
  };

  const loadAssignedOrders = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getOrders();
      
      // Ensure we have valid orders array
      const orders = Array.isArray(response.orders) ? response.orders : [];
      console.log("Loaded orders:", orders); // Debug log
      
      setAssignedOrders(orders);
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast.error("Failed to load orders");
      setAssignedOrders([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getUserStats();
      setStats(response.stats || {});
    } catch (error) {
      console.error("Failed to load stats:", error);
      setStats({}); // Set empty object on error
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Validate orderId
      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        toast.error("Invalid order ID");
        return;
      }

      await apiService.updateOrderStatus(orderId, newStatus);

      // Update local state
      setAssignedOrders((prev) =>
        prev.map((order) => {
          const currentOrderId = order._id || order.id;
          return currentOrderId === orderId ? { ...order, status: newStatus } : order;
        }),
      );

      // Handle location tracking using proper ID
      if (newStatus === "picked-up") {
        setTrackingOrders((prev) => new Set([...prev, orderId]));
        toast.success("Order picked up! Location tracking started.", {
          icon: "📍",
        });
      } else if (newStatus === "delivered") {
        setTrackingOrders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
        toast.success("Order delivered successfully!", {
          icon: "🎉",
        });
      }

      loadStats();
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast.error(error.message || "Failed to update order status");
    }
  };

  const getDirections = async (address) => {
    if (!currentLocation) {
      toast.error("Current location not available");
      return;
    }

    try {
      const destination = await mapsService.geocodeAddress(address);
      // Use OpenStreetMap routing instead of Google Maps
      const directionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${currentLocation.lat}%2C${currentLocation.lng}%3B${destination.lat}%2C${destination.lng}`;
      window.open(directionsUrl, "_blank");
    } catch (error) {
      console.error("Failed to get directions:", error);
      toast.error("Failed to get directions");
    }
  };

  const showRouteInMap = (order) => {
    // Set the selected order to show route in integrated map
    setSelectedOrderForRoute(order);
  };

  const [selectedOrderForRoute, setSelectedOrderForRoute] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "picked-up":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "delivered":
        return "bg-success-100 text-success-800 border-success-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatStatus = (status) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-100 hover:shadow-medium transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${color} mt-1`}>
            {typeof value === 'number' ? value : 0}
          </p>
        </div>
        <div
          className={`p-3 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-100")}`}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  // Safe render helpers
  const getOrderId = (order) => {
    if (!order) return 'unknown';
    return String(order._id || order.id || 'unknown');
  };

  const getOrderDate = (order) => {
    try {
      const date = order.createdAt || order.timestamp;
      return date ? new Date(date).toLocaleDateString() : 'Unknown date';
    } catch (error) {
      return 'Unknown date';
    }
  };

  const isTracking = (order) => {
    const orderId = getOrderId(order);
    return trackingOrders.has(orderId);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Good day, {user?.name || 'Delivery Person'}! 🚚
          </h1>
          <p className="text-gray-600">
            Manage your delivery assignments and update order status in
            real-time.
          </p>

          {currentLocation && (
            <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
              <Navigation className="h-4 w-4 text-green-500" />
              <span>Location tracking active</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Truck}
              label="Active Deliveries"
              value={stats.active || 0}
              color="text-blue-600"
            />
            <StatCard
              icon={Package}
              label="Total Assigned"
              value={stats.totalAssigned || 0}
              color="text-purple-600"
            />
            <StatCard
              icon={MapPin}
              label="Picked Up"
              value={stats.pickedUp || 0}
              color="text-warning-600"
            />
            <StatCard
              icon={CheckCircle}
              label="Completed"
              value={stats.completed || 0}
              color="text-success-600"
            />
          </div>
        )}

        {/* Assigned Orders */}
        <div className="bg-white shadow-soft rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900">
              Your Assigned Deliveries
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              View and update the status of your delivery assignments
            </p>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Loading assignments...</p>
              </div>
            ) : !Array.isArray(assignedOrders) || assignedOrders.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No active deliveries
                </h3>
                <p className="text-gray-500">
                  New deliveries will appear here when assigned by admin
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {assignedOrders.map((order, index) => {
                  const orderId = getOrderId(order);
                  const orderDate = getOrderDate(order);
                  
                  return (
                    <div
                      key={orderId}
                      className="border border-gray-200 rounded-xl p-6 hover:shadow-medium transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Order #{orderId}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Assigned on {orderDate}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status || 'unknown')}`}
                          >
                            {formatStatus(order.status || 'unknown')}
                          </span>
                          {isTracking(order) && (
                            <div className="flex items-center space-x-1 text-xs text-green-600">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span>Tracking</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-blue-900 flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                Pickup Location
                              </h4>
                              <button
                                onClick={() => getDirections(order.pickupAddress || '')}
                                className="text-blue-600 hover:text-blue-700 transition-colors"
                                title="Get directions"
                              >
                                <Navigation className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-blue-800 text-sm">
                              {order.pickupAddress || 'Address not available'}
                            </p>
                          </div>

                          <div className="bg-red-50 p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-red-900 flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                Delivery Location
                              </h4>
                              <button
                                onClick={() => getDirections(order.dropAddress || '')}
                                className="text-red-600 hover:text-red-700 transition-colors"
                                title="Get directions"
                              >
                                <Navigation className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-red-800 text-sm">
                              {order.dropAddress || 'Address not available'}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Package className="h-4 w-4 mr-2" />
                            Item Description
                          </h4>
                          <p className="text-gray-700 text-sm">
                            {order.itemDescription || 'No description available'}
                          </p>

                          {order.customerId && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-xs text-gray-500 mb-2">
                                Customer ID: {String(order.customerId)}
                              </p>
                              <button className="text-primary hover:text-primary/80 text-sm flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                Contact Customer
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {order.status === "assigned" && (
                          <button
                            onClick={() => updateOrderStatus(orderId, "picked-up")}
                            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <Package className="h-4 w-4" />
                            <span>Mark as Picked Up</span>
                          </button>
                        )}

                        {order.status === "picked-up" && (
                          <button
                            onClick={() => updateOrderStatus(orderId, "delivered")}
                            className="flex items-center space-x-2 bg-success-600 hover:bg-success-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Mark as Delivered</span>
                          </button>
                        )}

                        <button
                          onClick={() => showRouteInMap(order)}
                          className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                        >
                          <Navigation className="h-4 w-4" />
                          <span>View Route</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DeliveryDashboard;

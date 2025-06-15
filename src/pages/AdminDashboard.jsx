import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { wsService } from "../services/websocket";
import Layout from "../components/Layout";
import toast from "react-hot-toast";
import {
  Package,
  Users,
  Clock,
  CheckCircle,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Eye,
} from "lucide-react";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (user) {
      loadData();
      setupRealtimeListeners();
    }
  }, [user]);

  const setupRealtimeListeners = () => {
    // Listen for new orders
    wsService.on("newOrder", (data) => {
      loadData();
      toast.success(`New order received from customer!`, {
        duration: 5000,
        icon: "📦",
      });
    });

    // Listen for order updates
    wsService.on("orderUpdate", (data) => {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === data.orderId ? { ...order, status: data.status } : order,
        ),
      );
      loadStats(); // Refresh stats
    });

    // Listen for delivery location updates
    wsService.on("deliveryLocation", (data) => {
      toast.success(
        `Delivery person updated location for order #${data.orderId}`,
        {
          duration: 3000,
          icon: "📍",
        },
      );
    });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ordersResponse, personnelResponse, statsResponse] =
        await Promise.all([
          apiService.getOrders(),
          apiService.getDeliveryPersonnel(),
          apiService.getUserStats(),
        ]);

      setOrders(ordersResponse.orders || []);
      setDeliveryPersonnel(personnelResponse.deliveryPersonnel || []);
      setStats(statsResponse.stats);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getUserStats();
      setStats(response.stats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const assignOrder = async (orderId, deliveryPersonId) => {
    try {
      // Add validation to ensure orderId is valid
      if (!orderId || orderId === 'undefined') {
        toast.error("Invalid order ID");
        return;
      }

      await apiService.assignOrder(orderId, deliveryPersonId);

      // Update local state using both _id and id for compatibility
      setOrders((prev) =>
        prev.map((order) =>
          (order._id === orderId || order.id === orderId)
            ? { ...order, status: "assigned", deliveryPersonId }
            : order,
        ),
      );

      const deliveryPerson = deliveryPersonnel.find(
        (dp) => (dp._id === deliveryPersonId || dp.id === deliveryPersonId),
      );
      toast.success(`Order ${orderId} assigned to ${deliveryPerson?.name}!`);
      loadStats(); // Refresh stats
    } catch (error) {
      console.error("Failed to assign order:", error);
      toast.error(error.message || "Failed to assign order");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-warning-100 text-warning-800 border-warning-200";
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

  const StatCard = ({ icon: Icon, label, value, color, trend }) => (
    <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-100 hover:shadow-medium transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <div className="flex items-center space-x-2">
            <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
            {trend && (
              <div className="flex items-center text-xs text-gray-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                <span>{trend}</span>
              </div>
            )}
          </div>
        </div>
        <div
          className={`p-3 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-100")}`}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const assignedOrders = orders.filter((order) => order.status === "assigned");
  const inProgressOrders = orders.filter(
    (order) => order.status === "picked-up",
  );
  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered",
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard 🎯
          </h1>
          <p className="text-gray-600">
            Manage orders, assign delivery personnel, and monitor system
            performance.
          </p>
        </div>

        {/* Priority Alerts */}
        {pendingOrders.length > 0 && (
          <div className="mb-6 bg-warning-50 border border-warning-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-warning-600" />
              <p className="text-warning-800 font-medium">
                {pendingOrders.length} order
                {pendingOrders.length > 1 ? "s" : ""} pending assignment
              </p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Package}
              label="Total Orders"
              value={stats.totalOrders || 0}
              color="text-blue-600"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={stats.pending || 0}
              color="text-warning-600"
            />
            <StatCard
              icon={UserCheck}
              label="In Progress"
              value={stats.inProgress || 0}
              color="text-purple-600"
            />
            <StatCard
              icon={CheckCircle}
              label="Delivered"
              value={stats.delivered || 0}
              color="text-success-600"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Orders Management */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900">
                  Order Management
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Assign delivery personnel to pending orders and monitor all
                  orders
                </p>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No orders in the system
                    </h3>
                    <p className="text-gray-500">
                      Orders will appear here as customers place them
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order._id || order.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-medium transition-all duration-300"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">
                                Order #{order._id || order.id}
                              </h3>
                              <button
                                onClick={() =>
                                  setSelectedOrder(
                                    selectedOrder?._id === (order._id || order.id)
                                      ? null
                                      : order,
                                  )
                                }
                                className="text-gray-400 hover:text-primary transition-colors"
                                title="Toggle details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(
                                order.createdAt || order.timestamp,
                              ).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(
                                order.createdAt || order.timestamp,
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </div>

                        {selectedOrder?.id === order.id && (
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-700 mb-1">
                                  Pickup:
                                </p>
                                <p className="text-gray-600">
                                  {order.pickupAddress}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">
                                  Delivery:
                                </p>
                                <p className="text-gray-600">
                                  {order.dropAddress}
                                </p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="font-medium text-gray-700 mb-1">
                                  Item:
                                </p>
                                <p className="text-gray-600">
                                  {order.itemDescription}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {order.status === "pending" &&
                          deliveryPersonnel.length > 0 && (
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-700">
                                Assign to:
                              </span>
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    // Use order._id for MongoDB compatibility
                                    const orderId = order._id || order.id;
                                    const deliveryPersonId = e.target.value;
                                    
                                    console.log('Assigning order:', orderId, 'to:', deliveryPersonId);
                                    assignOrder(orderId, deliveryPersonId);
                                  }
                                }}
                                className="flex-1 max-w-64 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Select delivery person
                                </option>
                                {deliveryPersonnel.map((person) => (
                                  <option key={person._id || person.id} value={person._id || person.id}>
                                    {person.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                        {selectedOrder?._id === (order._id || order.id) && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Assigned to:</strong>{" "}
                              {deliveryPersonnel.find(
                                (dp) => (dp._id === order.deliveryPersonId || dp.id === order.deliveryPersonId),
                              )?.name || "Unknown"}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Delivery Personnel */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delivery Personnel
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Active delivery team members
                </p>
              </div>
              <div className="p-6">
                {deliveryPersonnel.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">
                      No delivery personnel registered
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveryPersonnel.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {person.name}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {person.email}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {
                            assignedOrders.filter(
                              (o) => o.deliveryPersonId === person.id,
                            ).length
                          }{" "}
                          active
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Quick Overview
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending Orders</span>
                  <span className="font-semibold text-warning-600">
                    {pendingOrders.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Active Deliveries
                  </span>
                  <span className="font-semibold text-blue-600">
                    {assignedOrders.length + inProgressOrders.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Today's Deliveries
                  </span>
                  <span className="font-semibold text-success-600">
                    {deliveredOrders.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Available Personnel
                  </span>
                  <span className="font-semibold text-gray-900">
                    {deliveryPersonnel.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;

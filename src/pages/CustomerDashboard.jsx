import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { wsService } from "../services/websocket";
import Layout from "../components/Layout";
import AddressInput from "../components/AddressInput";
import OrderTracker from "../components/OrderTracker";
import toast from "react-hot-toast";
import { Package, Plus, MapPin, Clock, TrendingUp, Eye, Sparkles, Loader } from "lucide-react";
import { geminiService } from "../services/gemini";

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [showGeneratedDescription, setShowGeneratedDescription] = useState(false);
  const [stats, setStats] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);

  const [formData, setFormData] = useState({
    pickupAddress: "",
    dropAddress: "",
    itemName: "",
    itemDescription: "",
    pickupCoords: null,
    dropCoords: null,
  });

  useEffect(() => {
    if (user) {
      loadOrders();
      loadStats();
      setupRealtimeListeners();
    }
  }, [user]);

  const setupRealtimeListeners = () => {
    // Listen for order updates
    wsService.on("orderUpdate", (data) => {
      setOrders((prev) =>
        prev.map((order) =>
          (order._id === data.orderId || order.id === data.orderId) ? { ...order, status: data.status } : order,
        ),
      );

      // Update selected order if it matches
      if (selectedOrder && (selectedOrder._id === data.orderId || selectedOrder.id === data.orderId)) {
        setSelectedOrder((prev) => ({ ...prev, status: data.status }));
      }
    });

    // Listen for delivery location updates
    wsService.on("deliveryLocation", (data) => {
      if (selectedOrder && (selectedOrder._id === data.orderId || selectedOrder.id === data.orderId)) {
        setDeliveryLocation({
          lat: data.latitude,
          lng: data.longitude,
        });
      }
    });

    // Listen for order assigned notifications
    wsService.on("orderAssignedNotification", (data) => {
      loadOrders(); // Refresh orders
      toast.success(data.message);
    });

    // Listen for status updates
    wsService.on("orderStatusUpdateNotification", (data) => {
      loadOrders(); // Refresh orders
      toast.success(data.message);
    });
  };

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getOrders();
      setOrders(response.orders || []);
    } catch (error) {
      console.error("Failed to load orders:", error);
      toast.error("Failed to load orders");
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

  const generateDescription = async () => {
    if (!formData.itemName.trim()) {
      toast.error("Please enter an item name first");
      return;
    }

    try {
      setIsGeneratingDescription(true);
      const description = await geminiService.generateItemDescription(formData.itemName);
      setGeneratedDescription(description);
      setShowGeneratedDescription(true);
      toast.success("Description generated successfully!");
    } catch (error) {
      console.error("Failed to generate description:", error);
      toast.error(error.message || "Failed to generate description");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const applyGeneratedDescription = () => {
    setFormData(prev => ({
      ...prev,
      itemDescription: generatedDescription
    }));
    setShowGeneratedDescription(false);
    setGeneratedDescription("");
    toast.success("Description applied!");
  };

  const discardGeneratedDescription = () => {
    setShowGeneratedDescription(false);
    setGeneratedDescription("");
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (
      !formData.pickupAddress ||
      !formData.dropAddress ||
      !formData.itemName ||
      !formData.itemDescription
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);

      const orderData = {
        pickupAddress: formData.pickupAddress,
        dropAddress: formData.dropAddress,
        itemName: formData.itemName,
        itemDescription: formData.itemDescription,
        pickupCoords: formData.pickupCoords,
        dropCoords: formData.dropCoords,
      };

      await apiService.createOrder(orderData);

      // Reset form and reload orders
      setFormData({
        pickupAddress: "",
        dropAddress: "",
        itemName: "",
        itemDescription: "",
        pickupCoords: null,
        dropCoords: null,
      });
      setShowOrderForm(false);

      loadOrders();
      loadStats();

      toast.success("Your delivery request has been submitted successfully!");
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error(error.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
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

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-100 hover:shadow-medium transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
        </div>
        <div
          className={`p-3 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-100")}`}
        >
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600">
            Manage your delivery orders and track their progress in real-time.
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              icon={TrendingUp}
              label="In Progress"
              value={stats.inProgress || 0}
              color="text-purple-600"
            />
            <StatCard
              icon={Package}
              label="Delivered"
              value={stats.delivered || 0}
              color="text-success-600"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Orders Section */}
          <div className="space-y-6">
            {/* New Order Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Orders
              </h2>
              <button
                onClick={() => setShowOrderForm(!showOrderForm)}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>New Order</span>
              </button>
            </div>

            {/* Order Form */}
            {showOrderForm && (
              <div className="bg-white shadow-soft rounded-xl border border-gray-100 animate-fade-in">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Create New Delivery Order
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Fill in the details for your delivery request
                  </p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleSubmitOrder} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AddressInput
                        label="Pickup Address"
                        value={formData.pickupAddress}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            pickupAddress: value,
                          }))
                        }
                        onCoordinatesChange={(coords) =>
                          setFormData((prev) => ({
                            ...prev,
                            pickupCoords: coords,
                          }))
                        }
                        placeholder="Enter pickup address"
                        required
                        showCurrentLocation
                      />

                      <AddressInput
                        label="Delivery Address"
                        value={formData.dropAddress}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            dropAddress: value,
                          }))
                        }
                        onCoordinatesChange={(coords) =>
                          setFormData((prev) => ({
                            ...prev,
                            dropCoords: coords,
                          }))
                        }
                        placeholder="Enter delivery address"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.itemName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            itemName: e.target.value,
                          }))
                        }
                        placeholder="e.g., Laptop Computer, Birthday Cake, Legal Documents"
                        required
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Item Description <span className="text-red-500">*</span>
                        </label>
                        {geminiService.isAvailable() && (
                          <button
                            type="button"
                            onClick={generateDescription}
                            disabled={isGeneratingDescription || !formData.itemName.trim()}
                            className="flex items-center space-x-1 text-sm text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isGeneratingDescription ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            <span>
                              {isGeneratingDescription ? "Generating..." : "AI Generate"}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Generated Description Preview */}
                      {showGeneratedDescription && generatedDescription && (
                        <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium text-blue-900">Generated Description:</h4>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={applyGeneratedDescription}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={discardGeneratedDescription}
                                className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                              >
                                Discard
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-blue-800">{generatedDescription}</p>
                        </div>
                      )}

                      <textarea
                        value={formData.itemDescription}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            itemDescription: e.target.value,
                          }))
                        }
                        placeholder="Describe the item(s) to be delivered in detail"
                        required
                        rows={3}
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                      />
                      {geminiService.isAvailable() && (
                        <p className="text-xs text-gray-500 mt-1">
                          💡 Enter an item name above and click "AI Generate" for automatic description
                        </p>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        {isSubmitting ? "Creating..." : "Place Order"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOrderForm(false)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Orders List */}
            <div className="bg-white shadow-soft rounded-xl border border-gray-100 overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No orders yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create your first delivery order to get started
                  </p>
                  <button
                    onClick={() => setShowOrderForm(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all duration-200"
                  >
                    Place Your First Order
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <div
                      key={order._id || order.id}
                      className="p-6 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            Order #{order._id || order.id}
                          </h3>
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
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1 text-gray-400 hover:text-primary transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-700">Pickup</p>
                            <p className="text-gray-600">
                              {order.pickupAddress}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-700">
                              Delivery
                            </p>
                            <p className="text-gray-600">{order.dropAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Package className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-700">Item</p>
                            <p className="text-gray-600">
                              {order.itemDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Tracker Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Order Tracking
            </h2>
            <OrderTracker
              order={selectedOrder}
              deliveryLocation={deliveryLocation}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomerDashboard;

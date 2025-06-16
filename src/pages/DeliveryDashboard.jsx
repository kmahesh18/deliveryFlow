import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/api";
import { wsService } from "../services/websocket";
import { mapsService } from "../services/maps";
import Layout from "../components/Layout";
import DeliveryRouteMap from "../components/DeliveryRouteMap";
import toast from "react-hot-toast";
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  Navigation,
  Phone,
  Truck,
  Route,
  Map,
} from "lucide-react";

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingOrders, setTrackingOrders] = useState(new Set());
  const [showRouteView, setShowRouteView] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [optimizedOrders, setOptimizedOrders] = useState([]);
  const [orderETAs, setOrderETAs] = useState({});

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
      // Try to get location with fallback options
      const location = await mapsService.getCurrentLocationWithFallback();
      setCurrentLocation(location);

      // Only show critical notifications
      if (location.isDefault) {
        toast.error("Location access denied - using default location", {
          duration: 5000,
        });
      }

      // Update location every 10 seconds for active orders (more frequent updates)
      const interval = setInterval(async () => {
        try {
          // Only try precise location updates if we have permission
          let newLocation;
          if (!location.isDefault && !location.isApproximate) {
            newLocation = await mapsService.getCurrentLocation();
          } else {
            // If using fallback, try to get better location occasionally
            newLocation = await mapsService.getCurrentLocationWithFallback();
          }
          
          setCurrentLocation(newLocation);

          // Send location updates for orders being tracked (only if not using default location)
          if (!newLocation.isDefault && trackingOrders.size > 0) {
            trackingOrders.forEach((orderId) => {
              console.log("Sending location update for order:", orderId, newLocation);
              wsService.sendLocationUpdate(
                orderId,
                newLocation.lat,
                newLocation.lng,
              );
            });
          }
        } catch (error) {
          console.error("Location update failed:", error);
          // Don't show toast for every failed update to avoid spam
        }
      }, 10000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error("Failed to get initial location:", error);
      toast.error("Unable to access location services. Some features may not work properly.");
    }
  };

  const loadAssignedOrders = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getOrders();
      
      // Ensure we have valid orders array
      const orders = Array.isArray(response.orders) ? response.orders : [];
      
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
        console.error("Invalid order ID");
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

      // Handle location tracking using proper ID - only show notification for delivered orders
      if (newStatus === "picked-up") {
        setTrackingOrders((prev) => new Set([...prev, orderId]));
      } else if (newStatus === "delivered") {
        setTrackingOrders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(orderId);
          return newSet;
        });
        toast.success("Order delivered!", {
          icon: "🎉",
        });
      }

      loadStats();
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast.error("Status update failed");
    }
  };

  const getDirections = async (address) => {
    if (!currentLocation) {
      return;
    }

    try {
      const destination = await mapsService.geocodeAddress(address);
      // Use OpenStreetMap routing instead of Google Maps
      const directionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${currentLocation.lat}%2C${currentLocation.lng}%3B${destination.lat}%2C${destination.lng}`;
      window.open(directionsUrl, "_blank");
    } catch (error) {
      console.error("Failed to get directions:", error);
      toast.error("Navigation failed");
    }
  };

  const showRouteInMap = async (order) => {
    try {
      if (!currentLocation) {
        console.warn('Current location required to show route');
        return;
      }

      // Enable route view if not already shown
      if (!showRouteView) {
        setShowRouteView(true);
      }

      // Calculate route to this specific order - use correct field name with fallbacks
      const destination = order?.dropAddress || 
                         order?.deliveryAddress || 
                         order?.pickupAddress;
      
      if (!destination) {
        console.error('Order missing all address fields:', order);
        return;
      }

      const routeData = await mapsService.calculateRoute(currentLocation, [destination]);
      setRouteData(routeData);
      
      // Scroll to route view
      setTimeout(() => {
        const routeElement = document.querySelector('[data-route-view]');
        if (routeElement) {
          routeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Failed to show route:', error);
      toast.error('Failed to calculate route');
    }
  };

  const getDirectionsToOrder = async (order) => {
    try {
      if (!currentLocation) {
        console.warn('Current location required for directions');
        return;
      }

      // Use correct field name for destination with multiple fallbacks
      const destination = order?.dropAddress || 
                         order?.deliveryAddress || 
                         order?.pickupAddress;
      
      if (!destination) {
        console.error('Order missing all address fields:', order);
        return;
      }

      await openExternalNavigation(destination);
    } catch (error) {
      console.error('Failed to get directions:', error);
      toast.error('Failed to open directions');
    }
  };

  const toggleRouteView = () => {
    setShowRouteView(!showRouteView);
  };

  const handleRouteCalculated = (calculatedRoute, orderedDestinations) => {
    setRouteData(calculatedRoute);
    setOptimizedOrders(orderedDestinations);
    // Only show notification for significant route optimizations
    if (orderedDestinations.length > 1) {
      toast.success(`Route optimized - ${Math.round(calculatedRoute.totalDuration)} min`);
    }
  };

  const startOptimizedDeliveries = async () => {
    if (!optimizedOrders.length) {
      toast.error('No optimized route available. Please calculate route first.');
      return;
    }

    try {
      // Mark all orders as being delivered in optimized order
      const firstOrder = optimizedOrders[0];
      if (firstOrder) {
        await updateOrderStatus(firstOrder.id, 'picked-up');
        toast.success(`Started delivery sequence`, {
          icon: '🚀'
        });
      }
    } catch (error) {
      console.error('Failed to start optimized deliveries:', error);
      toast.error('Failed to start delivery sequence');
    }
  };

  const calculateETA = async (order) => {
    try {
      if (!currentLocation) {
        return 'Location required';
      }

      // Use correct field name for destination with fallbacks
      const destination = order?.dropAddress || 
                         order?.deliveryAddress || 
                         order?.pickupAddress;
      
      if (!destination) {
        console.error('Order missing all address fields for ETA calculation:', order);
        return 'Address missing';
      }

      console.log('⏱️ Calculating ETA to destination:', destination);
      const routeData = await mapsService.calculateRoute(currentLocation, [destination]);
      
      return `${Math.round(routeData.totalDuration)} min`;
    } catch (error) {
      console.error('Failed to calculate ETA:', error);
      return 'ETA unavailable';
    }
  };

  const updateOrderETA = async (order) => {
    const orderId = getOrderId(order);
    if (!orderETAs[orderId] && currentLocation) {
      const eta = await calculateETA(order);
      setOrderETAs(prev => ({ ...prev, [orderId]: eta }));
    }
  };

  // Calculate ETAs when location or orders change
  useEffect(() => {
    if (currentLocation && assignedOrders.length > 0) {
      assignedOrders.forEach(order => {
        updateOrderETA(order);
      });
    }
  }, [currentLocation, assignedOrders]);

  const getNextDelivery = () => {
    if (!optimizedOrders.length) return null;
    
    return optimizedOrders.find(order => 
      order.status === 'assigned' || order.status === 'picked-up'
    );
  };

  const openRouteNavigation = async () => {
    if (!currentLocation || !optimizedOrders.length) {
      toast.error('Location and route required for navigation');
      return;
    }

    try {
      const destinations = optimizedOrders.map(order => order.address).join('|');
      const navigationUrl = `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${destinations}`;
      window.open(navigationUrl, '_blank');
      toast.success('Opening route navigation...');
    } catch (error) {
      console.error('Failed to open route navigation:', error);
      toast.error('Failed to open navigation');
    }
  };

  const openExternalNavigation = async (address) => {
    if (!currentLocation) {
      console.warn("Current location not available");
      return;
    }

    try {
      const destination = await mapsService.geocodeAddress(address);
      
      // Create navigation URLs for different apps
      const googleMapsUrl = `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${destination.lat},${destination.lng}`;
      const appleMapsUrl = `https://maps.apple.com/?daddr=${destination.lat},${destination.lng}&saddr=${currentLocation.lat},${currentLocation.lng}`;
      const wazeUrl = `https://www.waze.com/ul?ll=${destination.lat}%2C${destination.lng}&navigate=yes`;

      // Detect mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, try to open native apps
        window.location.href = googleMapsUrl;
      } else {
        // On desktop, open in new tab
        window.open(googleMapsUrl, "_blank");
      }

    } catch (error) {
      console.error("Failed to open navigation:", error);
      toast.error("Failed to open navigation");
    }
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

  const requestLocationPermission = async () => {
    try {
      // Try to get location permission again
      const location = await mapsService.getCurrentLocation();
      setCurrentLocation(location);
      
      toast.success("Location tracking enabled");
    } catch (error) {
      if (error.message.includes("denied")) {
        toast.error(
          "Location access denied. Please enable location services in your browser settings and refresh the page.",
          { duration: 8000 }
        );
      } else {
        toast.error("Failed to access location. Please try again.");
      }
      
      console.error("Location permission request failed:", error);
    }
  };

  const showLocationHelp = () => {
    toast.custom((t) => (
      <div className="bg-white p-6 rounded-lg shadow-lg border max-w-md">
        <div className="flex items-start space-x-3">
          <MapPin className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Enable Location Services</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>To enable accurate delivery tracking:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Click the location icon in your browser's address bar</li>
                <li>Select "Allow" when prompted for location access</li>
                <li>If blocked, click the settings icon and allow location</li>
                <li>Refresh the page after enabling</li>
              </ol>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  requestLocationPermission();
                }}
                className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 10000 });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Good day, {user?.name || 'Delivery Person'}! 🚚
              </h1>
              <p className="text-gray-600">
                Manage your delivery assignments and update order status in
                real-time.
              </p>
            </div>
            
            {/* Route Controls */}
            <div className="flex items-center space-x-3">
              {assignedOrders.length > 0 && currentLocation && (
                <>
                  <button
                    onClick={toggleRouteView}
                    className={`px-4 py-2 rounded-lg border transition-colors flex items-center space-x-2 ${
                      showRouteView 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Map className="h-4 w-4" />
                    <span>{showRouteView ? 'Hide Route' : 'View Route'}</span>
                  </button>
                  
                  {routeData && (
                    <button
                      onClick={openRouteNavigation}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <Navigation className="h-4 w-4" />
                      <span>Navigate</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {currentLocation && !currentLocation.isDefault && !currentLocation.isApproximate && (
            <div className="mt-3 flex items-center space-x-2 text-sm text-green-600">
              <Navigation className="h-4 w-4 text-green-500" />
              <span>Location tracking active</span>
            </div>
          )}

          {currentLocation && (currentLocation.isDefault || currentLocation.isApproximate) && (
            <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      {currentLocation.isDefault 
                        ? "Location access denied" 
                        : "Using approximate location"}
                    </p>
                    <p className="text-xs text-yellow-600">
                      Enable location services for accurate delivery tracking
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={showLocationHelp}
                    className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 transition-colors"
                  >
                    Help
                  </button>
                  <button
                    onClick={requestLocationPermission}
                    className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 transition-colors"
                  >
                    Enable Location
                  </button>
                </div>
              </div>
            </div>
          )}

          {!currentLocation && (
            <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Location unavailable</p>
                    <p className="text-xs text-red-600">Unable to access location services</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={showLocationHelp}
                    className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors"
                  >
                    Help
                  </button>
                  <button
                    onClick={requestLocationPermission}
                    className="px-3 py-1 text-xs font-medium text-red-800 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
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
                              <div className="flex items-center space-x-2">
                                {orderETAs[orderId] && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center space-x-1">
                                    <Clock className="h-3 w-3" />
                                    <span>ETA: {orderETAs[orderId]}</span>
                                  </span>
                                )}
                                <button
                                  onClick={() => getDirections(order.dropAddress || '')}
                                  className="text-red-600 hover:text-red-700 transition-colors"
                                  title="Get directions"
                                >
                                  <Navigation className="h-4 w-4" />
                                </button>
                              </div>
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
                          <Route className="h-4 w-4" />
                          <span>View Route</span>
                        </button>

                        <button
                          onClick={() => getDirectionsToOrder(order)}
                          className="flex items-center space-x-2 border border-blue-300 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
                        >
                          <Navigation className="h-4 w-4" />
                          <span>Get Directions</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Route View */}
        {showRouteView && (
          <div className="mb-8" data-route-view>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                      <Route className="h-5 w-5 text-blue-600" />
                      <span>Delivery Route</span>
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Optimized route for all assigned deliveries
                    </p>
                  </div>
                  {routeData && (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={startOptimizedDeliveries}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Truck className="h-4 w-4" />
                        <span>Start Route</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <DeliveryRouteMap
                orders={assignedOrders}
                currentLocation={currentLocation}
                onRouteCalculated={handleRouteCalculated}
                className="border-0 shadow-none"
              />
              
              {/* Next Delivery Card */}
              {(() => {
                const nextDelivery = getNextDelivery();
                return nextDelivery ? (
                  <div className="p-6 border-t border-gray-100 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Next Delivery</h4>
                        <p className="text-blue-700 font-semibold">{nextDelivery.customerName}</p>
                        <p className="text-sm text-blue-600">{nextDelivery.address}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => openExternalNavigation(nextDelivery.address)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                        >
                          <Navigation className="h-4 w-4" />
                          <span>Navigate</span>
                        </button>
                        <button
                          onClick={() => updateOrderStatus(nextDelivery.id, 'picked-up')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <Package className="h-4 w-4" />
                          <span>Pick Up</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DeliveryDashboard;

import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Clock, Package, User } from "lucide-react";
import { mapsService } from "../services/maps";
import { wsService } from "../services/websocket";

const OrderTracker = ({ order, deliveryLocation }) => {
  const [map, setMap] = useState(null);
  const [pickupMarker, setPickupMarker] = useState(null);
  const [dropMarker, setDropMarker] = useState(null);
  const [deliveryMarker, setDeliveryMarker] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const mapRef = useRef(null);

  useEffect(() => {
    console.log("🔄 OrderTracker useEffect triggered");
    console.log("📊 Current state:", {
      isMapLoaded,
      hasMap: !!map,
      hasOrder: !!order,
      orderId: order?.id,
      mapRefExists: !!mapRef.current,
    });

    if (!isMapLoaded && !map) {
      console.log("🗺️ Initializing map...");
      initializeMap();
    } else if (map && order) {
      console.log("📍 Map exists and order available, updating map data...");
      updateMapWithOrderData();
    }

    return cleanup;
  }, [order, isMapLoaded]);

  const initializeMap = async () => {
    console.log("🚀 initializeMap called");
    console.log("📋 mapRef.current exists:", !!mapRef.current);

    if (!mapRef.current) {
      console.error("❌ mapRef.current is null/undefined");
      return;
    }

    try {
      console.log("🔧 Creating map with mapsService...");
      const mapInstance = await mapsService.createMap(mapRef.current, {
        zoom: 12,
        center: { lat: 40.7128, lng: -74.006 },
      });

      console.log("✅ Map creation result:", !!mapInstance);
      console.log("🗺️ MapInstance type:", typeof mapInstance);

      if (mapInstance) {
        console.log("🎯 Setting map state and isMapLoaded to true");
        setMap(mapInstance);
        setIsMapLoaded(true);
      } else {
        console.error("❌ mapInstance is null/undefined");
        setIsMapLoaded(true); // Set to true to show error state
      }
    } catch (error) {
      console.error("💥 Failed to initialize map:", error);
      console.error("📄 Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      setIsMapLoaded(true);
    }
  };

  const updateMapWithOrderData = async () => {
    console.log("📍 updateMapWithOrderData called");
    console.log("🔍 Checking prerequisites:", {
      hasMap: !!map,
      hasOrder: !!order,
      orderData: order
        ? {
            id: order.id,
            status: order.status,
            pickupAddress: order.pickupAddress,
            dropAddress: order.dropAddress,
            hasPickupCoords: !!order.pickupCoords,
            hasDropCoords: !!order.dropCoords,
          }
        : null,
    });

    if (!map || !order) {
      console.warn("⚠️ Missing map or order, skipping update");
      return;
    }

    try {
      console.log("🧹 Cleaning up existing markers");
      cleanup();

      console.log("📐 Creating bounds for map");
      const bounds = L.latLngBounds([]);

      // Add pickup marker
      if (order.pickupCoords || order.pickupAddress) {
        console.log("📍 Processing pickup location");
        let pickupPosition;

        if (order.pickupCoords) {
          console.log(
            "✅ Using existing pickup coordinates:",
            order.pickupCoords
          );
          pickupPosition = order.pickupCoords;
        } else {
          console.log("🔍 Geocoding pickup address:", order.pickupAddress);
          const geocoded = await mapsService.geocodeAddress(
            order.pickupAddress
          );
          console.log("📍 Geocoded pickup result:", geocoded);
          pickupPosition = { lat: geocoded.lat, lng: geocoded.lng };
        }

        console.log("🔵 Creating pickup marker at:", pickupPosition);
        const pickupIcon = L.divIcon({
          className: "custom-marker pickup-marker",
          html: '<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const pickup = L.marker([pickupPosition.lat, pickupPosition.lng], {
          icon: pickupIcon,
          title: "Pickup Location",
        }).addTo(map);

        pickup.bindPopup(`
          <div class="p-2">
            <h3 class="font-semibold text-blue-600">Pickup Location</h3>
            <p class="text-sm text-gray-600">${order.pickupAddress}</p>
          </div>
        `);

        setPickupMarker(pickup);
        bounds.extend([pickupPosition.lat, pickupPosition.lng]);
        console.log("✅ Pickup marker added successfully");
      }

      // Add drop-off marker
      if (order.dropCoords || order.dropAddress) {
        console.log("📍 Processing drop-off location");
        let dropPosition;

        if (order.dropCoords) {
          console.log("✅ Using existing drop coordinates:", order.dropCoords);
          dropPosition = order.dropCoords;
        } else {
          console.log("🔍 Geocoding drop address:", order.dropAddress);
          const geocoded = await mapsService.geocodeAddress(order.dropAddress);
          console.log("📍 Geocoded drop result:", geocoded);
          dropPosition = { lat: geocoded.lat, lng: geocoded.lng };
        }

        console.log("🔴 Creating drop marker at:", dropPosition);
        const dropIcon = L.divIcon({
          className: "custom-marker drop-marker",
          html: '<div class="w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-lg"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const drop = L.marker([dropPosition.lat, dropPosition.lng], {
          icon: dropIcon,
          title: "Delivery Location",
        }).addTo(map);

        drop.bindPopup(`
          <div class="p-2">
            <h3 class="font-semibold text-red-600">Delivery Location</h3>
            <p class="text-sm text-gray-600">${order.dropAddress}</p>
          </div>
        `);

        setDropMarker(drop);
        bounds.extend([dropPosition.lat, dropPosition.lng]);
        console.log("✅ Drop marker added successfully");
      }

      // Add delivery person marker if available
      if (order.status !== "pending" && deliveryLocation) {
        console.log("🚚 Adding delivery person marker at:", deliveryLocation);
        addDeliveryMarker(deliveryLocation);
        bounds.extend([deliveryLocation.lat, deliveryLocation.lng]);
      }

      // Fit map to show all markers
      if (bounds.isValid()) {
        console.log("🗺️ Fitting map to bounds");
        map.fitBounds(bounds, { padding: [20, 20] });

        // Ensure minimum zoom level after fitting bounds
        setTimeout(() => {
          const currentZoom = map.getZoom();
          console.log("🔍 Current zoom level:", currentZoom);
          if (currentZoom > 15) {
            console.log("🔧 Adjusting zoom to 15");
            map.setZoom(15);
          }
        }, 100);
      } else {
        console.warn("⚠️ Bounds are not valid");
      }

      console.log("✅ Map update completed successfully");
    } catch (error) {
      console.error("💥 Failed to update map:", error);
      console.error("📄 Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
  };

  const addDeliveryMarker = (location) => {
    console.log("🚚 addDeliveryMarker called with:", location);

    if (!map) {
      console.warn("⚠️ No map available for delivery marker");
      return;
    }

    try {
      console.log("🟢 Creating delivery person marker");
      const deliveryIcon = L.divIcon({
        className: "custom-marker delivery-marker",
        html: '<div class="w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg animate-pulse"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const delivery = L.marker([location.lat, location.lng], {
        icon: deliveryIcon,
        title: "Delivery Person",
      }).addTo(map);

      delivery.bindPopup(`
        <div class="p-2">
          <h3 class="font-semibold text-green-600">Delivery Person</h3>
          <p class="text-sm text-gray-600">Current location</p>
          <p class="text-xs text-gray-500">Updated: ${new Date().toLocaleTimeString()}</p>
        </div>
      `);

      setDeliveryMarker(delivery);
      console.log("✅ Delivery marker added successfully");
    } catch (error) {
      console.error("💥 Failed to add delivery marker:", error);
    }
  };

  const cleanup = () => {
    console.log("🧹 Cleanup called");
    console.log("🔍 Markers to clean:", {
      hasPickupMarker: !!pickupMarker,
      hasDropMarker: !!dropMarker,
      hasDeliveryMarker: !!deliveryMarker,
      hasMap: !!map,
    });

    if (pickupMarker && map) {
      console.log("🔵 Removing pickup marker");
      map.removeLayer(pickupMarker);
      setPickupMarker(null);
    }
    if (dropMarker && map) {
      console.log("🔴 Removing drop marker");
      map.removeLayer(dropMarker);
      setDropMarker(null);
    }
    if (deliveryMarker && map) {
      console.log("🟢 Removing delivery marker");
      map.removeLayer(deliveryMarker);
      setDeliveryMarker(null);
    }
    console.log("✅ Cleanup completed");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "picked-up":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "delivered":
        return "bg-green-100 text-green-800 border-green-200";
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

  if (!order) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No order selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-soft overflow-hidden">
      {/* Order Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Order #{order._id || order.id}
            </h3>
            <p className="text-sm text-gray-600">
              Created{" "}
              {new Date(
                order.createdAt || order.timestamp
              ).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
              order.status
            )}`}
          >
            {formatStatus(order.status)}
          </span>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">Pickup</p>
                <p className="text-sm text-gray-600">{order.pickupAddress}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Navigation className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">Delivery</p>
                <p className="text-sm text-gray-600">{order.dropAddress}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Package className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700">Item</p>
            <p className="text-sm text-gray-600">{order.itemDescription}</p>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="relative">
        <div ref={mapRef} className="w-full h-80 bg-gray-100" />

        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}

        {!mapsService.isAvailable() && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Map not available</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Timeline */}
      <div className="p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Order Timeline
        </h4>
        <div className="space-y-3">
          <div
            className={`flex items-center space-x-3 ${
              order.status === "pending" ? "text-yellow-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                order.status === "pending" ? "bg-yellow-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-sm">Order placed</span>
          </div>
          <div
            className={`flex items-center space-x-3 ${
              ["assigned", "picked-up", "delivered"].includes(order.status)
                ? "text-blue-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                ["assigned", "picked-up", "delivered"].includes(order.status)
                  ? "bg-blue-500"
                  : "bg-gray-300"
              }`}
            ></div>
            <span className="text-sm">Assigned to delivery person</span>
          </div>
          <div
            className={`flex items-center space-x-3 ${
              ["picked-up", "delivered"].includes(order.status)
                ? "text-purple-600"
                : "text-gray-400"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                ["picked-up", "delivered"].includes(order.status)
                  ? "bg-purple-500"
                  : "bg-gray-300"
              }`}
            ></div>
            <span className="text-sm">Package picked up</span>
          </div>
          <div
            className={`flex items-center space-x-3 ${
              order.status === "delivered" ? "text-green-600" : "text-gray-400"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full ${
                order.status === "delivered" ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
            <span className="text-sm">Package delivered</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracker;
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
    initializeMap();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (map && order) {
      updateMapWithOrderData();
    }
  }, [map, order]);

  useEffect(() => {
    if (map && deliveryLocation && deliveryMarker) {
      updateDeliveryLocation();
    }
  }, [deliveryLocation, deliveryMarker]);

  const initializeMap = async () => {
    if (!mapRef.current) return;

    try {
      const mapInstance = await mapsService.createMap(mapRef.current, {
        zoom: 12,
        center: { lat: 40.7128, lng: -74.006 },
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      if (mapInstance) {
        setMap(mapInstance);
        setIsMapLoaded(true);
      }
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }
  };

  const updateMapWithOrderData = async () => {
    if (!map || !order) return;

    try {
      // Clear existing markers and directions
      cleanup();

      const bounds = new mapsService.maps.LatLngBounds();

      // Add pickup marker
      if (order.pickupCoords || order.pickupAddress) {
        let pickupPosition;

        if (order.pickupCoords) {
          pickupPosition = order.pickupCoords;
        } else {
          const geocoded = await mapsService.geocodeAddress(
            order.pickupAddress,
          );
          pickupPosition = { lat: geocoded.lat, lng: geocoded.lng };
        }

        const pickup = mapsService.createMarker(map, pickupPosition, {
          title: "Pickup Location",
          icon: {
            path: mapsService.maps.SymbolPath.CIRCLE,
            fillColor: "#3B82F6",
            fillOpacity: 1,
            strokeColor: "#1E40AF",
            strokeWeight: 2,
            scale: 8,
          },
        });

        const pickupInfo = mapsService.createInfoWindow(
          `<div class="p-2">
            <h3 class="font-semibold text-blue-600">Pickup Location</h3>
            <p class="text-sm text-gray-600">${order.pickupAddress}</p>
          </div>`,
        );

        pickup.addListener("click", () => {
          pickupInfo.open(map, pickup);
        });

        setPickupMarker(pickup);
        bounds.extend(pickupPosition);
      }

      // Add drop-off marker
      if (order.dropCoords || order.dropAddress) {
        let dropPosition;

        if (order.dropCoords) {
          dropPosition = order.dropCoords;
        } else {
          const geocoded = await mapsService.geocodeAddress(order.dropAddress);
          dropPosition = { lat: geocoded.lat, lng: geocoded.lng };
        }

        const drop = mapsService.createMarker(map, dropPosition, {
          title: "Delivery Location",
          icon: {
            path: mapsService.maps.SymbolPath.CIRCLE,
            fillColor: "#EF4444",
            fillOpacity: 1,
            strokeColor: "#DC2626",
            strokeWeight: 2,
            scale: 8,
          },
        });

        const dropInfo = mapsService.createInfoWindow(
          `<div class="p-2">
            <h3 class="font-semibold text-red-600">Delivery Location</h3>
            <p class="text-sm text-gray-600">${order.dropAddress}</p>
          </div>`,
        );

        drop.addListener("click", () => {
          dropInfo.open(map, drop);
        });

        setDropMarker(drop);
        bounds.extend(dropPosition);
      }

      // Add delivery person marker if order is assigned
      if (order.status !== "pending" && deliveryLocation) {
        addDeliveryMarker(deliveryLocation);
        bounds.extend(deliveryLocation);
      }

      // Fit map to show all markers
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);

        // Ensure minimum zoom level
        const listener = mapsService.maps.event.addListener(
          map,
          "bounds_changed",
          () => {
            if (map.getZoom() > 15) {
              map.setZoom(15);
            }
            mapsService.maps.event.removeListener(listener);
          },
        );
      }
    } catch (error) {
      console.error("Failed to update map:", error);
    }
  };

  const addDeliveryMarker = (location) => {
    if (!map) return;

    const delivery = mapsService.createMarker(map, location, {
      title: "Delivery Person",
      icon: {
        path: mapsService.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        fillColor: "#10B981",
        fillOpacity: 1,
        strokeColor: "#059669",
        strokeWeight: 2,
        scale: 6,
        rotation: 0,
      },
    });

    const deliveryInfo = mapsService.createInfoWindow(
      `<div class="p-2">
        <h3 class="font-semibold text-green-600">Delivery Person</h3>
        <p class="text-sm text-gray-600">Current location</p>
        <p class="text-xs text-gray-500">Updated: ${new Date().toLocaleTimeString()}</p>
      </div>`,
    );

    delivery.addListener("click", () => {
      deliveryInfo.open(map, delivery);
    });

    setDeliveryMarker(delivery);
  };

  const updateDeliveryLocation = () => {
    if (!deliveryMarker || !deliveryLocation) return;

    deliveryMarker.setPosition(deliveryLocation);

    // Optionally center map on delivery person
    // map.panTo(deliveryLocation);
  };

  const cleanup = () => {
    if (pickupMarker) {
      pickupMarker.setMap(null);
      setPickupMarker(null);
    }
    if (dropMarker) {
      dropMarker.setMap(null);
      setDropMarker(null);
    }
    if (deliveryMarker) {
      deliveryMarker.setMap(null);
      setDeliveryMarker(null);
    }
    if (directionsRenderer) {
      directionsRenderer.setMap(null);
      setDirectionsRenderer(null);
    }
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
                order.createdAt || order.timestamp,
              ).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}
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
            className={`flex items-center space-x-3 ${order.status === "pending" ? "text-yellow-600" : "text-gray-400"}`}
          >
            <div
              className={`w-3 h-3 rounded-full ${order.status === "pending" ? "bg-yellow-500" : "bg-gray-300"}`}
            ></div>
            <span className="text-sm">Order placed</span>
          </div>
          <div
            className={`flex items-center space-x-3 ${["assigned", "picked-up", "delivered"].includes(order.status) ? "text-blue-600" : "text-gray-400"}`}
          >
            <div
              className={`w-3 h-3 rounded-full ${["assigned", "picked-up", "delivered"].includes(order.status) ? "bg-blue-500" : "bg-gray-300"}`}
            ></div>
            <span className="text-sm">Assigned to delivery person</span>
          </div>
          <div
            className={`flex items-center space-x-3 ${["picked-up", "delivered"].includes(order.status) ? "text-purple-600" : "text-gray-400"}`}
          >
            <div
              className={`w-3 h-3 rounded-full ${["picked-up", "delivered"].includes(order.status) ? "bg-purple-500" : "bg-gray-300"}`}
            ></div>
            <span className="text-sm">Package picked up</span>
          </div>
          <div
            className={`flex items-center space-x-3 ${order.status === "delivered" ? "text-green-600" : "text-gray-400"}`}
          >
            <div
              className={`w-3 h-3 rounded-full ${order.status === "delivered" ? "bg-green-500" : "bg-gray-300"}`}
            ></div>
            <span className="text-sm">Package delivered</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracker;

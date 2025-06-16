import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Route, Clock, Truck, AlertCircle } from 'lucide-react';
import { mapsService } from '../services/maps';
import toast from 'react-hot-toast';

const DeliveryRouteMap = ({ 
  orders = [], 
  currentLocation, 
  onRouteCalculated,
  className = "",
  showOptimization = true 
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [route, setRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [optimizedOrder, setOptimizedOrder] = useState([]);

  useEffect(() => {
    if (mapRef.current && !map) {
      initializeMap();
    }
  }, []);

  useEffect(() => {
    if (map && currentLocation && orders.length > 0) {
      calculateRoute();
    }
  }, [map, currentLocation, orders]);

  const initializeMap = async () => {
    try {
      // Initialize with Leaflet (using existing createMap function)
      const mapInstance = await mapsService.createMap(mapRef.current, {
        center: currentLocation || { lat: 37.7749, lng: -122.4194 },
        zoom: 12
      });
      setMap(mapInstance);
    } catch (error) {
      console.error('Failed to initialize map:', error);
      toast.error('Failed to load map');
    }
  };

  const calculateRoute = async () => {
    if (!currentLocation || orders.length === 0) return;

    setIsLoading(true);
    try {
      // Extract delivery addresses with proper field names
      const destinations = orders.map(order => ({
        id: order._id || order.id,
        address: order.dropAddress || order.deliveryAddress, // Use dropAddress as primary
        customerName: order.customerName || order.customer?.name || 'Unknown Customer',
        status: order.status
      })).filter(dest => dest.address && dest.address.trim() !== ''); // Filter out empty addresses

      if (destinations.length === 0) {
        console.warn("No valid delivery addresses found in orders");
        toast.warning("No delivery addresses found for route calculation");
        return;
      }

      // Optimize route if requested
      let orderedDestinations = destinations;
      if (showOptimization && destinations.length > 1) {
        orderedDestinations = await optimizeRoute(currentLocation, destinations);
        setOptimizedOrder(orderedDestinations);
      }

      // Calculate route
      const routeData = await mapsService.calculateRoute(
        currentLocation,
        orderedDestinations.map(dest => dest.address)
      );

      setRoute(routeData);
      setRouteInfo({
        totalDistance: routeData.totalDistance,
        totalDuration: routeData.totalDuration,
        stops: orderedDestinations.length
      });

      onRouteCalculated?.(routeData, orderedDestinations);

      // Display route on map
      await mapsService.displayRoute(map, routeData);

      // Notify about successful route calculation only for multiple stops
      if (orderedDestinations.length > 1) {
        toast.success(`Route calculated with ${orderedDestinations.length} stops`);
      }
    } catch (error) {
      console.error('Route calculation failed:', error);
      toast.error('Failed to calculate route');
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeRoute = async (start, destinations) => {
    try {
      // Simple nearest neighbor algorithm for route optimization
      const unvisited = [...destinations];
      const optimized = [];
      let current = start;

      while (unvisited.length > 0) {
        let nearest = null;
        let nearestDistance = Infinity;
        let nearestIndex = -1;

        for (let i = 0; i < unvisited.length; i++) {
          const dest = unvisited[i];
          try {
            const coords = await mapsService.geocodeAddress(dest.address);
            const distance = mapsService.calculateDistance(current, coords);
            
            if (distance < nearestDistance) {
              nearest = dest;
              nearestDistance = distance;
              nearestIndex = i;
            }
          } catch (error) {
            console.warn(`Failed to geocode ${dest.address}:`, error);
          }
        }

        if (nearest) {
          optimized.push(nearest);
          unvisited.splice(nearestIndex, 1);
          current = await mapsService.geocodeAddress(nearest.address);
        } else {
          // If geocoding fails, just add remaining addresses in order
          optimized.push(...unvisited);
          break;
        }
      }

      return optimized;
    } catch (error) {
      console.error('Route optimization failed:', error);
      return destinations;
    }
  };

  const openExternalNavigation = async (destination) => {
    if (!currentLocation) {
      toast.error('Current location not available');
      return;
    }

    try {
      const coords = await mapsService.geocodeAddress(destination);
      
      // Try different navigation apps
      const navigationOptions = [
        {
          name: 'Google Maps',
          url: `https://www.google.com/maps/dir/${currentLocation.lat},${currentLocation.lng}/${coords.lat},${coords.lng}`
        },
        {
          name: 'Apple Maps',
          url: `https://maps.apple.com/?daddr=${coords.lat},${coords.lng}&saddr=${currentLocation.lat},${currentLocation.lng}`
        },
        {
          name: 'Waze',
          url: `https://www.waze.com/ul?ll=${coords.lat}%2C${coords.lng}&navigate=yes`
        }
      ];

      // Open in new tab (will trigger the default map app on mobile)
      window.open(navigationOptions[0].url, '_blank');
      
      // Silently open navigation - no notification needed
    } catch (error) {
      console.error('Navigation failed:', error);
      toast.error('Failed to open navigation');
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDistance = (meters) => {
    const km = meters / 1000;
    return km > 1 ? `${km.toFixed(1)} km` : `${meters} m`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Route Info Header */}
      {routeInfo && (
        <div className="bg-blue-50 border-b border-blue-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Route className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {routeInfo.stops} stops
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {formatDuration(routeInfo.totalDuration)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Navigation className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {formatDistance(routeInfo.totalDistance)}
                </span>
              </div>
            </div>
            {isLoading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Calculating...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-96 bg-gray-100"
          style={{ minHeight: '400px' }}
        >
          {!map && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 mb-2">Loading interactive map...</p>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            </div>
          )}
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 space-y-2">
          <button
            onClick={calculateRoute}
            disabled={isLoading || !currentLocation || orders.length === 0}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Route className="h-4 w-4" />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {/* Route Steps */}
      {optimizedOrder.length > 0 && (
        <div className="p-4 border-t border-gray-100">
          <h4 className="font-medium text-gray-900 mb-3">Optimized Route</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {optimizedOrder.map((destination, index) => (
              <div key={destination.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {destination.customerName}
                    </p>
                    <p className="text-xs text-gray-600 truncate max-w-48">
                      {destination.address}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      destination.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      destination.status === 'picked-up' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {destination.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => openExternalNavigation(destination.address)}
                  className="flex-shrink-0 p-1 text-blue-600 hover:bg-blue-100 rounded"
                  title="Open in navigation app"
                >
                  <Navigation className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Orders State */}
      {orders.length === 0 && (
        <div className="p-8 text-center">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No delivery orders to display</p>
        </div>
      )}

      {/* Location Error State */}
      {!currentLocation && (
        <div className="p-4 bg-yellow-50 border-t border-yellow-100">
          <div className="flex items-center space-x-2 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Location required for route calculation
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryRouteMap;

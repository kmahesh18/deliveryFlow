import React, { useState } from 'react';
import { Navigation, MapPin, Clock, Route, ExternalLink } from 'lucide-react';
import { mapsService } from '../services/maps';
import toast from 'react-hot-toast';

const NavigationHelper = ({ 
  from, 
  to, 
  className = "",
  showETA = false,
  size = "md" 
}) => {
  const [eta, setETA] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateETA = async () => {
    if (!from || !to) {
      toast.error('Start and destination locations required');
      return;
    }

    setIsCalculating(true);
    try {
      const routeData = await mapsService.calculateRoute(from, [to]);
      const etaMinutes = Math.round(routeData.totalDuration);
      const distance = (routeData.totalDistance / 1000).toFixed(1);
      
      setETA({ 
        time: etaMinutes, 
        distance: distance,
        formatted: etaMinutes > 60 ? 
          `${Math.floor(etaMinutes / 60)}h ${etaMinutes % 60}m` : 
          `${etaMinutes}m`
      });
    } catch (error) {
      console.error('ETA calculation failed:', error);
      toast.error('Failed to calculate ETA');
    } finally {
      setIsCalculating(false);
    }
  };

  const openNavigation = async () => {
    if (!from || !to) {
      toast.error('Start and destination locations required');
      return;
    }

    try {
      let fromCoords, toCoords;

      // Handle coordinates or addresses
      if (typeof from === 'string') {
        fromCoords = await mapsService.geocodeAddress(from);
      } else {
        fromCoords = from;
      }

      if (typeof to === 'string') {
        toCoords = await mapsService.geocodeAddress(to);
      } else {
        toCoords = to;
      }

      // Create navigation URLs for different apps
      const googleMapsUrl = `https://www.google.com/maps/dir/${fromCoords.lat},${fromCoords.lng}/${toCoords.lat},${toCoords.lng}`;
      const appleMapsUrl = `https://maps.apple.com/?daddr=${toCoords.lat},${toCoords.lng}&saddr=${fromCoords.lat},${fromCoords.lng}`;
      const wazeUrl = `https://www.waze.com/ul?ll=${toCoords.lat}%2C${toCoords.lng}&navigate=yes`;

      // Detect mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, try to open native apps
        window.location.href = googleMapsUrl;
      } else {
        // On desktop, open in new tab
        window.open(googleMapsUrl, '_blank');
      }

      // Silently open navigation
    } catch (error) {
      console.error('Navigation failed:', error);
      toast.error('Failed to open navigation');
    }
  };

  const buttonSizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2 text-base"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* ETA Display */}
      {showETA && (
        <div className="flex items-center space-x-1">
          {eta ? (
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{eta.formatted}</span>
              <span className="text-gray-500">({eta.distance}km)</span>
            </span>
          ) : (
            <button
              onClick={calculateETA}
              disabled={isCalculating}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center space-x-1"
            >
              <Clock className="h-3 w-3" />
              <span>{isCalculating ? 'Calculating...' : 'Get ETA'}</span>
            </button>
          )}
        </div>
      )}

      {/* Navigation Button */}
      <button
        onClick={openNavigation}
        className={`${buttonSizes[size]} bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50`}
        disabled={!from || !to}
        title="Open in navigation app"
      >
        <Navigation className={iconSizes[size]} />
        <span>Navigate</span>
      </button>
    </div>
  );
};

// Multi-stop navigation component
export const MultiStopNavigation = ({ 
  origin, 
  destinations = [], 
  className = "",
  showOptimization = true 
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(null);

  const optimizeRoute = async () => {
    if (!origin || destinations.length === 0) {
      toast.error('Origin and destinations required');
      return;
    }

    setIsOptimizing(true);
    try {
      // Simple nearest neighbor optimization
      const unvisited = [...destinations];
      const optimized = [];
      let current = origin;

      while (unvisited.length > 0) {
        let nearest = null;
        let nearestDistance = Infinity;
        let nearestIndex = -1;

        for (let i = 0; i < unvisited.length; i++) {
          const dest = unvisited[i];
          try {
            const destCoords = typeof dest === 'string' ? 
              await mapsService.geocodeAddress(dest) : dest;
            const distance = mapsService.calculateDistance(current, destCoords);
            
            if (distance < nearestDistance) {
              nearest = dest;
              nearestDistance = distance;
              nearestIndex = i;
            }
          } catch (error) {
            console.warn(`Failed to process destination:`, dest);
          }
        }

        if (nearest) {
          optimized.push(nearest);
          unvisited.splice(nearestIndex, 1);
          current = typeof nearest === 'string' ? 
            await mapsService.geocodeAddress(nearest) : nearest;
        } else {
          break;
        }
      }

      setOptimizedRoute(optimized);
      // Only show notification for multi-stop routes
      if (optimized.length > 1) {
        toast.success(`Route optimized with ${optimized.length} stops`);
      }
    } catch (error) {
      console.error('Route optimization failed:', error);
      toast.error('Failed to optimize route');
    } finally {
      setIsOptimizing(false);
    }
  };

  const openMultiStopNavigation = async () => {
    if (!origin || destinations.length === 0) {
      toast.error('Origin and destinations required');
      return;
    }

    try {
      const routeToUse = optimizedRoute || destinations;
      
      // Convert all locations to coordinates
      const originCoords = typeof origin === 'string' ? 
        await mapsService.geocodeAddress(origin) : origin;
      
      const waypoints = await Promise.all(
        routeToUse.map(async (dest) => {
          return typeof dest === 'string' ? 
            await mapsService.geocodeAddress(dest) : dest;
        })
      );

      // Create Google Maps URL with waypoints
      const waypointStr = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
      const navigationUrl = `https://www.google.com/maps/dir/${originCoords.lat},${originCoords.lng}/${waypointStr}`;
      
      window.open(navigationUrl, '_blank');
      // Silently open multi-stop navigation
    } catch (error) {
      console.error('Multi-stop navigation failed:', error);
      toast.error('Failed to open navigation');
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showOptimization && destinations.length > 1 && (
        <button
          onClick={optimizeRoute}
          disabled={isOptimizing}
          className="px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2 disabled:opacity-50"
        >
          <Route className="h-4 w-4" />
          <span>{isOptimizing ? 'Optimizing...' : 'Optimize Route'}</span>
        </button>
      )}

      <button
        onClick={openMultiStopNavigation}
        disabled={destinations.length === 0}
        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
      >
        <Navigation className="h-4 w-4" />
        <span>Navigate All ({destinations.length} stops)</span>
        <ExternalLink className="h-3 w-3" />
      </button>

      {optimizedRoute && (
        <span className="text-xs text-green-600 flex items-center space-x-1">
          <Route className="h-3 w-3" />
          <span>Route optimized</span>
        </span>
      )}
    </div>
  );
};

export default NavigationHelper;

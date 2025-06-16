import L from "leaflet";

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

class MapsService {
  constructor() {
    this.isLoaded = true; // Leaflet doesn't need to be loaded like Google Maps
    this.maps = L; // Direct reference to Leaflet
    this.geocodingCache = new Map();
  }

  // Initialize Leaflet (no-op since it's already available)
  async initialize() {
    return this.maps;
  }

  // Create a map instance
  async createMap(container, options = {}) {
    console.log("🗺️ MapsService.createMap called");
    console.log("📋 Container:", container);
    console.log("⚙️ Options:", options);

    try {
      // Check if Leaflet is available
      if (typeof L === "undefined") {
        console.error("❌ Leaflet (L) is not defined");
        throw new Error("Leaflet library is not loaded");
      }

      console.log("✅ Leaflet is available");

      // Create the map
      console.log("🔧 Creating Leaflet map instance");
      const map = L.map(container, {
        center: [
          options.center?.lat || 40.7128,
          options.center?.lng || -74.006,
        ],
        zoom: options.zoom || 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      console.log("✅ Map instance created:", !!map);

      // Add tile layer
      console.log("🎨 Adding tile layer");
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      console.log("✅ Tile layer added successfully");

      // Store reference
      this.map = map;
      console.log("💾 Map reference stored");

      return map;
    } catch (error) {
      console.error("💥 Error in createMap:", error);
      console.error("📄 Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  async geocodeAddress(address) {
    // Validate input
    if (address === undefined || address === null) {
      const error = `Address is ${address}`;
      console.error("❌ Invalid address:", error);
      throw new Error(error);
    }

    if (typeof address !== 'string') {
      const error = `Invalid address type. Expected string, got ${typeof address}: ${address}`;
      console.error("❌ Invalid address type:", error);
      throw new Error(error);
    }

    const trimmedAddress = address.trim();
    
    if (trimmedAddress === '') {
      const error = "Address cannot be empty";
      console.error("❌ Empty address:", error);
      throw new Error(error);
    }
    
    // Check cache first
    if (this.geocodingCache.has(trimmedAddress)) {
      return this.geocodingCache.get(trimmedAddress);
    }

    try {
      // Using Nominatim API for geocoding (free alternative to Google Maps)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedAddress)}&limit=1&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DeliveryFlow/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error(`No results found for address: ${trimmedAddress}`);
      }

      const firstResult = data[0];
      
      if (!firstResult.lat || !firstResult.lon) {
        throw new Error("Invalid coordinates in geocoding result");
      }

      const result = {
        lat: parseFloat(firstResult.lat),
        lng: parseFloat(firstResult.lon),
      };

      // Validate parsed coordinates
      if (isNaN(result.lat) || isNaN(result.lng)) {
        throw new Error("Invalid coordinates after parsing");
      }
      
      // Cache the result
      this.geocodingCache.set(trimmedAddress, result);
      
      return result;
    } catch (error) {
      console.error("💥 Geocoding error:", error.message);
      // Don't return fallback coordinates for geocoding errors
      // Let the calling code handle the error appropriately
      throw new Error(`Geocoding failed for "${trimmedAddress}": ${error.message}`);
    }
  }

  // Reverse geocode coordinates
  async reverseGeocode(lat, lng) {
    // Validate input coordinates
    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      throw new Error(`Invalid coordinates provided: lat=${lat}, lng=${lng}`);
    }

    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);

    if (isNaN(numLat) || isNaN(numLng)) {
      throw new Error(`Invalid coordinate values: lat=${lat}, lng=${lng}`);
    }

    // Check if coordinates are within valid ranges
    if (numLat < -90 || numLat > 90) {
      throw new Error(`Invalid latitude: ${numLat}. Must be between -90 and 90`);
    }

    if (numLng < -180 || numLng > 180) {
      throw new Error(`Invalid longitude: ${numLng}. Must be between -180 and 180`);
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLng}&addressdetails=1`,
        {
          headers: {
            "User-Agent": "DeliveryFlow/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding service unavailable: ${response.status}`);
      }

      const data = await response.json();

      if (data && data.display_name) {
        const result = {
          address: data.display_name,
          placeId: data.place_id,
          components: data.address,
        };
        return result;
      } else {
        throw new Error("Location not found in reverse geocoding response");
      }
    } catch (error) {
      console.error("💥 Reverse geocoding failed:", error.message);
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  // Calculate route using OpenRouteService (or fallback to simple directions)
  async calculateDirections(origin, destination, travelMode = "DRIVING") {
    try {
      // For demo purposes, we'll create a simple route
      // In production, you might want to integrate with OpenRouteService or similar
      const originCoords =
        typeof origin === "string" ? await this.geocodeAddress(origin) : origin;
      const destCoords =
        typeof destination === "string"
          ? await this.geocodeAddress(destination)
          : destination;

      // Calculate straight-line distance
      const distance = this.calculateDistance(originCoords, destCoords);

      return {
        routes: [
          {
            legs: [
              {
                distance: {
                  value: distance.meters,
                  text: `${distance.kilometers.toFixed(1)} km`,
                },
                duration: {
                  value: Math.round(distance.meters / 12),
                  text: `${Math.round(distance.meters / 200)} min`,
                }, // Rough estimate
                start_location: originCoords,
                end_location: destCoords,
              },
            ],
            overview_path: [originCoords, destCoords], // Simple line
          },
        ],
        status: "OK",
      };
    } catch (error) {
      console.error("Directions calculation failed:", error);
      throw new Error(`Directions request failed: ${error.message}`);
    }
  }

  // Calculate route between multiple points
  async calculateRoute(origin, destinations) {
    try {
      // Validate inputs
      if (!origin) {
        throw new Error("Origin is required for route calculation");
      }

      if (!Array.isArray(destinations)) {
        throw new Error("Destinations must be an array");
      }

      if (destinations.length === 0) {
        throw new Error("At least one destination is required");
      }

      // Filter and validate destinations
      const validDestinations = destinations.filter(dest => {
        if (!dest) {
          return false;
        }
        if (typeof dest === 'string' && dest.trim() === '') {
          return false;
        }
        return true;
      });

      if (validDestinations.length === 0) {
        throw new Error("No valid destinations provided after filtering");
      }

      // Geocode origin with error handling
      let originCoords;
      try {
        originCoords = typeof origin === "string" ? await this.geocodeAddress(origin) : origin;
      } catch (error) {
        throw new Error(`Failed to geocode origin "${origin}": ${error.message}`);
      }

      // Geocode all destinations with individual error handling
      const destinationCoords = [];
      const failedDestinations = [];

      for (let i = 0; i < validDestinations.length; i++) {
        const dest = validDestinations[i];
        try {
          const coords = typeof dest === "string" ? await this.geocodeAddress(dest) : dest;
          destinationCoords.push(coords);
        } catch (error) {
          failedDestinations.push({ index: i, destination: dest, error: error.message });
        }
      }

      if (destinationCoords.length === 0) {
        throw new Error(`Failed to geocode any destinations. Errors: ${failedDestinations.map(f => f.error).join(', ')}`);
      }

      // Create waypoints
      const waypoints = [originCoords, ...destinationCoords];

      // Calculate total distance and duration (approximate)
      let totalDistance = 0;
      let totalDuration = 0;

      for (let i = 0; i < waypoints.length - 1; i++) {
        try {
          const distanceObj = this.calculateDistance(waypoints[i], waypoints[i + 1]);
          const distanceMeters = distanceObj.meters;
          
          if (isNaN(distanceMeters) || distanceMeters < 0) {
            continue;
          }
          
          totalDistance += distanceMeters;
          // Approximate duration: 40 km/h average speed in city
          totalDuration += (distanceMeters / 1000) * 1.5; // minutes
        } catch (distanceError) {
          console.warn(`Failed to calculate distance for leg ${i + 1}:`, distanceError);
        }
      }

      const result = {
        waypoints,
        totalDistance: Math.round(totalDistance),
        totalDuration: Math.round(totalDuration),
        route: waypoints,
        failedDestinations, // Include information about failed geocoding
      };

      return result;
    } catch (error) {
      console.error("💥 Route calculation failed:", error.message);
      throw error;
    }
  }

  // Display route on map using Leaflet
  async displayRoute(map, routeData) {
    try {
      if (!map || !routeData) return;

      console.log("Displaying route:", routeData);

      // Clear existing route layers
      map.eachLayer(layer => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
          if (layer.options && layer.options.isRouteLayer) {
            map.removeLayer(layer);
          }
        }
      });

      // Add markers for waypoints
      if (routeData.waypoints && routeData.waypoints.length > 0) {
        routeData.waypoints.forEach((waypoint, index) => {
          const isStart = index === 0;
          const isEnd = index === routeData.waypoints.length - 1;
          
          let markerOptions = {
            isRouteLayer: true
          };

          // Different icons for start, end, and waypoints
          if (isStart) {
            markerOptions.title = 'Start';
          } else if (isEnd) {
            markerOptions.title = 'End';
          } else {
            markerOptions.title = `Stop ${index}`;
          }

          const marker = L.marker([waypoint.lat, waypoint.lng], markerOptions)
            .addTo(map);
          
          // Add popup with information
          marker.bindPopup(markerOptions.title);
        });

        // Draw polyline connecting waypoints
        const latlngs = routeData.waypoints.map(wp => [wp.lat, wp.lng]);
        const polyline = L.polyline(latlngs, {
          color: '#3B82F6',
          weight: 4,
          opacity: 0.8,
          isRouteLayer: true
        }).addTo(map);

        // Fit map to show entire route
        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
      }

      return routeData;
    } catch (error) {
      console.error("Failed to display route:", error);
      throw error;
    }
  }

  // Get current location with proper error handling
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let errorMessage = "Failed to get location";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              break;
            default:
              errorMessage = `Geolocation error: ${error.message}`;
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  // Get current location with fallback options
  async getCurrentLocationWithFallback() {
    try {
      const location = await this.getCurrentLocation();
      
      // Validate location data
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new Error("Invalid location data received from geolocation API");
      }
      
      return {
        ...location,
        isApproximate: false,
        isDefault: false
      };
    } catch (error) {
      console.warn("⚠️ Primary geolocation failed:", error.message);

      // Fallback: Try IP-based location (approximate)
      try {        
        // Try multiple IP geolocation services
        const ipServices = [
          { url: "https://ipapi.co/json/", format: "ipapi" },
          { url: "https://ip-api.com/json/", format: "ipapi2" }
        ];

        for (const service of ipServices) {
          try {
            const response = await fetch(service.url, {
              timeout: 5000,
              headers: {
                'User-Agent': 'DeliveryFlow/1.0'
              }
            });
            
            if (!response.ok) {
              continue;
            }
            
            const data = await response.json();

            let lat, lng;

            // Handle different API response formats
            if (service.format === "ipapi") {
              lat = data.latitude;
              lng = data.longitude;
            } else if (service.format === "ipapi2") {
              lat = data.lat;
              lng = data.lon;
            }

            // Validate coordinates
            if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
              const location = {
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                accuracy: 50000, // Very low accuracy for IP-based location
                isApproximate: true,
                isDefault: false
              };
              
              return location;
            }
          } catch (serviceError) {
            continue; // Try next service
          }
        }
      } catch (ipError) {
        console.warn("⚠️ IP-based location fallback failed:", ipError.message);
      }

      // Final fallback: Default location (you can customize this based on your app's target region)
      const defaultLocation = {
        lat: 37.7749, // San Francisco coordinates as default
        lng: -122.4194,
        accuracy: null,
        isDefault: true,
        isApproximate: false
      };
      
      return defaultLocation;
    }
  }

  // Check geolocation permission status
  async checkLocationPermission() {
    if (!navigator.geolocation) {
      return { supported: false, permission: "unsupported" };
    }

    // Check if Permissions API is available
    if ("permissions" in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        return {
          supported: true,
          permission: permission.state, // 'granted', 'denied', or 'prompt'
        };
      } catch (error) {
        console.warn("Permissions API not available:", error);
      }
    }

    // Fallback: return basic support info
    return { supported: true, permission: "unknown" };
  }

  // Create a marker
  createMarker(map, position, options = {}) {
    const defaultOptions = {
      draggable: false,
      ...options,
    };

    const marker = L.marker([position.lat, position.lng], defaultOptions);
    if (map) {
      marker.addTo(map);
    }

    return marker;
  }

  // Create a popup (equivalent to info window)
  createInfoWindow(content, options = {}) {
    return L.popup({
      ...options,
    }).setContent(content);
  }

  // Setup autocomplete for address input (using geocoding)
  async setupAddressAutocomplete(inputElement, options = {}) {
    // Create a simple autocomplete using Nominatim search
    let searchTimeout;
    const suggestions = [];

    const handleInput = async (event) => {
      const query = event.target.value;

      if (query.length < 3) return;

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}&limit=5&addressdetails=1`,
            {
              headers: {
                "User-Agent": "DeliveryFlow/1.0",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            // You can emit custom events or use callbacks here
            inputElement.dispatchEvent(
              new CustomEvent("suggestions", {
                detail: data.map((item) => ({
                  display_name: item.display_name,
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                  place_id: item.place_id,
                })),
              })
            );
          }
        } catch (error) {
          console.warn("Autocomplete search failed:", error);
        }
      }, 300);
    };

    inputElement.addEventListener("input", handleInput);

    return {
      getPlace: () => ({
        // This would be called when a suggestion is selected
        geometry: {
          location: {
            lat: () => suggestions[0]?.lat || 0,
            lng: () => suggestions[0]?.lng || 0,
          },
        },
        formatted_address: suggestions[0]?.display_name || "",
        place_id: suggestions[0]?.place_id || "",
      }),
      addListener: (event, callback) => {
        if (event === "place_changed") {
          inputElement.addEventListener("suggestionSelected", callback);
        }
      },
    };
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(point1, point2) {
    // Validate input points
    if (!point1 || !point2) {
      console.error("Invalid points for distance calculation:", point1, point2);
      return { meters: 0, kilometers: 0, miles: 0 };
    }

    if (typeof point1.lat !== 'number' || typeof point1.lng !== 'number' ||
        typeof point2.lat !== 'number' || typeof point2.lng !== 'number') {
      console.error("Invalid coordinates for distance calculation:", point1, point2);
      return { meters: 0, kilometers: 0, miles: 0 };
    }

    if (isNaN(point1.lat) || isNaN(point1.lng) || isNaN(point2.lat) || isNaN(point2.lng)) {
      console.error("NaN coordinates for distance calculation:", point1, point2);
      return { meters: 0, kilometers: 0, miles: 0 };
    }

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    return {
      meters: distance,
      kilometers: distance / 1000,
      miles: distance * 0.000621371,
    };
  }

  // Check if API is available
  isAvailable() {
    return true; // Leaflet is always available once loaded
  }

  // Get navigation instructions
  async getNavigationInstructions(origin, destination) {
    try {
      const originCoords =
        typeof origin === "string" ? await this.geocodeAddress(origin) : origin;
      const destCoords =
        typeof destination === "string" ? await this.geocodeAddress(destination) : destination;

      // Generate basic turn-by-turn instructions
      const distance = this.calculateDistance(originCoords, destCoords);
      const duration = Math.round((distance / 1000) * 1.5); // Approximate duration in minutes

      return {
        instructions: [
          { step: 1, instruction: "Head towards destination", distance: distance },
          { step: 2, instruction: "Continue straight", distance: distance * 0.7 },
          { step: 3, instruction: "Arrive at destination", distance: 0 },
        ],
        totalDistance: distance,
        totalDuration: duration,
      };
    } catch (error) {
      console.error("Failed to get navigation instructions:", error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const mapsService = new MapsService();
export default mapsService;
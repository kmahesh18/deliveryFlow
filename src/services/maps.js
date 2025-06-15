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
    console.log("🔍 MapsService.geocodeAddress called with:", address);

    try {
      // Using Nominatim API for geocoding (free alternative to Google Maps)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`
      );

      console.log("📡 Geocoding response status:", response.status);

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("📍 Geocoding response data:", data);

      if (!data || data.length === 0) {
        throw new Error("No results found for address");
      }

      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };

      console.log("✅ Geocoding result:", result);
      return result;
    } catch (error) {
      console.error("💥 Geocoding error:", error);
      console.error("📄 Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Return default coordinates as fallback
      console.log("🔄 Using fallback coordinates");
      return { lat: 40.7128, lng: -74.006 };
    }
  }

  // Reverse geocode coordinates
  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            "User-Agent": "DeliveryFlow/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Reverse geocoding service unavailable");
      }

      const data = await response.json();

      if (data && data.display_name) {
        return {
          address: data.display_name,
          placeId: data.place_id,
          components: data.address,
        };
      } else {
        throw new Error("Location not found");
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
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

  // Display directions on a map
  async displayDirections(map, origin, destination, travelMode = "DRIVING") {
    try {
      const directionsResult = await this.calculateDirections(
        origin,
        destination,
        travelMode
      );

      if (directionsResult.routes && directionsResult.routes[0]) {
        const route = directionsResult.routes[0];
        const points = route.overview_path;

        // Clear existing route
        map.eachLayer((layer) => {
          if (
            layer instanceof L.Polyline &&
            layer.options.className === "route-line"
          ) {
            map.removeLayer(layer);
          }
        });

        // Add route line
        const polyline = L.polyline(
          points.map((p) => [p.lat, p.lng]),
          {
            color: "#2563eb",
            weight: 4,
            opacity: 0.8,
            className: "route-line",
          }
        ).addTo(map);

        // Fit map to show entire route
        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        return directionsResult;
      }
    } catch (error) {
      console.error("Failed to display directions:", error);
      throw error;
    }
  }

  // Get current location
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
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
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

  // Calculate distance between two points
  calculateDistance(point1, point2) {
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
}

// Create and export a singleton instance
export const mapsService = new MapsService();
export default mapsService;
import L from 'leaflet';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
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
  async createMap(element, options = {}) {
    const defaultOptions = {
      zoom: 13,
      center: [40.7128, -74.006], // Default to NYC [lat, lng]
      zoomControl: true,
      scrollWheelZoom: true,
      ...options,
    };

    const map = L.map(element, {
      center: defaultOptions.center,
      zoom: defaultOptions.zoom,
      zoomControl: defaultOptions.zoomControl,
      scrollWheelZoom: defaultOptions.scrollWheelZoom,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    return map;
  }

  // Geocode an address using Nominatim (OpenStreetMap's geocoding service)
  async geocodeAddress(address) {
    if (!address || address.trim().length < 3) {
      throw new Error('Address too short');
    }

    // Check cache first
    const cacheKey = address.toLowerCase().trim();
    if (this.geocodingCache.has(cacheKey)) {
      return this.geocodingCache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'DeliveryFlow/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          formattedAddress: data[0].display_name,
          placeId: data[0].place_id,
        };

        // Cache the result
        this.geocodingCache.set(cacheKey, result);
        return result;
      } else {
        throw new Error('Address not found');
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  // Reverse geocode coordinates
  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'DeliveryFlow/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding service unavailable');
      }

      const data = await response.json();

      if (data && data.display_name) {
        return {
          address: data.display_name,
          placeId: data.place_id,
          components: data.address,
        };
      } else {
        throw new Error('Location not found');
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  // Calculate route using OpenRouteService (or fallback to simple directions)
  async calculateDirections(origin, destination, travelMode = "DRIVING") {
    try {
      // For demo purposes, we'll create a simple route
      // In production, you might want to integrate with OpenRouteService or similar
      const originCoords = typeof origin === 'string' ? await this.geocodeAddress(origin) : origin;
      const destCoords = typeof destination === 'string' ? await this.geocodeAddress(destination) : destination;

      // Calculate straight-line distance
      const distance = this.calculateDistance(originCoords, destCoords);

      return {
        routes: [{
          legs: [{
            distance: { value: distance.meters, text: `${distance.kilometers.toFixed(1)} km` },
            duration: { value: Math.round(distance.meters / 12), text: `${Math.round(distance.meters / 200)} min` }, // Rough estimate
            start_location: originCoords,
            end_location: destCoords,
          }],
          overview_path: [originCoords, destCoords], // Simple line
        }],
        status: "OK"
      };
    } catch (error) {
      console.error('Directions calculation failed:', error);
      throw new Error(`Directions request failed: ${error.message}`);
    }
  }

  // Display directions on a map
  async displayDirections(map, origin, destination, travelMode = "DRIVING") {
    try {
      const directionsResult = await this.calculateDirections(origin, destination, travelMode);
      
      if (directionsResult.routes && directionsResult.routes[0]) {
        const route = directionsResult.routes[0];
        const points = route.overview_path;

        // Clear existing route
        map.eachLayer((layer) => {
          if (layer instanceof L.Polyline && layer.options.className === 'route-line') {
            map.removeLayer(layer);
          }
        });

        // Add route line
        const polyline = L.polyline(points.map(p => [p.lat, p.lng]), {
          color: '#2563eb',
          weight: 4,
          opacity: 0.8,
          className: 'route-line'
        }).addTo(map);

        // Fit map to show entire route
        map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        return directionsResult;
      }
    } catch (error) {
      console.error('Failed to display directions:', error);
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
        },
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
      ...options
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
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'DeliveryFlow/1.0'
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            // You can emit custom events or use callbacks here
            inputElement.dispatchEvent(new CustomEvent('suggestions', { 
              detail: data.map(item => ({
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                place_id: item.place_id
              }))
            }));
          }
        } catch (error) {
          console.warn('Autocomplete search failed:', error);
        }
      }, 300);
    };

    inputElement.addEventListener('input', handleInput);

    return {
      getPlace: () => ({
        // This would be called when a suggestion is selected
        geometry: {
          location: {
            lat: () => suggestions[0]?.lat || 0,
            lng: () => suggestions[0]?.lng || 0,
          }
        },
        formatted_address: suggestions[0]?.display_name || '',
        place_id: suggestions[0]?.place_id || ''
      }),
      addListener: (event, callback) => {
        if (event === 'place_changed') {
          inputElement.addEventListener('suggestionSelected', callback);
        }
      }
    };
  }

  // Calculate distance between two points
  calculateDistance(point1, point2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat - point1.lat) * Math.PI/180;
    const Δλ = (point2.lng - point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

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

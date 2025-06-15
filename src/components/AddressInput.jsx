import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Navigation, Search } from "lucide-react";
import { mapsService } from "../services/maps";

const AddressInput = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  onCoordinatesChange,
  showCurrentLocation = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [coordinates, setCoordinates] = useState(null);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Handle input changes with debounced geocoding
  const handleInputChange = async (e) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce geocoding search
    debounceRef.current = setTimeout(async () => {
      await searchAddresses(inputValue);
    }, 500);
  };

  const searchAddresses = async (query) => {
    try {
      setIsLoading(true);
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
        const formattedSuggestions = data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          place_id: item.place_id
        }));
        
        setSuggestions(formattedSuggestions);
        setShowSuggestions(formattedSuggestions.length > 0);
      }
    } catch (error) {
      console.warn('Address search failed:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setCoordinates({
      lat: suggestion.lat,
      lng: suggestion.lng,
    });

    onChange(suggestion.display_name);
    onCoordinatesChange?.({
      lat: suggestion.lat,
      lng: suggestion.lng,
    });

    setSuggestions([]);
    setShowSuggestions(false);
    setError("");
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      setError("");

      const location = await mapsService.getCurrentLocation();
      const address = await mapsService.reverseGeocode(location.lat, location.lng);

      setCoordinates(location);
      onChange(address.address);
      onCoordinatesChange?.(location);
    } catch (error) {
      console.error("Location error:", error);
      setError("Could not get your current location");
    } finally {
      setIsLoading(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 relative">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            required={required}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
          />

          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {isLoading && (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            )}

            {showCurrentLocation && !isLoading && (
              <button
                type="button"
                onClick={getCurrentLocation}
                className="p-1 text-gray-400 hover:text-primary transition-colors"
                title="Use current location"
              >
                <Navigation className="h-4 w-4" />
              </button>
            )}

            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.place_id || index}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-900 line-clamp-2">
                    {suggestion.display_name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <svg
              className="h-4 w-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {coordinates && (
          <p className="mt-1 text-xs text-gray-500">
            📍 Location confirmed: {coordinates.lat.toFixed(6)},{" "}
            {coordinates.lng.toFixed(6)}
          </p>
        )}
      </div>
    </div>
  );
};

export default AddressInput;

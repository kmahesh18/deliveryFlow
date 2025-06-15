const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem("token");
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`,
        );
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication methods
  async register(userData) {
    const response = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async login(credentials) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async verifyToken(token) {
    return this.request("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  logout() {
    this.setToken(null);
  }

  // Order methods
  async createOrder(orderData) {
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  async getOrders() {
    return this.request("/orders");
  }

  async getOrder(orderId) {
    return this.request(`/orders/${orderId}`);
  }

  async assignOrder(orderId, deliveryPersonId) {
    // Add validation
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      throw new Error('Invalid order ID provided');
    }
    
    if (!deliveryPersonId || deliveryPersonId === 'undefined' || deliveryPersonId === 'null') {
      throw new Error('Invalid delivery person ID provided');
    }

    return this.request(`/orders/${orderId}/assign`, {
      method: "PUT",
      body: JSON.stringify({ deliveryPersonId }),
    });
  }

  async updateOrderStatus(orderId, status) {
    return this.request(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async getOrderStats() {
    return this.request("/orders/stats/overview");
  }

  // User methods
  async getProfile() {
    return this.request("/users/profile");
  }

  async updateProfile(profileData) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async getDeliveryPersonnel() {
    return this.request("/users/delivery-personnel");
  }

  async getUserStats() {
    return this.request("/users/stats");
  }

  // Health check
  async healthCheck() {
    return this.request("/health");
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;

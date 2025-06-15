import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Package, Menu, X, User, LogOut, Wifi, WifiOff } from "lucide-react";
import NotificationBell from "./NotificationBell";

const Layout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, isAuthenticated, isConnected } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return "/";
    switch (user.role) {
      case "customer":
        return "/customer-dashboard";
      case "delivery":
        return "/delivery-dashboard";
      case "admin":
        return "/admin-dashboard";
      default:
        return "/";
    }
  };

  const ConnectionStatus = () => {
    if (!isAuthenticated) return null;

    return (
      <div className="flex items-center space-x-1 text-xs">
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3 text-green-500" />
            <span className="text-green-600 hidden sm:inline">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-red-500" />
            <span className="text-red-600 hidden sm:inline">Offline</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-3 text-primary font-bold text-xl hover:text-primary/80 transition-colors"
            >
              <div className="bg-primary p-2 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                DeliveryFlow
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    className="text-gray-700 hover:text-primary font-medium transition-colors duration-200"
                  >
                    Dashboard
                  </Link>

                  <div className="flex items-center space-x-4">
                    <ConnectionStatus />
                    <NotificationBell />

                    <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gray-50">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {user.role}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary font-medium transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                  <Link to="/register">
                    <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md">
                      Get Started
                    </button>
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-100 transition-all duration-200"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg animate-slide-in">
            <div className="px-4 py-4 space-y-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {user.role}
                      </p>
                    </div>
                    <div className="ml-auto">
                      <ConnectionStatus />
                    </div>
                  </div>

                  <Link
                    to={getDashboardLink()}
                    className="block py-2 text-gray-700 hover:text-primary font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 py-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block py-2 text-gray-700 hover:text-primary font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                    <button className="w-full bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200">
                      Get Started
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-primary font-bold text-lg">
                <div className="bg-primary p-2 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <span>DeliveryFlow</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Modern delivery management platform designed for efficiency and
                reliability. Connect customers with delivery professionals
                seamlessly.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                For Customers
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Place Orders
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Track Deliveries
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Order History
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Support Center
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">For Delivery</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    View Tasks
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Update Status
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Track Earnings
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Performance Analytics
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-primary transition-colors duration-200"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-500">
                &copy; 2024 DeliveryFlow. All rights reserved.
              </p>
              <div className="flex items-center space-x-1 text-sm text-gray-500 mt-4 md:mt-0">
                <span>Made with</span>
                <span className="text-red-500">❤️</span>
                <span>for modern delivery</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

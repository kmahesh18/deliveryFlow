import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Package, Clock, MapPin, Shield, ArrowDown } from 'lucide-react';

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-mesh py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-700/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Smart Delivery
              <span className="block bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                Management
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Streamline your delivery operations with our modern, efficient platform.
              Perfect for customers and delivery personnel alike.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <button className="w-full sm:w-auto glass-button text-white px-8 py-4 rounded-xl text-sm font-medium hover:scale-105 transition-all duration-300">
                  Get Started Today
                </button>
              </Link>
              <Link to="/login">
                <button className="w-full sm:w-auto glass border-white/30 text-white px-8 py-4 rounded-xl text-sm font-medium hover:scale-105 transition-all duration-300">
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose DeliveryFlow?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for the modern delivery ecosystem with features that matter most.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="feature-card animate-slide-up" style={{animationDelay: '0.1s'}}>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow floating">
                <Package className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Easy Order Management</h3>
              <p className="text-gray-600">
                Place and track orders with just a few clicks. Simple, intuitive interface.
              </p>
            </div>

            <div className="feature-card animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow floating-delayed">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Real-time Updates</h3>
              <p className="text-gray-600">
                Stay informed with live status updates throughout the delivery process.
              </p>
            </div>

            <div className="feature-card animate-slide-up" style={{animationDelay: '0.3s'}}>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow floating">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Smart Routing</h3>
              <p className="text-gray-600">
                Optimized delivery routes for faster, more efficient service.
              </p>
            </div>

            <div className="feature-card animate-slide-up" style={{animationDelay: '0.4s'}}>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-glow floating-delayed">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Secure & Reliable</h3>
              <p className="text-gray-600">
                Your data and deliveries are protected with enterprise-grade security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple steps to get your deliveries moving efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-6 glass-card p-8 animate-bounce-in" style={{animationDelay: '0.1s'}}>
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-glow">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Create Your Order</h3>
              <p className="text-gray-600">
                Enter pickup and delivery addresses, item details, and submit your order.
              </p>
            </div>

            <div className="text-center space-y-6 glass-card p-8 animate-bounce-in" style={{animationDelay: '0.2s'}}>
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-glow">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Get Assigned</h3>
              <p className="text-gray-600">
                Our system matches your order with the best available delivery personnel.
              </p>
            </div>

            <div className="text-center space-y-6 glass-card p-8 animate-bounce-in" style={{animationDelay: '0.3s'}}>
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-glow">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Track & Receive</h3>
              <p className="text-gray-600">
                Monitor your delivery in real-time and receive your items safely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 animate-fade-in">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto animate-fade-in">
            Join thousands of satisfied customers and delivery professionals who trust DeliveryFlow.
          </p>
          <Link to="/register">
            <button className="glass-button text-white font-medium px-8 py-4 rounded-xl text-sm hover:scale-105 transition-all duration-300 animate-bounce-in">
              Start Your Journey
            </button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
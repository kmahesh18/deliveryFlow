import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Package, Clock, MapPin, Shield, ArrowDown } from 'lucide-react';

const Index = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Smart Delivery
              <span className="text-primary block">Management</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Streamline your delivery operations with our modern, efficient platform.
              Perfect for customers and delivery personnel alike.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md text-sm font-medium">
                  Get Started Today
                </button>
              </Link>
              <Link to="/login">
                <button className="w-full sm:w-auto border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-8 py-3 rounded-md text-sm font-medium">
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose DeliveryFlow?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for the modern delivery ecosystem with features that matter most.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Easy Order Management</h3>
                <p className="text-gray-600">
                  Place and track orders with just a few clicks. Simple, intuitive interface.
                </p>
              </div>
            </div>

            <div className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Real-time Updates</h3>
                <p className="text-gray-600">
                  Stay informed with live status updates throughout the delivery process.
                </p>
              </div>
            </div>

            <div className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Smart Routing</h3>
                <p className="text-gray-600">
                  Optimized delivery routes for faster, more efficient service.
                </p>
              </div>
            </div>

            <div className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Secure & Reliable</h3>
                <p className="text-gray-600">
                  Your data and deliveries are protected with enterprise-grade security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple steps to get your deliveries moving efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Create Your Order</h3>
              <p className="text-gray-600">
                Enter pickup and delivery addresses, item details, and submit your order.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Get Assigned</h3>
              <p className="text-gray-600">
                Our system matches your order with the best available delivery personnel.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
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
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers and delivery professionals who trust DeliveryFlow.
          </p>
          <Link to="/register">
            <button className="bg-white hover:bg-gray-100 text-primary font-medium px-8 py-3 rounded-md text-sm">
              Start Your Journey
            </button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
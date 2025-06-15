import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

const TestMongoDB = () => {
  const [status, setStatus] = useState("checking...");
  const [dbHealth, setDbHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/health");
      const data = await response.json();
      setStatus("connected");
      setDbHealth(data);
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  };

  const testApiService = async () => {
    try {
      const response = await apiService.healthCheck();
      console.log("API Service Test:", response);
    } catch (err) {
      console.error("API Service Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          MongoDB Connection Test
        </h1>

        <div className="bg-white rounded-xl shadow-soft p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="font-medium">Backend Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  status === "connected"
                    ? "bg-green-100 text-green-800"
                    : status === "error"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {status}
              </span>
            </div>

            {dbHealth && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Health Check Response:</h3>
                <pre className="text-sm text-gray-700 overflow-auto">
                  {JSON.stringify(dbHealth, null, 2)}
                </pre>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex space-x-4">
            <button
              onClick={checkConnection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Status
            </button>
            <button
              onClick={testApiService}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Test API Service
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-soft p-6">
          <h2 className="text-xl font-semibold mb-4">Integration Checklist</h2>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>MongoDB connection configured</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>User and Order models created</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Authentication routes updated</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Order management with MongoDB</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>WebSocket integration</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>TailwindCSS styling fixes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMongoDB;

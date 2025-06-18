import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { useEffect, useRef } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./pages/CustomerDashboard";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import TestMongoDB from "./pages/TestMongoDB";
import StyleTest from "./components/StyleTest";
import "./index.css";

const App = () => {
  const healthCheckInterval = useRef(null);
  const loadingToastId = useRef(null);
  const isServerActive = useRef(false);

  const checkServerHealth = async () => {
    try {
      const response = await fetch("https://deliveryflow.onrender.com/api/health", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (response.ok) {
        // Server is now active
        if (!isServerActive.current) {
          isServerActive.current = true;
          
          if (loadingToastId.current) {
            toast.dismiss(loadingToastId.current);
          }
          
          toast.success("🟢 Server is now live!", {
            duration: 4000,
            position: "bottom-right",
          });
        }
      } else {
        throw new Error("Server not responding properly");
      }
    } catch (error) {
      // Server is inactive or loading
      if (isServerActive.current || loadingToastId.current === null) {
        isServerActive.current = false;
        
        if (loadingToastId.current) {
          toast.dismiss(loadingToastId.current);
        }
        
        loadingToastId.current = toast.loading("🔄 Server is loading... (Free tier takes ~50s to wake up)", {
          duration: Infinity,
          position: "bottom-right",
        });
      }
    }
  };

  const startHealthCheck = () => {
    // Initial check
    checkServerHealth();
    
    // Set up interval to check every 10 seconds
    healthCheckInterval.current = setInterval(checkServerHealth, 10000);
  };

  const stopHealthCheck = () => {
    if (healthCheckInterval.current) {
      clearInterval(healthCheckInterval.current);
      healthCheckInterval.current = null;
    }
    
    if (loadingToastId.current) {
      toast.dismiss(loadingToastId.current);
      loadingToastId.current = null;
    }
  };

  useEffect(() => {
    startHealthCheck();
    
    return () => {
      stopHealthCheck();
    };
  }, []);

  return (
    <AuthProvider>
      <div className="font-sans">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/customer-dashboard" element={<CustomerDashboard />} />
            <Route path="/delivery-dashboard" element={<DeliveryDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/test-mongodb" element={<TestMongoDB />} />
            <Route path="/test-styles" element={<StyleTest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
};

export default App;

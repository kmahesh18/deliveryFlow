import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "react-hot-toast";
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

const App = () => (
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

export default App;

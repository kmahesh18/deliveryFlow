import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import Layout from "../components/Layout";
import { Package } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Package className="h-24 w-24 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-gray-900">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700">Page Not Found</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          <Link to="/">
            <button className="py-2 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
              Return to Home
            </button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
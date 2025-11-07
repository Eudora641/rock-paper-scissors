import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/**
 * 404 Not Found page component
 * Displays when users navigate to non-existent routes
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Page Not Found
          </h2>
        </div>

        <p className="text-muted-foreground max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
          >
            Return Home
          </a>
        </div>

        <div className="text-sm text-muted-foreground">
          Requested path: <code className="bg-muted px-2 py-1 rounded">{location.pathname}</code>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-[calc(100vh-150px)] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 shadow-md">
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col items-center text-center mb-6">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">404 - Page Not Found</h1>
            <p className="mt-2 text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Current path: <code className="bg-gray-100 px-1 py-0.5 rounded">{location}</code>
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center pb-6">
          <Button variant="outline" onClick={() => window.history.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <Link href="/">
            <Button className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Return Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

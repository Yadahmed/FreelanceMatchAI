import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function InfoPanel() {
  return (
    <>
      <h2 className="font-inter font-bold text-2xl md:text-3xl text-gray-900 leading-tight mb-4">
        Find the <span className="text-primary">perfect freelancer</span> for your project in minutes
      </h2>
      <p className="text-gray-600 mb-6">
        Our AI-powered matchmaking system connects you with talented freelancers based on your specific needs. Just describe your project, and we'll handle the rest.
      </p>
      
      <Card className="mb-6">
        <CardContent className="pt-5">
          <h3 className="font-inter font-semibold text-lg mb-3 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-secondary" />
            How It Works
          </h3>
          <ol className="space-y-3">
            <li className="flex">
              <span className="bg-primary/10 text-primary font-semibold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">1</span>
              <p className="text-sm text-gray-700">Describe your project needs in natural language</p>
            </li>
            <li className="flex">
              <span className="bg-primary/10 text-primary font-semibold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">2</span>
              <p className="text-sm text-gray-700">Our AI analyzes your requirements</p>
            </li>
            <li className="flex">
              <span className="bg-primary/10 text-primary font-semibold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">3</span>
              <p className="text-sm text-gray-700">We match you with the best freelancers</p>
            </li>
            <li className="flex">
              <span className="bg-primary/10 text-primary font-semibold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0">4</span>
              <p className="text-sm text-gray-700">Connect and hire with confidence</p>
            </li>
          </ol>
        </CardContent>
      </Card>
      
      <div className="hidden md:block">
        <h3 className="font-inter font-semibold text-lg mb-3">Our Matching Algorithm</h3>
        <Card>
          <CardContent className="pt-5">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Job Performance</span>
                  <span className="text-sm font-medium text-gray-700">50%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary rounded-full h-2" style={{ width: "50%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Skills & Experience</span>
                  <span className="text-sm font-medium text-gray-700">20%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-secondary rounded-full h-2" style={{ width: "20%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Responsiveness</span>
                  <span className="text-sm font-medium text-gray-700">15%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-accent rounded-full h-2" style={{ width: "15%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Fairness Boost</span>
                  <span className="text-sm font-medium text-gray-700">15%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-amber-500 rounded-full h-2" style={{ width: "15%" }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

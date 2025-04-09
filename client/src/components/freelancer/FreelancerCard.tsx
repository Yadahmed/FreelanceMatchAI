import { Rating } from "@/components/ui/rating";
import { FreelancerType } from "@/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface FreelancerCardProps {
  freelancer: FreelancerType;
}

export default function FreelancerCard({ freelancer }: FreelancerCardProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const handleContact = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to contact freelancers",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Contact request sent",
        description: `Your request to contact ${freelancer.profession} has been sent.`,
      });
    }
  };

  return (
    <div className="freelancer-card bg-white rounded-[12px] shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="relative">
        {freelancer.imageUrl && (
          <img 
            src={freelancer.imageUrl} 
            alt={`${freelancer.profession} freelancer`}
            className="w-full h-32 object-cover" 
          />
        )}
        <div className="absolute top-2 right-2 bg-secondary text-white text-xs px-2 py-1 rounded-full font-medium">
          {freelancer.matchPercentage || 95}% Match
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-inter font-semibold text-gray-900">{freelancer.bio.split(' ').slice(0, 2).join(' ')}</h3>
            <p className="text-gray-600 text-sm">{freelancer.profession}</p>
          </div>
          <Rating value={(freelancer.rating || 4.5)} />
        </div>
        
        <div className="mt-3">
          <div className="flex flex-wrap gap-1 mb-2">
            {freelancer.skills.slice(0, 3).map((skill, idx) => (
              <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                {skill}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600">{freelancer.bio}</p>
          <div className="mt-3 flex justify-between items-center">
            <span className="text-primary font-medium">${freelancer.hourlyRate}/hr</span>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-3 py-1"
              onClick={handleContact}
            >
              Contact
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

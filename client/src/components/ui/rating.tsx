import { Star } from "lucide-react";

interface RatingProps {
  value: number | null;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
  showNoRating?: boolean;
}

export function Rating({ 
  value, 
  max = 5, 
  size = "md", 
  showValue = true,
  className = "",
  showNoRating = true
}: RatingProps) {
  // Handle null or undefined ratings
  if (value === null || value === undefined) {
    return showNoRating ? (
      <div className={`flex items-center ${className}`}>
        <span className={`text-muted-foreground italic`}>
          No ratings yet
        </span>
      </div>
    ) : null;
  }

  // Convert from stored integer format (e.g., 45 = 4.5 stars)
  // For backward compatibility with old integer ratings
  const actualValue = value > 5 ? value / 10 : value;
  
  const roundedValue = Math.round(actualValue * 10) / 10;
  const filledStars = Math.floor(roundedValue);
  const hasHalfStar = roundedValue - filledStars >= 0.5;
  
  const starSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };
  
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };
  
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={i}
            className={`
              ${starSizes[size]} 
              ${i < filledStars 
                ? 'text-yellow-400 fill-yellow-400' 
                : i === filledStars && hasHalfStar 
                  ? 'text-yellow-400 fill-yellow-400 half-star' 
                  : 'text-gray-300'
              }
            `}
          />
        ))}
      </div>
      
      {showValue && (
        <span className={`ml-1 font-medium ${textSizes[size]}`}>
          {roundedValue}
        </span>
      )}
    </div>
  );
}

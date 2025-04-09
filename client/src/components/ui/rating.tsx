import { Star } from "lucide-react";

interface RatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function Rating({ 
  value, 
  max = 5, 
  size = "md", 
  showValue = true,
  className = ""
}: RatingProps) {
  const roundedValue = Math.round(value * 10) / 10;
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

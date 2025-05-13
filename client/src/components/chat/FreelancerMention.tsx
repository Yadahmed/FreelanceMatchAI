import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface FreelancerMentionProps {
  content: string;
}

export function FreelancerMention({ content }: FreelancerMentionProps) {
  const [processedContent, setProcessedContent] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    const processContent = async () => {
      if (!content) return;

      try {
        // Get all freelancers for matching
        const freelancers = await storage.getAllFreelancers();
        if (!freelancers || freelancers.length === 0) {
          setProcessedContent([content]);
          return;
        }

        // Sort freelancers by ID (descending) to avoid shorter IDs causing confusion
        const sortedFreelancers = [...freelancers].sort((a, b) => b.id - a.id);
        
        // Also get all users to get names
        const users = await storage.getAllUsers();
        
        // Create map of userId to user to easily lookup names
        const userMap = new Map();
        users.forEach(user => {
          userMap.set(user.id, user);
        });

        const parts: React.ReactNode[] = [];
        let remainingContent = content;
        
        // First check for freelancer IDs in the format "ID: X" or "(ID: X)"
        const idRegex = /\b(ID:?\s*(\d+))\b/g;
        let match;
        let lastIndex = 0;
        
        // Create a map of freelancer names to IDs for name matching
        const nameToIdMap = new Map();
        sortedFreelancers.forEach(freelancer => {
          const user = userMap.get(freelancer.userId);
          if (user) {
            if (user.displayName) nameToIdMap.set(user.displayName.toLowerCase(), freelancer.id);
            if (user.username) nameToIdMap.set(user.username.toLowerCase(), freelancer.id);
          }
        });
        
        // Check for ID patterns first
        while ((match = idRegex.exec(remainingContent)) !== null) {
          const [fullMatch, _, idStr] = match;
          const id = parseInt(idStr, 10);
          
          // Find the freelancer with this ID
          const freelancer = sortedFreelancers.find(f => f.id === id);
          
          if (freelancer) {
            // Find user for this freelancer
            const user = userMap.get(freelancer.userId);
            const displayName = user?.displayName || user?.username || `Freelancer ${id}`;
            
            // Add text before the match
            if (match.index > lastIndex) {
              parts.push(remainingContent.substring(lastIndex, match.index));
            }
            
            // Add the button
            parts.push(
              <Button 
                key={`fr-${id}-${match.index}`}
                variant="outline" 
                size="sm"
                className="mx-1 my-0.5 inline-flex items-center gap-1"
                asChild
              >
                <Link href={`/freelancers/${id}`}>
                  <User className="h-3.5 w-3.5" /> 
                  {displayName}
                </Link>
              </Button>
            );
            
            // Update lastIndex to after this match
            lastIndex = match.index + fullMatch.length;
          }
        }
        
        // After checking for IDs, let's also check for freelancer names in the text
        // To avoid excessive matching, we'll focus on names that are accompanied by specific contextual words
        if (lastIndex < remainingContent.length) {
          const remainingText = remainingContent.substring(lastIndex);
          const nameContextRegex = /\b(freelancer|expert|professional|specialist|candidate|provider|worker)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g;
          
          let nameMatch;
          let nameLastIndex = 0;
          const nameParts: React.ReactNode[] = [];
          
          while ((nameMatch = nameContextRegex.exec(remainingText)) !== null) {
            const [fullMatch, _, potentialName] = nameMatch;
            const nameLower = potentialName.toLowerCase();
            
            // Check if this is a freelancer name we know
            const freelancerId = nameToIdMap.get(nameLower);
            
            if (freelancerId) {
              // Find the freelancer with this ID
              const freelancer = sortedFreelancers.find(f => f.id === freelancerId);
              
              if (freelancer) {
                // Get the user's display name
                const user = userMap.get(freelancer.userId);
                const displayName = user?.displayName || user?.username || potentialName;
                
                // Add text before the match
                if (nameMatch.index > nameLastIndex) {
                  nameParts.push(remainingText.substring(nameLastIndex, nameMatch.index));
                }
                
                // Add the button
                nameParts.push(
                  <Button 
                    key={`name-${freelancerId}-${nameMatch.index}`}
                    variant="outline" 
                    size="sm"
                    className="mx-1 my-0.5 inline-flex items-center gap-1"
                    asChild
                  >
                    <Link href={`/freelancers/${freelancerId}`}>
                      <User className="h-3.5 w-3.5" /> 
                      {displayName}
                    </Link>
                  </Button>
                );
                
                // Update nameLastIndex to after this match
                nameLastIndex = nameMatch.index + fullMatch.length;
              }
            }
          }
          
          // Add any remaining text
          if (nameLastIndex < remainingText.length) {
            nameParts.push(remainingText.substring(nameLastIndex));
          }
          
          // If we found and replaced any names, use the processed parts
          if (nameParts.length > 0 && nameLastIndex > 0) {
            parts.push(...nameParts);
          } else {
            // Otherwise just add the remaining text as-is
            parts.push(remainingText);
          }
        }
        
        setProcessedContent(parts);
      } catch (error) {
        console.error('Error processing freelancer mentions:', error);
        setProcessedContent([content]);
      }
    };
    
    processContent();
  }, [content]);
  
  return (
    <div className="freelancer-mention">
      {processedContent.length > 0 ? processedContent : content}
    </div>
  );
}
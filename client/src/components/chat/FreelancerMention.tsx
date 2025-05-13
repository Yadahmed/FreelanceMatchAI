import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User } from 'lucide-react';
import { storage } from '../../lib/storage';

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
        
        // Add any remaining content
        if (lastIndex < remainingContent.length) {
          parts.push(remainingContent.substring(lastIndex));
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
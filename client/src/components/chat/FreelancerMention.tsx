import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

interface FreelancerMentionProps {
  content: string;
}

interface FreelancerMatch {
  id: number;
  fullMatch: string;
  index: number;
}

export function FreelancerMention({ content }: FreelancerMentionProps) {
  const [processedContent, setProcessedContent] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    const processContent = async () => {
      if (!content) return;

      try {
        // Get all freelancers for matching
        const response = await fetch('/api/freelancers');
        if (!response.ok) {
          throw new Error('Failed to fetch freelancers');
        }
        const freelancers = await response.json();
        
        if (!freelancers || freelancers.length === 0) {
          setProcessedContent([content]);
          return;
        }
        
        // Also get users to find names
        const usersResponse = await fetch('/api/admin/users', {
          headers: { 'admin-session': 'true' }
        });
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users');
        }
        const users = await usersResponse.json();
        
        // Create map of userId to user for quick lookups
        const userMap = new Map();
        users.forEach((user: any) => {
          userMap.set(user.id, user);
        });
        
        // Log the content we're processing for debugging
        console.log('Processing content of length:', content.length);
        
        // Find all freelancer ID mentions in various formats
        const matches = findFreelancerMatches(content);
        console.log('Found freelancer matches:', matches);
        
        if (matches.length === 0) {
          setProcessedContent([content]);
          return;
        }
        
        // Process the content with the matches
        const parts = processMatches(content, matches, freelancers, userMap);
        setProcessedContent(parts);
      } catch (error) {
        console.error('Error processing freelancer mentions:', error);
        setProcessedContent([content]);
      }
    };
    
    processContent();
  }, [content]);
  
  // Function to find all freelancer ID mentions in the content
  const findFreelancerMatches = (text: string): FreelancerMatch[] => {
    const matches: FreelancerMatch[] = [];
    
    // Various regex patterns to catch different formatting variations
    const patterns = [
      /\*\*\[FREELANCER_ID:(\d+)\]\*\*/g,  // **[FREELANCER_ID:X]**
      /\*\*\[FREELANCER_ID:(\d+)\]/g,      // **[FREELANCER_ID:X]
      /\[FREELANCER_ID:(\d+)\]\*\*/g,      // [FREELANCER_ID:X]**
      /\[FREELANCER_ID:(\d+)\]/g           // [FREELANCER_ID:X]
    ];
    
    // Try each pattern
    patterns.forEach(regex => {
      let match;
      // Reset regex for each use
      regex.lastIndex = 0;
      
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          id: parseInt(match[1], 10),
          fullMatch: match[0],
          index: match.index
        });
        console.log(`Match found: ${match[0]}, ID: ${match[1]}, at position: ${match.index}`);
      }
    });
    
    // Sort by position in the text
    return matches.sort((a, b) => a.index - b.index);
  };
  
  // Process the content with the freelancer matches
  const processMatches = (
    text: string, 
    matches: FreelancerMatch[], 
    freelancers: any[], 
    userMap: Map<number, any>
  ): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    matches.forEach(match => {
      const { id, fullMatch, index } = match;
      
      // Find the freelancer
      const freelancer = freelancers.find(f => f.id === id);
      if (!freelancer) return;
      
      // Get user info
      const user = userMap.get(freelancer.userId);
      const displayName = user?.displayName || user?.username || `Freelancer ${id}`;
      
      // Add text before this match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      
      // Add the freelancer button group
      parts.push(
        <span key={`freelancer-${id}-${index}`} className="inline-flex items-center gap-1 my-1 bg-blue-50 p-1 rounded-lg border border-blue-100">
          <Button 
            variant="outline" 
            size="sm"
            className="inline-flex items-center gap-1 border-blue-200 bg-white"
            asChild
          >
            <Link href={`/freelancers/${id}`}>
              <User className="h-3.5 w-3.5" /> 
              {displayName}
            </Link>
          </Button>
          <Button 
            variant="default" 
            size="sm"
            className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3 py-1"
            asChild
          >
            <Link href={`/messages/new/${id}`}>
              <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Chat Now
            </Link>
          </Button>
        </span>
      );
      
      // Update last index
      lastIndex = index + fullMatch.length;
    });
    
    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts;
  };
  
  return (
    <div className="freelancer-mention">
      {processedContent.length > 0 ? processedContent : content}
    </div>
  );
}
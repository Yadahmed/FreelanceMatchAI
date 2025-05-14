import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

interface FreelancerMentionProps {
  content: string;
}

export function FreelancerMention({ content }: FreelancerMentionProps) {
  const [processedContent, setProcessedContent] = useState<React.ReactNode[]>([content]);
  
  useEffect(() => {
    const fetchFreelancers = async () => {
      if (!content) return;
      
      try {
        console.log("FreelancerMention processing content:", content.substring(0, 100) + (content.length > 100 ? "..." : ""));
        
        // Fetch freelancers data
        const freelancersResponse = await fetch('/api/freelancers');
        if (!freelancersResponse.ok) {
          console.error("Failed to fetch freelancers:", freelancersResponse.status);
          return;
        }
        const freelancers = await freelancersResponse.json();
        console.log(`Fetched ${freelancers.length} freelancers`);
        
        // Fetch users data for matching with freelancers
        const usersResponse = await fetch('/api/admin/users', {
          headers: { 'admin-session': 'true' }
        });
        if (!usersResponse.ok) {
          console.error("Failed to fetch users:", usersResponse.status);
          return;
        }
        const usersData = await usersResponse.json();
        
        // Extract users array based on response format
        const users = Array.isArray(usersData) ? usersData : 
                    (usersData && 'users' in usersData) ? usersData.users : [];
        console.log(`Fetched ${users.length} users`);
        
        // Create user map for faster lookup
        const userMap = new Map();
        users.forEach((user: any) => {
          if (user && user.id) userMap.set(user.id, user);
        });
        
        // Process the content
        processContent(content, freelancers, userMap);
      } catch (error) {
        console.error('Error in FreelancerMention component:', error);
      }
    };
    
    fetchFreelancers();
  }, [content]);
  
  const processContent = (text: string, freelancers: any[], userMap: Map<any, any>) => {
    // Multiple ID extraction patterns to catch different formats
    const patterns = [
      /\*\*\[FREELANCER_ID:(\d+)\]\*\*/g,  // **[FREELANCER_ID:X]**
      /\*\*\[FREELANCER_ID:(\d+)\]/g,      // **[FREELANCER_ID:X]
      /\[FREELANCER_ID:(\d+)\]\*\*/g,      // [FREELANCER_ID:X]**
      /\[FREELANCER_ID:(\d+)\]/g,          // [FREELANCER_ID:X]
      /\*\*FREELANCER_ID:(\d+)\*\*/g,      // **FREELANCER_ID:X**
      /FREELANCER_ID:(\d+)/g               // FREELANCER_ID:X (basic)
    ];
    
    const matches: {id: number, index: number, length: number}[] = [];
    const processedIds = new Set<number>();
    
    // Find all matches with all patterns
    patterns.forEach(patternRegex => {
      let match;
      // Reset pattern for each use
      patternRegex.lastIndex = 0;
      
      while ((match = patternRegex.exec(text)) !== null) {
        const id = parseInt(match[1], 10);
        // Only process each ID once
        if (!processedIds.has(id)) {
          processedIds.add(id);
          matches.push({
            id: id,
            index: match.index,
            length: match[0].length
          });
          console.log(`Matched freelancer ID: ${id} using pattern`);
        }
      }
    });
    
    // If no matches found, just return the original text
    if (matches.length === 0) {
      setProcessedContent([text]);
      return;
    }
    
    // Create React elements from matches
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    
    matches.forEach((match, i) => {
      // Add text before match
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }
      
      // Find freelancer info
      const freelancer = freelancers.find((f: any) => f.id === match.id);
      if (freelancer) {
        // Get user info for this freelancer
        const user = userMap.get(freelancer.userId);
        const displayName = user?.displayName || user?.username || `Freelancer ${match.id}`;
        
        // Add freelancer component with unique key
        elements.push(
          <span key={`freelancer-uid-${match.id}-${i}`} className="inline-flex items-center gap-1 my-1 bg-blue-50 p-1 rounded-lg border border-blue-100">
            <Button 
              variant="outline" 
              size="sm"
              className="inline-flex items-center gap-1 border-blue-200 bg-white"
              asChild
            >
              <Link href={`/freelancers/${match.id}`}>
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
              <Link href={`/messages/new/${match.id}`}>
                <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Chat Now
              </Link>
            </Button>
          </span>
        );
      } else {
        // If freelancer not found, just add the original text
        elements.push(text.substring(match.index, match.index + match.length));
      }
      
      // Update lastIndex
      lastIndex = match.index + match.length;
    });
    
    // Add any remaining text
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }
    
    // Update state with processed content
    setProcessedContent(elements);
  };
  
  return (
    <div className="freelancer-mention">
      {processedContent}
    </div>
  );
}
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
    console.log("Processing content, length:", text.length);
    
    // Comprehensive set of patterns to match all possible formats
    const patterns = [
      /\*\*\[FREELANCER_ID:(\d+)\]\*\*/g,       // **[FREELANCER_ID:X]**
      /\*\*\[FREELANCER_ID:(\d+)\]/g,           // **[FREELANCER_ID:X]
      /\[FREELANCER_ID:(\d+)\]\*\*/g,           // [FREELANCER_ID:X]**
      /\[FREELANCER_ID:(\d+)\]/g,               // [FREELANCER_ID:X]
      /\*\*FREELANCER_ID:(\d+)\*\*/g,           // **FREELANCER_ID:X**
      /FREELANCER_ID:(\d+)/g,                   // FREELANCER_ID:X (basic)
      /\*\*\s*\[FREELANCER_ID:\s*(\d+)\s*\]\s*\*\*/g,  // With whitespace
      /\*\*\s*FREELANCER_ID:\s*(\d+)\s*\*\*/g,          // With whitespace
      /\*\*ID:(\d+)\*\*/g,                      // **ID:X**
      /ID:(\d+)/g                               // ID:X (minimal)
    ];
    
    const matches: {id: number, index: number, length: number}[] = [];
    const processedIds = new Set<number>();
    
    // Find all matches with all patterns
    patterns.forEach((patternRegex, patternIndex) => {
      let match;
      // Reset pattern for each use
      patternRegex.lastIndex = 0;
      
      while ((match = patternRegex.exec(text)) !== null) {
        const id = parseInt(match[1], 10);
        // Verify ID is a valid number and not already processed
        if (!isNaN(id) && id > 0 && !processedIds.has(id)) {
          // Check if the ID exists in our freelancers data
          const freelancer = freelancers.find(f => f.id === id);
          if (freelancer) {
            processedIds.add(id);
            matches.push({
              id: id,
              index: match.index,
              length: match[0].length
            });
            console.log(`Matched freelancer ID: ${id} using pattern #${patternIndex+1}`);
          } else {
            console.log(`Found ID ${id} but no matching freelancer exists`);
          }
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
        
        // Get more freelancer info for display
        const hourlyRate = freelancer.hourlyRate || "N/A";
        const rating = freelancer.rating !== undefined ? Number(freelancer.rating).toFixed(1) : "N/A";
        const skills = Array.isArray(freelancer.skills) ? freelancer.skills.slice(0, 2).join(', ') : '';
        
        // Add freelancer component with unique key and improved responsive styling
        elements.push(
          <span key={`freelancer-uid-${match.id}-${i}`} className="inline-flex flex-col my-2 bg-blue-50 rounded-lg border border-blue-100 overflow-hidden w-full sm:max-w-[400px] max-w-full shadow-sm">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" /> 
                  <span className="font-semibold">{displayName}</span>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-xs">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {rating}
                </div>
              </div>
              {skills && <div className="text-xs mt-1 text-white/90">{skills}</div>}
            </div>
            
            <div className="p-2 bg-white flex justify-between items-center">
              <div className="text-indigo-700 font-semibold">${hourlyRate}/hr</div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs border-blue-200"
                  asChild
                >
                  <Link href={`/freelancers/${match.id}`}>View Profile</Link>
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  className="h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  asChild
                >
                  <Link href={`/messages/new/${match.id}`}>
                    <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Chat
                  </Link>
                </Button>
              </div>
            </div>
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
  
  // Add a CSS class to properly wrap the content
  return (
    <div className="freelancer-mention flex flex-col gap-1 break-words whitespace-pre-wrap">
      {processedContent}
    </div>
  );
}
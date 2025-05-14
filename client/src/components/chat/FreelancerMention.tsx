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
        const response = await fetch('/api/freelancers');
        if (!response.ok) {
          throw new Error('Failed to fetch freelancers');
        }
        const freelancers = await response.json();
        
        if (!freelancers || freelancers.length === 0) {
          setProcessedContent([content]);
          return;
        }

        // Sort freelancers by ID (descending) to avoid shorter IDs causing confusion
        const sortedFreelancers = [...freelancers].sort((a, b) => b.id - a.id);
        
        // Also get all users to get names - use admin headers
        const usersResponse = await fetch('/api/admin/users', {
          headers: { 'admin-session': 'true' }
        });
        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users');
        }
        const users = await usersResponse.json();
        
        // Create map of userId to user to easily lookup names
        const userMap = new Map<number, any>();
        users.forEach((user: any) => {
          userMap.set(user.id, user);
        });

        const parts: React.ReactNode[] = [];
        let remainingContent = content;
        
        // Try multiple regex patterns to catch different formatting variants in AI responses
        // Pattern 1: Simple [FREELANCER_ID:X] format
        const simpleTagRegex = /\[FREELANCER_ID:(\d+)\]/g;
        // Pattern 2: With double asterisks before **[FREELANCER_ID:X]
        const startAsteriskTagRegex = /\*\*\[FREELANCER_ID:(\d+)\]/g;
        // Pattern 3: With double asterisks after [FREELANCER_ID:X]**
        const endAsteriskTagRegex = /\[FREELANCER_ID:(\d+)\]\*\*/g;
        // Pattern 4: With double asterisks on both sides **[FREELANCER_ID:X]**
        const bothAsteriskTagRegex = /\*\*\[FREELANCER_ID:(\d+)\]\*\*/g;
        
        // Then check for freelancer IDs in the old format "ID: X" or "(ID: X)" as fallback
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
        
        // First check for our special new tag format [FREELANCER_ID:X]
        // Function to process matches from any regex
        const processMatches = (regex: RegExp, content: string) => {
          // Reset regex for search
          regex.lastIndex = 0;
          
          let match;
          let matches = [];
          
          while ((match = regex.exec(content)) !== null) {
            matches.push({
              fullMatch: match[0],
              id: parseInt(match[1], 10),
              index: match.index
            });
          }
          
          return matches;
        };
        
        // Add debugging info
        console.log('Looking for freelancer tags in content of length:', remainingContent.length);
        
        // Try all regex patterns
        let allMatches = [
          ...processMatches(simpleTagRegex, remainingContent),
          ...processMatches(startAsteriskTagRegex, remainingContent),
          ...processMatches(endAsteriskTagRegex, remainingContent),
          ...processMatches(bothAsteriskTagRegex, remainingContent)
        ];
        
        // Sort matches by their position in text (ascending)
        allMatches.sort((a, b) => a.index - b.index);
        
        console.log('Found total matches:', allMatches.length);
        
        // Process each match
        for (const tagMatch of allMatches) {
          console.log('Processing match:', tagMatch.fullMatch, 'ID:', tagMatch.id);
          const fullTagMatch = tagMatch.fullMatch;
          const id = tagMatch.id;
          
          // Find the freelancer with this ID
          const freelancer = sortedFreelancers.find(f => f.id === id);
          
          if (freelancer) {
            // Find user for this freelancer
            const user = userMap.get(freelancer.userId);
            const displayName = user?.displayName || user?.username || `Freelancer ${id}`;
            
            // Add text before the match
            const matchIndex = tagMatch.index;
            if (matchIndex > lastIndex) {
              parts.push(remainingContent.substring(lastIndex, matchIndex));
            }
            
            // Add a bold, prominent button for freelancer with a clear chat button
            parts.push(
              <span key={`tag-group-${id}-${tagMatch.index}`} className="inline-flex items-center gap-1 my-1 bg-blue-50 p-1 rounded-lg border border-blue-100">
                <Button 
                  key={`tag-${id}-${tagMatch.index}`}
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
                  key={`chat-tag-${id}-${tagMatch.index}`}
                  variant="default" 
                  size="sm"
                  className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3 py-1"
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
            
            // Update lastIndex to after this match
            lastIndex = tagMatch.index + fullTagMatch.length;
            
            // Remove the matched text with formatting characters from the remaining content
            remainingContent = remainingContent.substring(0, tagMatch.index) + 
              displayName + remainingContent.substring(lastIndex);
          }
        }
        
        // Then check for old ID patterns as fallback
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
            
            // Add the profile button with chat button
            parts.push(
              <span key={`fr-group-${id}-${match.index}`} className="inline-flex items-center gap-1">
                <Button 
                  key={`fr-${id}-${match.index}`}
                  variant="outline" 
                  size="sm"
                  className="mx-1 my-0.5 inline-flex items-center gap-1 border-blue-200"
                  asChild
                >
                  <Link href={`/freelancers/${id}`}>
                    <User className="h-3.5 w-3.5" /> 
                    {displayName}
                  </Link>
                </Button>
                <Button 
                  key={`chat-${id}-${match.index}`}
                  variant="default" 
                  size="sm"
                  className="ml-0 my-0.5 inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-2 py-0"
                  asChild
                >
                  <Link href={`/messages/new/${id}`}>
                    <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Chat
                  </Link>
                </Button>
              </span>
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
                
                // Add the profile button with chat button
                nameParts.push(
                  <span key={`name-group-${freelancerId}-${nameMatch.index}`} className="inline-flex items-center gap-1">
                    <Button 
                      key={`name-${freelancerId}-${nameMatch.index}`}
                      variant="outline" 
                      size="sm"
                      className="mx-1 my-0.5 inline-flex items-center gap-1 border-blue-200"
                      asChild
                    >
                      <Link href={`/freelancers/${freelancerId}`}>
                        <User className="h-3.5 w-3.5" /> 
                        {displayName}
                      </Link>
                    </Button>
                    <Button 
                      key={`chat-name-${freelancerId}-${nameMatch.index}`}
                      variant="default" 
                      size="sm"
                      className="ml-0 my-0.5 inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-2 py-0"
                      asChild
                    >
                      <Link href={`/messages/new/${freelancerId}`}>
                        <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        Chat
                      </Link>
                    </Button>
                  </span>
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
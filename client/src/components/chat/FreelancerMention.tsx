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
        
        // Add debug info to console
        console.log("Freelancer IDs in database:", freelancers.map((f: any) => f.id).join(', '));
        
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
    
    // Log the content with line numbers for debugging
    const contentLines = text.split('\n');
    contentLines.forEach((line, index) => {
      console.log(`Line ${index + 1}: ${line}`);
    });
    
    // Special handling for markdown lists that look like:
    // 1. **Name:** Freelancer Name
    const extractFromMarkdownList = () => {
      const extracted: {id: number, index: number, length: number}[] = [];
      const lines = text.split('\n');
      
      // Log the IDs we have in our database for reference
      console.log("Available freelancer IDs:", freelancers.map(f => f.id).join(', '));
      
      // Look for lines that start with a number and have a pattern like "**Name:**"
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check various markdown list patterns
        // 1. Bold number with a period as list item
        let listMatch = line.match(/^([0-9]+)[\.\s]+\*\*(?:Name|Freelancer):/i);
        // 2. Number at start of line followed by any content
        if (!listMatch) listMatch = line.match(/^([0-9]+)\.\s+(.*)/);
        // 3. Just number at the start of a line (could be an ID)
        if (!listMatch) listMatch = line.match(/^([0-9]+)\s+/);
        
        if (listMatch) {
          const potentialId = parseInt(listMatch[1], 10);
          console.log(`Potential ID from markdown list: ${potentialId} from line: "${line}"`);
          
          // Try to see if this number is a valid ID
          const freelancer = freelancers.find(f => f.id === potentialId);
          if (freelancer) {
            // Calculate positions in the original text
            const lineStart = i === 0 ? 0 : 
              text.indexOf(lines[i-1]) + lines[i-1].length + 1;
            const itemStart = text.indexOf(line, lineStart);
            
            extracted.push({
              id: potentialId,
              index: itemStart,
              length: line.length
            });
            
            console.log(`✓ Extracted freelancer ID ${potentialId} from markdown list: "${line}"`);
          } else {
            // Additional check for very specific numbers that might represent valid IDs
            if (potentialId > 0 && potentialId < 200) {
              // Look up any freelancer ID in the content of the line
              for (const f of freelancers) {
                if (line.toLowerCase().includes(f.id.toString())) {
                  console.log(`Found alternate ID ${f.id} in line: "${line}"`);
                  const lineStart = i === 0 ? 0 : 
                    text.indexOf(lines[i-1]) + lines[i-1].length + 1;
                  const itemStart = text.indexOf(line, lineStart);
                  
                  extracted.push({
                    id: f.id,
                    index: itemStart,
                    length: line.length
                  });
                  break;
                }
              }
            }
          }
        }
      }
      
      return extracted;
    };
    
    // Process matches into React elements
    const processMatchesIntoElements = (matches: {id: number, index: number, length: number, notFound?: boolean}[]) => {
      // Create React elements from matches
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      
      // Sort matches by index to process them in order
      matches.sort((a, b) => a.index - b.index);
      
      matches.forEach((match, i) => {
        // Add text before match
        if (match.index > lastIndex) {
          elements.push(text.substring(lastIndex, match.index));
        }
        
        // Check if this is a notFound match (ID doesn't exist)
        if (match.notFound) {
          // Just render the original text for IDs that don't exist
          elements.push(
            <span key={`freelancer-not-found-${match.id}-${i}`} className="text-gray-700">
              ID:{match.id}
            </span>
          );
        } else {
          // Find freelancer info
          const freelancer = freelancers.find((f: any) => f.id === match.id);
          if (freelancer) {
            // Get user info for this freelancer
            const user = userMap.get(freelancer.userId);
            const displayName = user?.displayName || user?.username || `Freelancer ${match.id}`;
            
            // Get more freelancer info for display
            const hourlyRate = freelancer.hourlyRate || "N/A";
            // Adjust rating display to show correctly (divide by 10 if greater than 5)
            const rating = freelancer.rating !== undefined 
              ? (freelancer.rating > 5 ? (freelancer.rating / 10).toFixed(1) : freelancer.rating.toFixed(1))
              : "N/A";
            const skills = Array.isArray(freelancer.skills) ? freelancer.skills.slice(0, 2).join(', ') : '';
          
            // Add freelancer component with unique key and improved responsive styling
            elements.push(
              <span key={`freelancer-uid-${match.id}-${i}`} className="inline-flex flex-col my-2 bg-background rounded-lg border border-border/40 overflow-hidden w-full sm:max-w-[400px] max-w-full shadow-sm">
                <div className="p-3 bg-gradient-to-r from-primary to-primary/80 text-white">
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
                
                <div className="p-2 bg-background flex justify-between items-center">
                  <div className="text-primary font-semibold">${hourlyRate}/hr</div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-8 text-xs"
                      asChild
                    >
                      <Link href={`/freelancer/${match.id}`}>View Profile</Link>
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="h-8 text-xs bg-primary hover:bg-primary/90"
                      asChild
                    >
                      <Link href={`/messages/${match.id}`}>
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
    
    // Try to detect a numbered markdown list pattern in the text
    const detectNumberedList = () => {
      // Look for a pattern of lines that start with 1., 2., 3. in sequence
      const lines = text.split('\n');
      let listStartIndex = -1;
      
      // Find where the numbered list might start
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^1[\.\s]/)) {
          // Check if next line starts with 2.
          if (i+1 < lines.length && lines[i+1].match(/^2[\.\s]/)) {
            listStartIndex = i;
            break;
          }
        }
      }
      
      if (listStartIndex >= 0) {
        console.log(`Detected numbered list starting at line ${listStartIndex+1}`);
        
        // Try to extract freelancer IDs from the list items
        // Assume that the number at the start of each list item might correspond to a freelancer ID
        const extracted: {id: number, index: number, length: number}[] = [];
        
        for (let i = listStartIndex; i < lines.length; i++) {
          const line = lines[i];
          const lineMatch = line.match(/^(\d+)[\.\s]/);
          
          if (lineMatch) {
            const listItemNum = parseInt(lineMatch[1], 10);
            console.log(`List item #${listItemNum}: "${line}"`);
            
            // Strategy 1: Check if the list item number itself is a valid freelancer ID
            let freelancer = freelancers.find(f => f.id === listItemNum);
            if (freelancer) {
              console.log(`✓ Found freelancer with ID matching list item number: ${listItemNum}`);
              
              // Calculate position in text
              const lineStart = i === 0 ? 0 : text.indexOf(lines[i-1]) + lines[i-1].length + 1;
              const itemStart = text.indexOf(line, lineStart);
              
              extracted.push({
                id: listItemNum,
                index: itemStart,
                length: line.length
              });
              continue; // Skip to next item
            }
            
            // Strategy 2: If there is a numerical ID in the line, it might be the freelancer ID
            const idMatch = line.match(/\b(\d{2,})\b/g); // Match any 2+ digit number
            if (idMatch) {
              // Try all numbers in the line
              for (const numStr of idMatch) {
                const potentialId = parseInt(numStr, 10);
                freelancer = freelancers.find(f => f.id === potentialId);
                if (freelancer) {
                  console.log(`✓ Found freelancer ID ${potentialId} in list item`);
                  
                  // Calculate position in text
                  const lineStart = i === 0 ? 0 : text.indexOf(lines[i-1]) + lines[i-1].length + 1;
                  const itemStart = text.indexOf(line, lineStart);
                  
                  extracted.push({
                    id: potentialId,
                    index: itemStart,
                    length: line.length
                  });
                  break; // Found a match, stop checking other numbers
                }
              }
            }
          }
        }
        
        if (extracted.length > 0) {
          console.log(`Extracted ${extracted.length} freelancers from numbered list`);
          return extracted;
        }
      }
      
      return [];
    };
    
    // First check for structured numbered list
    const numberedListMatches = detectNumberedList();
    if (numberedListMatches.length > 0) {
      processMatchesIntoElements(numberedListMatches);
      return;
    }
    
    // Then try the specialized markdown extractor
    const markdownMatches = extractFromMarkdownList();
    if (markdownMatches.length > 0) {
      console.log(`Found ${markdownMatches.length} freelancers using markdown list extractor`);
      processMatchesIntoElements(markdownMatches);
      return;
    }
    
    // If markdown extraction failed, continue with regular pattern matching
    console.log("No markdown list matches found, trying regular patterns");
    
    // Comprehensive set of patterns to match all possible formats
    const patterns = [
      // Exact patterns from the screenshots
      /^([0-9]+)[\s\n].*\*\*Name:\*\*/m,        // Format from screenshot: ID followed by Name:
      /^([0-9]+)\s+\*\*/m,                      // Format: number at start of line followed by bold text
      /^([0-9]+)\.\s/m,                         // Format: number with period at start of line (like "1092. ")
      /^\*\*([0-9]+)\*\*/m,                     // Format: Bold number at start of line
      /^([0-9]+)\.?\s.*(?:graphic|design|ui|ux|web)/im,  // Number followed by description containing design keywords
      /^([0-9]+)\.?\s.*(?:hourly rate|rate:)/im,  // Number followed by hourly rate mention
      
      // First attempt to find direct numerical patterns from the screenshot
      /^([0-9]{4})$/m,                          // Just a 4-digit ID at the start of a line (like "1092")
      /ID:([0-9]{4})/,                          // ID:XXXX format (like "ID:1092")
      /^([0-9]{4})\s/m,                         // 4-digit ID followed by space at line start
      
      // Regular ID patterns
      /\*\*\[FREELANCER_ID:(\d+)\]\*\*/g,       // **[FREELANCER_ID:X]**
      /\*\*\[FREELANCER_ID:(\d+)\]/g,           // **[FREELANCER_ID:X]
      /\[FREELANCER_ID:(\d+)\]\*\*/g,           // [FREELANCER_ID:X]**
      /\[FREELANCER_ID:(\d+)\]/g,               // [FREELANCER_ID:X]
      /\*\*FREELANCER_ID:(\d+)\*\*/g,           // **FREELANCER_ID:X**
      /FREELANCER_ID:(\d+)/g,                   // FREELANCER_ID:X (basic)
      /\*\*\s*\[FREELANCER_ID:\s*(\d+)\s*\]\s*\*\*/g,  // With whitespace
      /\*\*\s*FREELANCER_ID:\s*(\d+)\s*\*\*/g,   // With whitespace
      /\*\*ID:(\d+)\*\*/g,                      // **ID:X**
      /ID:(\d+)/g,                              // ID:X (minimal)
      /ID:\s*(\d+)/g,                           // ID: X (with space)
      /^ID:(\d+)$/m,                            // ID:X at start of line
      /\nID:(\d+)/g,                            // ID:X after newline
      /\nID:\s*(\d+)/g,                         // ID: X after newline with space
      /\bID:(\d+)\b/g,                          // ID:X with word boundary
      /^ID:(\d+)/mg,                            // ID:X at start of any line 
      // Match patterns from screenshots
      /ID:(\d+)\n/g,                            // ID:X followed by newline
      /^ID:(\d+)\s+/mg,                         // ID:X at line start with spaces after
    ];
    
    // Update the type to include a notFound flag
    const matches: {id: number, index: number, length: number, notFound?: boolean}[] = [];
    const processedIds = new Set<number>();
    
    // Find all matches with all patterns
    patterns.forEach((patternRegex, patternIndex) => {
      let match;
      // Reset pattern for each use
      patternRegex.lastIndex = 0;
      
      while ((match = patternRegex.exec(text)) !== null) {
        let id = parseInt(match[1], 10);
        
        // Log all matches for debugging
        console.log(`Raw match found with pattern #${patternIndex+1}:`, match[0]);
        
        // Verify ID is a valid number and not already processed
        if (!isNaN(id) && id > 0 && !processedIds.has(id)) {
          console.log(`Processing potential freelancer ID: ${id} using pattern #${patternIndex+1} - match text: "${match[0]}"`);
          
          // Check if the ID exists in our freelancers data
          let freelancer = freelancers.find(f => f.id === id);
          
          // If not found directly by ID, look for any freelancer with ID in line
          if (!freelancer) {
            // Get the line where this match was found
            const lineStart = text.lastIndexOf('\n', match.index) + 1;
            const lineEnd = text.indexOf('\n', match.index);
            const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
            console.log(`Looking in line: "${line}"`);
            
            // Try to find any valid freelancer ID in this line
            const allIdsInFreelancers = freelancers.map(f => f.id);
            for (const potentialId of allIdsInFreelancers) {
              if (line.includes(potentialId.toString())) {
                id = potentialId;
                freelancer = freelancers.find(f => f.id === id);
                console.log(`Found alternate ID ${id} in line`);
                break;
              }
            }
          }
          
          if (freelancer) {
            processedIds.add(id);
            matches.push({
              id: id,
              index: match.index,
              length: match[0].length
            });
            console.log(`Successfully matched freelancer ID: ${id} using pattern #${patternIndex+1}`);
          } else {
            // Check if ID is in valid range for our system
            if (id > 0 && id < 5000) {  // Assuming IDs under 5000 are valid
              // Add to matches with a notFound flag
              processedIds.add(id);
              matches.push({
                id: id,
                index: match.index,
                length: match[0].length,
                notFound: true
              });
              console.log(`Found ID ${id} but no matching freelancer exists - added with notFound flag`);
            } else {
              console.log(`Ignoring ID ${id} as it's likely not a valid freelancer ID`);
            }
          }
        }
      }
    });
    
    // If no matches found, just return the original text
    if (matches.length === 0) {
      setProcessedContent([text]);
      return;
    }
    
    // Process all matches using our unified function
    processMatchesIntoElements(matches);
  };
  
  // Add a CSS class to properly wrap the content
  return (
    <div className="freelancer-mention flex flex-col gap-1 break-words whitespace-pre-wrap">
      {processedContent}
    </div>
  );
}
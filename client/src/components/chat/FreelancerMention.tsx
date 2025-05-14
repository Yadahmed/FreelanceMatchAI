import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { User, Star, MessageCircle } from 'lucide-react';

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
      
      // First try to detect the exact format with [FREELANCER_ID:X] which is the most specific
      const freelancerIdPattern = /\*\*\[FREELANCER_ID:(\d+)\]/;
      const freelancerIdMatch = text.match(freelancerIdPattern);
      if (freelancerIdMatch) {
        const id = parseInt(freelancerIdMatch[1], 10);
        const freelancer = freelancers.find(f => f.id === id);
        if (freelancer) {
          console.log(`Found direct [FREELANCER_ID:${id}] mention for ${freelancer.id}`);
          
          // Find where in the text it occurs and the whole entry
          const matchIndex = text.indexOf(freelancerIdMatch[0]);
          
          // Find the start of the line containing this ID
          let lineStart = text.lastIndexOf('\n', matchIndex);
          if (lineStart === -1) lineStart = 0;
          else lineStart += 1; // Skip the newline character
          
          // Find the end of this line
          let lineEnd = text.indexOf('\n', matchIndex);
          if (lineEnd === -1) lineEnd = text.length;
          
          const lineText = text.substring(lineStart, lineEnd);
          console.log(`Found freelancer line: "${lineText}"`);
          
          // Add as a match
          extracted.push({
            id: id,
            index: lineStart,
            length: lineEnd - lineStart
          });
        }
      }
      
      // If no direct FREELANCER_ID format, check for exact ID string mentions
      if (extracted.length === 0) {
        const fullText = text.toLowerCase();
        for (const freelancer of freelancers) {
          // Look for explicit ID mentions in various formats
          const idPatterns = [
            `id: ${freelancer.id}`,
            `id:${freelancer.id}`,
            `freelancer_id:${freelancer.id}`,
            `freelancer id: ${freelancer.id}`
          ];
          
          for (const idPattern of idPatterns) {
            if (fullText.includes(idPattern)) {
              console.log(`Found direct ID mention: "${idPattern}" for freelancer ${freelancer.id}`);
              
              // Find where in the text it occurs
              const idIndex = fullText.indexOf(idPattern);
              
              // Try to find the whole entry content
              // Find the start of the line containing this ID
              let entryStart = fullText.lastIndexOf('\n', idIndex);
              if (entryStart === -1) entryStart = 0;
              
              // Find the end of this entry (next empty line or end of text)
              let entryEnd = fullText.indexOf('\n\n', idIndex);
              if (entryEnd === -1) entryEnd = fullText.length;
              
              const entryText = fullText.substring(entryStart, entryEnd);
              console.log(`Entry text for ID ${freelancer.id}: "${entryText}"`);
              
              // Add as a match
              extracted.push({
                id: freelancer.id,
                index: entryStart,
                length: entryEnd - entryStart
              });
              
              break; // Found this freelancer, move to next
            }
          }
        }
      }
      
      // Look for lines that start with a number and have a pattern like "**Name:**"
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip lines that are clearly questions in a list
        if (line.toLowerCase().includes("what type") || 
            line.toLowerCase().includes("budget") ||
            line.toLowerCase().includes("timeline") || 
            line.toLowerCase().includes("style preference")) {
          console.log(`Skipping line that appears to be a question: "${line}"`);
          continue;
        }
        
        // Check various markdown list patterns
        // 1. Bold number with a period as list item
        let listMatch = line.match(/^([0-9]+)[\.\s]+\*\*(?:Name|Freelancer):/i);
        // 2. Number at start of line followed by any content that might indicate a designer description
        if (!listMatch && (
            line.toLowerCase().includes("design") || 
            line.toLowerCase().includes("graphic") ||
            line.toLowerCase().includes("ui/ux") || 
            line.toLowerCase().includes("artist") ||
            line.toLowerCase().includes("rate") ||
            line.toLowerCase().includes("skills")
           )) {
          listMatch = line.match(/^([0-9]+)\.\s+(.*)/);
        }
        // 3. Just number at the start of a line (could be an ID) - but only if line seems to be about a freelancer
        if (!listMatch && (
            line.toLowerCase().includes("design") || 
            line.toLowerCase().includes("graphic") ||
            line.toLowerCase().includes("ui/ux") || 
            line.toLowerCase().includes("artist") ||
            line.toLowerCase().includes("rate") ||
            line.toLowerCase().includes("$")
           )) {
          listMatch = line.match(/^([0-9]+)\s+/);
        }
        
        if (listMatch) {
          const potentialId = parseInt(listMatch[1], 10);
          console.log(`Potential ID from markdown list: ${potentialId} from line: "${line}"`);
          
          // Skip 1-4 if they appear in a typical list format and don't look like actual IDs
          if (potentialId <= 4 && 
              !line.toLowerCase().includes("freelancer") && 
              !line.toLowerCase().includes("id:") &&
              (line.match(/^[1-4]\.\s/) || line.match(/^[1-4]\)/))) {
            console.log(`Skipping what appears to be a sequence number, not an ID: ${potentialId}`);
            continue;
          }
          
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
      
      // Log detailed information about matched freelancers for debugging
      console.log("=== MATCHED FREELANCERS ===");
      for (const match of matches) {
        const freelancer = freelancers.find(f => f.id === match.id);
        if (freelancer) {
          const user = userMap.get(freelancer.userId);
          const displayName = user?.displayName || user?.username || `Freelancer ${match.id}`;
          console.log(`✓ Match ID: ${match.id}, Name: ${displayName}, Skills: ${freelancer.skills?.join(', ') || 'none'}`);
        } else {
          console.log(`⚠️ Match ID: ${match.id} - Not found in database`);
        }
      }
      console.log("=========================");
      
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
              <div key={`freelancer-uid-${match.id}-${i}`} className="flex flex-col my-3 bg-background rounded-lg border border-border/40 overflow-hidden w-full shadow-md dark:bg-gray-800/95 dark:border-gray-700">
                <div className="p-3 bg-gradient-to-r from-primary to-primary/80 text-white dark:from-primary/90 dark:to-primary/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" /> 
                      <span className="font-semibold">{displayName}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-xs">
                      <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" />
                      {rating}
                    </div>
                  </div>
                  {skills && <div className="text-xs mt-1 text-white/90">{skills}</div>}
                </div>
                
                <div className="p-3 bg-background dark:bg-gray-800 flex justify-between items-center">
                  <div className="text-primary font-semibold dark:text-indigo-300">${hourlyRate}/hr</div>
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
                      <Link href={`/chat?freelancer=${match.id}`}>
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Chat
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
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
      // BEGIN SPECIAL CASE: First check for all instances of the specific FREELANCER_ID format
      const freelancerIdPattern = /\*\*\[FREELANCER_ID:(\d+)\]/g;
      const allFreelancerIdMatches = Array.from(text.matchAll(freelancerIdPattern));
      
      if (allFreelancerIdMatches.length > 0) {
        console.log(`Found ${allFreelancerIdMatches.length} [FREELANCER_ID:X] matches`);
        const results = [];
        
        for (const match of allFreelancerIdMatches) {
          const idStr = match[1];
          const id = parseInt(idStr, 10);
          const freelancer = freelancers.find(f => f.id === id);
          
          if (freelancer) {
            console.log(`Processing [FREELANCER_ID:${id}] for ${freelancer.displayName}`);
            
            // Find where in the text this specific match occurs
            const matchIndex = match.index!;
            const matchText = match[0];
            
            // Find the paragraph containing this freelancer mention (from the line start to the next empty line)
            let lineStart = text.lastIndexOf('\n', matchIndex) + 1;
            if (lineStart <= 0) lineStart = 0;
            
            // Find where the freelancer description paragraph ends (next double newline or 4 lines)
            let paraEnd = text.indexOf('\n\n', matchIndex);
            if (paraEnd === -1) paraEnd = text.length;
            
            // Include a few lines after the mention to capture skills, experience, etc.
            let currentPos = matchIndex;
            let lineCount = 0;
            for (let i = 0; i < 4; i++) {
              const nextNewline = text.indexOf('\n', currentPos + 1);
              if (nextNewline === -1 || nextNewline > paraEnd) break;
              currentPos = nextNewline;
              lineCount++;
            }
            
            // If we found more lines, use the later position as the paragraph end
            if (lineCount > 0 && currentPos > matchIndex) {
              paraEnd = currentPos;
            }
            
            results.push({
              id: id,
              index: lineStart,
              length: paraEnd - lineStart
            });
          }
        }
        
        if (results.length > 0) {
          return results;
        }
      }
      // END SPECIAL CASE
    
      // Look for a pattern of lines that start with 1., 2., 3. in sequence
      const lines = text.split('\n');
      let listStartIndex = -1;
      
      // Find where the numbered list might start that isn't a list of questions
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^1[\.\s]/)) {
          // Check if next line starts with 2.
          if (i+1 < lines.length && lines[i+1].match(/^2[\.\s]/)) {
            // Make sure this isn't a list of questions
            const line1Lower = lines[i].toLowerCase();
            const line2Lower = lines[i+1].toLowerCase();
            
            // Skip if these are clearly just questions and not freelancer profiles
            if (line1Lower.includes("what type") || 
                line1Lower.includes("looking for") ||
                line2Lower.includes("budget") ||
                line2Lower.includes("payment")) {
              console.log("Skipping numbered list that appears to be questions");
              continue;
            }
            
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
            
            // IMPORTANT: Skip items that look like a numbered list (1., 2., etc.)
            // where the numbers are just counting items, NOT freelancer IDs
            
            // Check if this is just a normal numbering for questions (skip these)
            if (line.toLowerCase().includes("what type") || 
                line.toLowerCase().includes("budget") ||
                line.toLowerCase().includes("timeline") || 
                line.toLowerCase().includes("style preference") ||
                line.toLowerCase().includes("experience") ||
                line.toLowerCase().includes("looking for")) {
              console.log(`Skipping numbered list item that appears to be a question/instruction`);
              continue;
            }
            
            // Strategy 1: Only if the number is NOT a small sequence number (1,2,3,4)
            // or if the line explicitly mentions designer/freelancer, then check if it's a freelancer ID
            if (listItemNum > 4 || 
               line.toLowerCase().includes("designer") || 
               line.toLowerCase().includes("freelancer")) {
              
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
            
            // Strategy 3: Find freelancer IDs in adjacent lines
            // Exact format from screenshot - when a list has lines where the number is not itself an ID
            if (!freelancer && i < lines.length - 3) {
              // Check if this is a multi-line entry with skills, expertise, etc.
              const nextLines = [lines[i+1], lines[i+2], lines[i+3]]; // Check next 3 lines
              
              for (const nextLine of nextLines) {
                // Look for an ID pattern in those lines (direct number or ID: pattern)
                const nextLineIdMatch = nextLine.match(/\b(\d{2,})\b/g); // Any 2+ digit number
                if (nextLineIdMatch) {
                  for (const numStr of nextLineIdMatch) {
                    const potentialId = parseInt(numStr, 10);
                    const freelancer = freelancers.find(f => f.id === potentialId);
                    if (freelancer) {
                      console.log(`✓ Found freelancer ID ${potentialId} in a nearby line: "${nextLine}"`);
                      
                      // Calculate position in text
                      const lineStart = i === 0 ? 0 : text.indexOf(lines[i-1]) + lines[i-1].length + 1;
                      const itemStart = text.indexOf(line, lineStart);
                      
                      extracted.push({
                        id: potentialId,
                        index: itemStart,
                        length: line.length
                      });
                      
                      // Skip processing those next lines
                      i += nextLines.indexOf(nextLine) + 1;
                      break;
                    }
                  }
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
      
      // Common ID formats
      /id:?\s*([0-9]+)/i,                       // Literal "ID:" followed by a number
      /id number:?\s*([0-9]+)/i,                // "ID number:" followed by number
      /freelancer id:?\s*([0-9]+)/i,            // "Freelancer ID:" followed by number
      
      // First attempt to find direct numerical patterns from the screenshot
      /^([0-9]{2,4})$/m,                        // Just a 2-4 digit ID at the start of a line
      /ID:([0-9]{2,4})/,                        // ID:XX or ID:XXXX format
      /^([0-9]{2,4})\s/m,                       // 2-4 digit ID followed by space at line start
      
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
    
    // If no matches found through our patterns, try a fallback approach
    if (matches.length === 0) {
      console.log("No pattern matches found, trying fallback approach");
      
      // Fallback: Look for any valid freelancer IDs in the entire text
      const fallbackMatches: {id: number, index: number, length: number}[] = [];
      
      // Check if we're getting a design-related response
      const isDesignResponse = text.toLowerCase().includes("design") || 
                               text.toLowerCase().includes("graphic") ||
                               text.toLowerCase().includes("ui/ux") ||
                               text.toLowerCase().includes("logo");
                               
      // Look for any mentions of specific designs                         
      let designerMatches = [];
      if (isDesignResponse) {
        // Look for designers specifically
        const designFreelancers = freelancers.filter(f => {
          const skills = Array.isArray(f.skills) ? f.skills.join(' ').toLowerCase() : '';
          return skills.includes('design') || 
                 skills.includes('graphic') || 
                 skills.includes('ui') || 
                 skills.includes('ux') || 
                 skills.includes('logo');
        });
        
        if (designFreelancers.length > 0) {
          console.log(`Found ${designFreelancers.length} designers in database`);
          // Get top rated designers
          designerMatches = [...designFreelancers]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 1); // Just get the top one
            
          if (designerMatches.length > 0) {
            console.log(`Selected top designer with ID ${designerMatches[0].id} for design query`);
            fallbackMatches.push({
              id: designerMatches[0].id,
              index: 0,
              length: 1
            });
          }
        }
      }
      
      // If no designer matches or not a design query, check for specific keywords
      if (fallbackMatches.length === 0) {
        // First, check if the content has numbered lists that might be freelancers
        const hasOrderedList = text.match(/^1[\.\)]\s+/m) && text.match(/^2[\.\)]\s+/m);
        
        if (hasOrderedList) {
          console.log("Content has numbered lists - might be freelancers");
          // Assume the top freelancers should be shown
          const topFreelancers = [...freelancers]
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 1); // Just get the top one to avoid confusion
          
          console.log(`Using top ${topFreelancers.length} freelancers as fallback`);
          
          // Create "virtual" matches positioned at the start of the text
          topFreelancers.forEach((f, i) => {
            fallbackMatches.push({
              id: f.id,
              index: 0,  // We'll position them at the start
              length: 1  // Minimal length since we're not replacing anything
            });
          });
        }
      }
      
      if (fallbackMatches.length > 0) {
        console.log(`Added ${fallbackMatches.length} fallback matches`);
        processMatchesIntoElements(fallbackMatches);
      } else {
        // No fallback matches either, just return the original text
        setProcessedContent([text]);
      }
      return;
    }
    
    // Process all matches using our unified function
    processMatchesIntoElements(matches);
  };
  
  // Add a CSS class to properly wrap the content
  return (
    <div className="freelancer-mention flex flex-col gap-3 break-words whitespace-pre-wrap">
      {processedContent}
    </div>
  );
}
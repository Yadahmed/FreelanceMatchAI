// Script to fetch users directly from the API
import { exec } from 'child_process';

// Use curl instead which doesn't get intercepted by Vite
exec('curl http://localhost:5000/api/admin/users -H "Accept: application/json" --output /dev/stdout', 
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    
    try {
      const result = JSON.parse(stdout);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('Error parsing JSON:', e);
      console.log('Raw response (first 1000 chars):', stdout.substring(0, 1000) + '...');
    }
});
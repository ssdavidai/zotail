'use strict';

const { execSync, spawn } = require('child_process');
const readline = require('readline');

/**
 * Get interactive auth URL from tailscale up
 * @returns {Promise<string|null>} Auth URL or null
 */
async function getAuthURL() {
  return new Promise((resolve, reject) => {
    const tailscale = spawn('tailscale', ['up', '--accept-routes'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    tailscale.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    tailscale.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    tailscale.on('close', (code) => {
      // Look for auth URL in output
      const authMatch = stdout.match(/(https:\/\/login\.tailscale\.com\/[^\s]+)/) || 
                       stderr.match(/(https:\/\/login\.tailscale\.com\/[^\s]+)/);
      
      if (authMatch) {
        resolve(authMatch[1]);
      } else {
        resolve(null);
      }
    });
    
    tailscale.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Prompt user to complete interactive auth
 * @param {string} authURL - The auth URL to display
 * @returns {Promise<boolean>} True if user confirmed
 */
async function promptInteractiveAuth(authURL) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('  Interactive Authentication Required');
  console.log('');
  console.log('  Open this URL in your browser:');
  console.log('');
  console.log('  ' + authURL);
  console.log('');
  console.log('  Or run this on your local machine:');
  console.log('');
  console.log('  tailscale up --login-server ' + authURL);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('  Press Enter once you\'ve authorized this device... ', () => {
      rl.close();
      resolve(true);
    });
  });
}

module.exports = { getAuthURL, promptInteractiveAuth };

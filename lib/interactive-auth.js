'use strict';

const { spawn } = require('child_process');
const readline = require('readline');

/**
 * Get interactive auth URL by running tailscale up
 * @returns {Promise<string|null>} Auth URL or null
 */
async function getAuthURL() {
  return new Promise((resolve, reject) => {
    const tailscale = spawn('sudo', ['tailscale', 'up', '--accept-routes'], {
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
    
    setTimeout(() => {
      tailscale.kill();
      
      const output = stdout + stderr;
      const match = output.match(/(https:\/\/login\.tailscale\.com\/[^\s]+)/);
      
      if (match) {
        resolve(match[1]);
      } else {
        resolve(null);
      }
    }, 3000);
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

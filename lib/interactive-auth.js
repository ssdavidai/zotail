'use strict';

const { execSync } = require('child_process');
const readline = require('readline');

/**
 * Get interactive auth URL from tailscale status
 * @returns {string|null} Auth URL or null
 */
function getAuthURL() {
  try {
    const output = execSync('sudo tailscale status 2>&1', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const match = output.match(/(https:\/\/login\.tailscale\.com\/[^\s]+)/);
    return match ? match[1] : null;
  } catch (e) {
    // Check error output for auth URL
    const output = e.stdout || '' + e.stderr || '';
    const match = output.match(/(https:\/\/login\.tailscale\.com\/[^\s]+)/);
    return match ? match[1] : null;
  }
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

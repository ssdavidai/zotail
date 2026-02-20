'use strict';

const https = require('https');
const readline = require('readline');
const { getSecret, setSecret, prompt } = require('./setup');

function apiRequest(method, path, apiKey, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.tailscale.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runCleanup() {
  console.log('\n🧹 Tailscale Node Cleanup\n');

  // Get API key
  let apiKey = getSecret('TAILSCALE_API_KEY');

  if (apiKey) {
    const reuse = await prompt(`Found existing API key (${apiKey.slice(0, 20)}...). Use it? [Y/n] `);
    if (reuse.toLowerCase() === 'n') {
      apiKey = await prompt('Enter your Tailscale API key (https://login.tailscale.com/admin/settings/keys): ');
      setSecret('TAILSCALE_API_KEY', apiKey);
    }
  } else {
    apiKey = await prompt('Enter your Tailscale API key (https://login.tailscale.com/admin/settings/keys): ');
    if (!apiKey) {
      console.error('API key is required for cleanup.');
      process.exit(1);
    }
    setSecret('TAILSCALE_API_KEY', apiKey);
    console.log('✓ API key saved to ~/.zo_secrets');
  }

  // Fetch devices
  console.log('\nFetching devices...');
  let devices;
  try {
    const result = await apiRequest('GET', '/api/v2/tailnet/-/devices', apiKey);
    devices = result.devices || [];
  } catch (e) {
    console.error('Failed to fetch devices:', e.message);
    process.exit(1);
  }

  // Find offline nodes
  const now = Date.now();
  const offline = devices.filter((d) => {
    const lastSeen = new Date(d.lastSeen).getTime();
    const offlineMs = now - lastSeen;
    // Consider offline if not seen in 5+ minutes
    return offlineMs > 5 * 60 * 1000;
  });

  if (offline.length === 0) {
    console.log(`All ${devices.length} devices are online. Nothing to clean up.`);
    return;
  }

  console.log(`\nFound ${offline.length} offline node(s):\n`);
  offline.forEach((d, i) => {
    const lastSeen = new Date(d.lastSeen);
    const ago = humanizeAge(now - lastSeen.getTime());
    console.log(`  ${i + 1}. ${d.name.padEnd(35)} last seen: ${ago} ago`);
  });

  const answer = await prompt(`\nDelete all ${offline.length} offline node(s)? [y/N] `);
  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    return;
  }

  // Delete nodes
  let deleted = 0;
  for (const device of offline) {
    try {
      await apiRequest('DELETE', `/api/v2/device/${device.id}`, apiKey);
      console.log(`  ✓ Deleted ${device.name}`);
      deleted++;
    } catch (e) {
      console.log(`  ✗ Failed to delete ${device.name}: ${e.message}`);
    }
  }

  console.log(`\n✅ Deleted ${deleted}/${offline.length} offline node(s).`);
}

function humanizeAge(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

module.exports = { runCleanup };

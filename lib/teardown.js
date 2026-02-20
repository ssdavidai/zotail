'use strict';

const fs = require('fs');
const readline = require('readline');
const {
  hasTailscaleProgram,
  removeTailscaleProgram,
  reloadSupervisor,
  stopTailscale,
} = require('./supervisor');

const SECRETS_FILE = '/root/.zo_secrets';
const STARTUP_SCRIPT = '/usr/local/bin/start-tailscale.sh';

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function removeSecret(name) {
  if (!fs.existsSync(SECRETS_FILE)) return;
  let content = fs.readFileSync(SECRETS_FILE, 'utf8');
  const regex = new RegExp(`^export ${name}=.*\\n?`, 'gm');
  content = content.replace(regex, '');
  fs.writeFileSync(SECRETS_FILE, content);
}

async function runTeardown() {
  console.log('\n🗑️  zo-tailscale teardown\n');

  const answer = await prompt('This will remove Tailscale sidecar from this workspace. Continue? [y/N] ');
  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    return;
  }

  // Stop tailscale via supervisor
  console.log('\nStopping Tailscale...');
  try {
    stopTailscale();
    console.log('✓ Tailscale stopped');
  } catch {
    console.log('  (was not running)');
  }

  // Remove supervisor config
  if (hasTailscaleProgram()) {
    removeTailscaleProgram();
    console.log('✓ Removed tailscale from supervisor config');
    try {
      reloadSupervisor();
      console.log('✓ Supervisor reloaded');
    } catch (e) {
      console.log('  Warning: Could not reload supervisor:', e.message);
    }
  } else {
    console.log('  Supervisor config already clean');
  }

  // Remove startup script
  if (fs.existsSync(STARTUP_SCRIPT)) {
    fs.unlinkSync(STARTUP_SCRIPT);
    console.log('✓ Removed ' + STARTUP_SCRIPT);
  }

  // Remove secrets
  removeSecret('TAILSCALE_AUTHKEY');
  removeSecret('TAILSCALE_API_KEY');
  console.log('✓ Removed Tailscale keys from ~/.zo_secrets');

  console.log('\n✅ Tailscale has been removed from this workspace.');
  console.log('   Note: The tailscale/tailscaled binaries were not removed.');
}

module.exports = { runTeardown };

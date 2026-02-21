'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
const {
  hasTailscaleProgram,
  injectTailscaleProgram,
  reloadSupervisor,
  getTailscaleStatus,
} = require('./supervisor');

const SECRETS_FILE = '/root/.zo_secrets';
const STARTUP_SCRIPT = '/usr/local/bin/start-tailscale.sh';
const TEMPLATE = path.join(__dirname, '..', 'templates', 'start-tailscale.sh');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function checkTailscaleBinary() {
  try {
    // Check tailscale client first (usually /usr/bin/tailscale),
    // then tailscaled daemon (often /usr/sbin/tailscaled which may
    // not be in PATH on Debian/Ubuntu).
    execSync('command -v tailscale || test -x /usr/sbin/tailscaled', { encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

function installTailscale() {
  console.log('  Installing Tailscale...');
  try {
    execSync('curl -fsSL https://tailscale.com/install.sh | sh', {
      stdio: 'inherit',
      timeout: 120000,
    });
    return checkTailscaleBinary();
  } catch (e) {
    console.error('  Failed to install Tailscale:', e.message);
    return false;
  }
}

function readSecrets() {
  if (!fs.existsSync(SECRETS_FILE)) return '';
  return fs.readFileSync(SECRETS_FILE, 'utf8');
}

function setSecret(name, value) {
  let content = readSecrets();
  const line = `export ${name}="${value}"`;
  const regex = new RegExp(`^export ${name}=.*$`, 'm');

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + '\n' + line + '\n';
  }

  fs.writeFileSync(SECRETS_FILE, content);
}

function getSecret(name) {
  const content = readSecrets();
  const match = content.match(new RegExp(`^export ${name}="?([^"\\n]*)"?`, 'm'));
  return match ? match[1] : null;
}

function writeStartupScript(hostname) {
  let template = fs.readFileSync(TEMPLATE, 'utf8');
  template = template.replace('__HOSTNAME__', hostname);
  fs.writeFileSync(STARTUP_SCRIPT, template, { mode: 0o755 });
}

function waitForTailscale(maxWait = 30) {
  for (let i = 0; i < maxWait; i++) {
    try {
      const result = execSync('tailscale status --json 2>/dev/null', {
        encoding: 'utf8',
        timeout: 5000,
      });
      const status = JSON.parse(result);
      if (status.BackendState === 'Running') return status;
    } catch {
      // not ready yet
    }
    execSync('sleep 1');
  }
  return null;
}

async function runSetup() {
  console.log('\n🔧 zo-tailscale setup\n');

  // Step 1: Check binary, install if missing
  if (!checkTailscaleBinary()) {
    console.log('tailscaled not found — installing Tailscale...');
    if (!installTailscale()) {
      console.error('Failed to install Tailscale. Please install it manually and try again.');
      process.exit(1);
    }
    console.log('✓ Tailscale installed');
  } else {
    console.log('✓ tailscaled binary found');
  }

  // Step 2: Auth key
  const existingKey = getSecret('TAILSCALE_AUTHKEY');
  let authKey;

  if (existingKey) {
    console.log(`✓ Using auth key from zo secrets (${existingKey.slice(0, 20)}...)`);
    authKey = existingKey;
  } else {
    authKey = await prompt('Enter your Tailscale auth key (https://login.tailscale.com/admin/settings/keys): ');
    if (!authKey || !authKey.startsWith('tskey-auth-')) {
      console.error('Invalid auth key. It should start with "tskey-auth-".');
      process.exit(1);
    }
  }

  // Step 3: Hostname
  const hostname = (await prompt('Hostname for this node [zo-workspace]: ')) || 'zo-workspace';

  // Step 4: Save auth key
  console.log('\nConfiguring...');
  setSecret('TAILSCALE_AUTHKEY', authKey);
  console.log('✓ Auth key saved to ~/.zo_secrets');

  // Step 5: Write startup script
  writeStartupScript(hostname);
  console.log('✓ Startup script written to ' + STARTUP_SCRIPT);

  // Step 6: Supervisor config
  if (hasTailscaleProgram()) {
    console.log('✓ Supervisor config already has tailscale program');
  } else {
    injectTailscaleProgram();
    console.log('✓ Injected tailscale program into supervisor config');
  }

  // Step 7: Reload supervisor
  console.log('\nStarting Tailscale...');
  try {
    reloadSupervisor();
    console.log('✓ Supervisor reloaded');
  } catch (e) {
    console.error('Warning: Could not reload supervisor:', e.message);
  }

  // Step 8: Wait for connection
  console.log('Waiting for Tailscale to connect...');
  const status = waitForTailscale();

  if (status) {
    const self = status.Self;
    console.log(`\n✅ Tailscale is connected!`);
    console.log(`   Hostname: ${self.HostName}`);
    console.log(`   IP:       ${self.TailscaleIPs ? self.TailscaleIPs[0] : 'N/A'}`);
    console.log(`   State:    ${status.BackendState}`);
  } else {
    console.log('\n⚠️  Tailscale did not connect within 30s.');
    console.log('   Check logs: cat /dev/shm/tailscale_err.log');
    console.log('   Supervisor: ' + getTailscaleStatus());
  }
}

module.exports = { runSetup, getSecret, setSecret, prompt };

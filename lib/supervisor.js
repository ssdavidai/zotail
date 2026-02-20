'use strict';

const fs = require('fs');
const { execSync } = require('child_process');

const SUPERVISOR_CONF = '/etc/zo/supervisord-user.conf';
const SUPERVISOR_URL = 'http://127.0.0.1:29011';
const PROGRAM_NAME = 'tailscale';

const TAILSCALE_BLOCK = `
[program:tailscale]
command=/usr/local/bin/start-tailscale.sh
directory=/root
autostart=true
autorestart=true
startretries=10
startsecs=5
stdout_logfile=/dev/shm/tailscale.log
stderr_logfile=/dev/shm/tailscale_err.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
stopsignal=TERM
stopasgroup=true
killasgroup=true
stopwaitsecs=10
`.trimStart();

function hasTailscaleProgram() {
  if (!fs.existsSync(SUPERVISOR_CONF)) return false;
  const content = fs.readFileSync(SUPERVISOR_CONF, 'utf8');
  return content.includes('[program:tailscale]');
}

function injectTailscaleProgram() {
  if (hasTailscaleProgram()) {
    return false; // already present
  }

  let content = fs.readFileSync(SUPERVISOR_CONF, 'utf8');

  // Find the first [program:*] section and insert before it
  const programMatch = content.match(/^(\[program:)/m);
  if (programMatch) {
    const idx = content.indexOf(programMatch[0]);
    content = content.slice(0, idx) + TAILSCALE_BLOCK + '\n' + content.slice(idx);
  } else {
    // No programs yet, append
    content = content.trimEnd() + '\n\n' + TAILSCALE_BLOCK;
  }

  fs.writeFileSync(SUPERVISOR_CONF, content);
  return true;
}

function removeTailscaleProgram() {
  if (!hasTailscaleProgram()) return false;

  let content = fs.readFileSync(SUPERVISOR_CONF, 'utf8');

  // Remove the [program:tailscale] block (from header to next section or EOF)
  const regex = /\[program:tailscale\][^\[]*(?=\[|$)/s;
  content = content.replace(regex, '');

  // Clean up extra blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(SUPERVISOR_CONF, content);
  return true;
}

function supervisorctl(cmd) {
  return execSync(`supervisorctl -s ${SUPERVISOR_URL} ${cmd}`, {
    encoding: 'utf8',
    timeout: 15000,
  }).trim();
}

function reloadSupervisor() {
  supervisorctl('reread');
  return supervisorctl('update');
}

function getTailscaleStatus() {
  try {
    return supervisorctl(`status ${PROGRAM_NAME}`);
  } catch (e) {
    return e.stdout || e.message;
  }
}

function stopTailscale() {
  try {
    return supervisorctl(`stop ${PROGRAM_NAME}`);
  } catch (e) {
    return e.stdout || e.message;
  }
}

module.exports = {
  SUPERVISOR_CONF,
  hasTailscaleProgram,
  injectTailscaleProgram,
  removeTailscaleProgram,
  reloadSupervisor,
  getTailscaleStatus,
  stopTailscale,
};

'use strict';

const { execSync } = require('child_process');
const { getTailscaleStatus } = require('./supervisor');

function runStatus() {
  console.log('\n📡 Tailscale Status\n');

  // Supervisor status
  const supervisorStatus = getTailscaleStatus();
  console.log(`Supervisor: ${supervisorStatus}`);

  // Tailscale status
  try {
    const jsonStr = execSync('tailscale status --json 2>/dev/null', {
      encoding: 'utf8',
      timeout: 5000,
    });
    const status = JSON.parse(jsonStr);
    const self = status.Self;

    console.log(`\nBackend:    ${status.BackendState}`);
    console.log(`Hostname:   ${self.HostName}`);
    console.log(`Tailnet:    ${status.MagicDNSSuffix || 'N/A'}`);

    if (self.TailscaleIPs) {
      console.log(`IPs:        ${self.TailscaleIPs.join(', ')}`);
    }

    // Show all nodes (self + peers)
    const peers = Object.values(status.Peer || {});
    const allNodes = [
      { ...self, _isSelf: true },
      ...peers,
    ];
    console.log(`\nNodes (${allNodes.length}):`);
    for (const node of allNodes) {
      const online = node.Online !== false ? '●' : '○';
      const ips = node.TailscaleIPs ? node.TailscaleIPs[0] : '';
      const label = node._isSelf ? `${node.HostName} (this node)` : node.HostName;
      const marker = node._isSelf ? '★' : online;
      console.log(`  ${marker} ${label.padEnd(30)} ${ips.padEnd(18)} ${node.OS || ''}`);
    }
  } catch {
    console.log('\nTailscale is not running or not connected.');
    console.log('Run "zo-tailscale setup" to configure.');
  }
}

module.exports = { runStatus };

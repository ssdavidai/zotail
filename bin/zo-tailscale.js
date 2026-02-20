#!/usr/bin/env node
'use strict';

const command = process.argv[2];

const USAGE = `
zo-tailscale — Tailscale sidecar for Zo workspaces

Usage:
  zo-tailscale setup      Interactive setup: install sidecar, connect to tailnet
  zo-tailscale status     Show Tailscale connection status
  zo-tailscale cleanup    Remove offline/stale nodes via Tailscale API
  zo-tailscale teardown   Remove Tailscale sidecar from this workspace
`;

async function main() {
  switch (command) {
    case 'setup': {
      const { runSetup } = require('../lib/setup');
      await runSetup();
      break;
    }
    case 'status': {
      const { runStatus } = require('../lib/status');
      await runStatus();
      break;
    }
    case 'cleanup': {
      const { runCleanup } = require('../lib/cleanup');
      await runCleanup();
      break;
    }
    case 'teardown': {
      const { runTeardown } = require('../lib/teardown');
      await runTeardown();
      break;
    }
    default:
      console.log(USAGE);
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});

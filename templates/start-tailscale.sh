#!/bin/bash
# Tailscale sidecar startup script
# Runs tailscaled in userspace networking mode and authenticates

set -e

source /root/.zo_secrets
# TAILSCALE_AUTHKEY is loaded from ~/.zo_secrets
TAILSCALE_STATE_DIR="/var/lib/tailscale"

mkdir -p "$TAILSCALE_STATE_DIR"

# Start tailscaled in userspace networking mode (no iptables/netfilter needed)
tailscaled --tun=userspace-networking --state="$TAILSCALE_STATE_DIR/tailscaled.state" --socket=/var/run/tailscale/tailscaled.sock &
DAEMON_PID=$!

# Wait for the socket to be ready
for i in $(seq 1 30); do
  if [ -S /var/run/tailscale/tailscaled.sock ]; then
    break
  fi
  sleep 1
done

# Authenticate and connect
tailscale up --authkey="$TAILSCALE_AUTHKEY" --hostname="__HOSTNAME__" --accept-routes

# Keep the script running as long as tailscaled is alive
wait $DAEMON_PID

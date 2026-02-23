#!/bin/bash
# Tailscale sidecar startup script
# Runs tailscaled in userspace networking mode and authenticates

set -e

source /root/.zo_secrets

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

# Determine authentication method
if [ -n "$TAILSCALE_ACCESS_TOKEN" ]; then
  # Use OAuth access token
  echo "Using OAuth access token for authentication..."
  tailscale up --authkey="$TAILSCALE_ACCESS_TOKEN" --hostname="__HOSTNAME__" --accept-routes
elif [ -n "$TAILSCALE_AUTHKEY" ]; then
  # Use legacy auth key
  echo "Using auth key for authentication..."
  tailscale up --authkey="$TAILSCALE_AUTHKEY" --hostname="__HOSTNAME__" --accept-routes
else
  echo "ERROR: No authentication method configured."
  echo "Please set either TAILSCALE_AUTHKEY or TAILSCALE_CLIENT_ID/TAILSCALE_CLIENT_SECRET"
  exit 1
fi

# Keep the script running as long as tailscaled is alive
wait $DAEMON_PID

# zotail

Connect your [Zo Computer](https://zo.computer) workspace to your private [Tailscale](https://tailscale.com) network. Access your workspace from any device on your tailnet — SSH, VS Code Remote, HTTP services, everything — without exposing ports to the public internet.

## Why Tailscale on Zo?

Zo workspaces are ephemeral cloud environments. By default, you access them through the browser. With Tailscale, your workspace joins your private mesh network and gets a stable IP address, so you can:

- **SSH directly** into your workspace from your laptop, phone, or any device on your tailnet
- **Access dev servers** (Next.js, Flask, Jupyter, etc.) without port forwarding or tunnels
- **Use VS Code Remote SSH** for a native editor experience connected to your Zo workspace
- **Connect to other machines** on your tailnet from inside Zo (databases, APIs, NAS, home servers)
- **Persist across reboots** — zotail configures supervisord so Tailscale auto-starts when your workspace restarts

## Quickstart

```bash
npx @ssdavidai/zotail setup
```

That's it. You'll be prompted for:

1. **Tailscale auth key** — get one at https://login.tailscale.com/admin/settings/keys (use a reusable key if you restart workspaces often)
2. **Hostname** — defaults to `zo-workspace`, shown in your tailnet

Once setup completes, your workspace appears on your tailnet and you can reach it from any device.

## OAuth Client Credentials (Recommended)

For production or long-term use, OAuth client credentials are recommended over auth keys. Unlike auth keys which expire after 90 days, OAuth credentials don't expire and can be revoked at any time from the Tailscale admin console.

### Setup

1. **Create an OAuth client** at https://login.tailscale.com/admin/settings/trust-credentials
   - Select the "Devices" scope with "Write" permission
   - Copy the Client ID and Client Secret

2. **Add credentials to Zo secrets** (in Settings > Advanced):
   ```
   TAILSCALE_CLIENT_ID=your-client-id
   TAILSCALE_CLIENT_SECRET=your-client-secret
   ```

3. **Run zotail setup** — it will automatically detect and use OAuth credentials
   ```bash
   npx @ssdavidai/zotail setup
   ```

### How it works

- OAuth credentials are exchanged for a short-lived access token via Tailscale's OAuth API
- The access token is stored in `~/.zo_secrets` as `TAILSCALE_ACCESS_TOKEN`
- On subsequent runs, the token is refreshed automatically
- If OAuth fails, zotail falls back to auth key (if configured)

### Migration from auth keys

To switch from auth keys to OAuth:
1. Add `TAILSCALE_CLIENT_ID` and `TAILSCALE_CLIENT_SECRET` to Zo secrets
2. Remove `TAILSCALE_AUTHKEY` from secrets (optional — OAuth takes precedence)
3. Run `zotail setup` to refresh the OAuth token

## Commands

### `zotail setup`

Interactive setup. Installs the Tailscale sidecar, saves your auth key or OAuth credentials, configures supervisord for auto-restart, and connects to your tailnet.

```bash
npx @ssdavidai/zotail setup
```

### `zotail status`

Shows your Tailscale connection status, IP addresses, and all nodes on your tailnet.

```bash
npx @ssdavidai/zotail status
```

```
📡 Tailscale Status

Supervisor: tailscale                        RUNNING   pid 37555, uptime 1:23:45

Backend:    Running
Hostname:   zo-workspace
Tailnet:    yourname.ts.net
IPs:        100.x.y.z

Nodes (3):
  ★ zo-workspace (this node)       100.x.y.z          linux
  ● my-laptop                      100.x.y.w          macOS
  ● my-phone                       100.x.y.v          iOS
```

### `zotail cleanup`

Remove stale/offline nodes from your tailnet. Useful when you've spun up many Zo workspaces and old ones are cluttering your device list. Requires a Tailscale API key.

```bash
npx @ssdavidai/zotail cleanup
```

### `zotail teardown`

Removes Tailscale from your workspace — stops the sidecar, removes the supervisor config, and cleans up stored keys.

```bash
npx @ssdavidai/zotail teardown
```

## Tips

- **Use OAuth client credentials for production.** Unlike auth keys which expire after 90 days, OAuth credentials don't expire and can be revoked at any time. See the OAuth section above for setup instructions.
- **Use a reusable auth key** (if not using OAuth). Zo workspaces restart between sessions. A reusable key means Tailscale reconnects automatically without re-auth.
- **Enable MagicDNS.** With MagicDNS on your tailnet, you can reach your workspace as `zo-workspace.yourname.ts.net` instead of remembering the IP.
- **SSH access.** Once connected, `ssh root@zo-workspace` (or whatever hostname you chose) works from any device on your tailnet.
- **Multiple workspaces.** Give each workspace a unique hostname during setup (e.g., `zo-project-a`, `zo-project-b`) so they don't conflict.
- **Cleanup regularly.** Ephemeral workspaces leave behind stale nodes. Run `zotail cleanup` periodically to keep your tailnet tidy.

## How It Works

Under the hood, zotail:

1. Stores your Tailscale auth key or OAuth credentials in `~/.zo_secrets`
2. For OAuth: exchanges client credentials for an access token via Tailscale's OAuth API
3. Writes a startup script to `/usr/local/bin/start-tailscale.sh` that runs `tailscaled` in userspace networking mode
4. Adds a `[program:tailscale]` entry to `/etc/zo/supervisord-user.conf` so the sidecar auto-starts and auto-restarts
5. Tailscale authenticates using either the auth key or OAuth access token and joins your tailnet

All operations are idempotent — running setup multiple times is safe.

## Requirements

- A Zo Computer workspace (Tailscale binaries are pre-installed)
- A Tailscale account with either:
  - An auth key (reusable recommended), or
  - OAuth client credentials (recommended for production)
- Node.js (pre-installed on Zo)

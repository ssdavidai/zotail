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

## Commands

### `zotail setup`

Interactive setup. Installs the Tailscale sidecar, saves your auth key, configures supervisord for auto-restart, and connects to your tailnet.

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

- **Use a reusable auth key.** Zo workspaces restart between sessions. A reusable key means Tailscale reconnects automatically without re-auth.
- **Enable MagicDNS.** With MagicDNS on your tailnet, you can reach your workspace as `zo-workspace.yourname.ts.net` instead of remembering the IP.
- **SSH access.** Once connected, `ssh root@zo-workspace` (or whatever hostname you chose) works from any device on your tailnet.
- **Multiple workspaces.** Give each workspace a unique hostname during setup (e.g., `zo-project-a`, `zo-project-b`) so they don't conflict.
- **Cleanup regularly.** Ephemeral workspaces leave behind stale nodes. Run `zotail cleanup` periodically to keep your tailnet tidy.

## How It Works

Under the hood, zotail:

1. Stores your Tailscale auth key in `~/.zo_secrets`
2. Writes a startup script to `/usr/local/bin/start-tailscale.sh` that runs `tailscaled` in userspace networking mode
3. Adds a `[program:tailscale]` entry to `/etc/zo/supervisord-user.conf` so the sidecar auto-starts and auto-restarts
4. Tailscale authenticates using your auth key and joins your tailnet

All operations are idempotent — running setup multiple times is safe.

## Requirements

- A Zo Computer workspace (Tailscale binaries are pre-installed)
- A Tailscale account with an auth key
- Node.js (pre-installed on Zo)

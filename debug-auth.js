const { execSync } = require('child_process');

try {
  const output = execSync('sudo tailscale status 2>&1', { encoding: 'utf8' });
  console.log('Output:', output);
  const match = output.match(/(https:\/\/login\.tailscale\.com\/[^\s]+)/);
  console.log('Match:', match);
} catch (e) {
  console.log('Error:', e.message);
}

const localtunnel = require('localtunnel');

(async () => {
  console.log('Starting tunnel on port 8090...');
  const tunnel = await localtunnel({ port: 8090 });
  console.log('\n========================================');
  console.log('TUNNEL URL: ' + tunnel.url);
  console.log('Expo Go URL: exp://' + tunnel.url.replace('https://', ''));
  console.log('========================================\n');
  console.log('Keep this window open. Press Ctrl+C to stop.');

  tunnel.on('error', (err) => console.error('Tunnel error:', err));
  tunnel.on('close', () => {
    console.log('Tunnel closed. Restart this script.');
    process.exit(1);
  });

  // Keep alive
  setInterval(() => {}, 1000);
})();

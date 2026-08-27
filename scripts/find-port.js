// Script to find the next available TCP port starting from a default port
import net from 'node:net';

function checkPort(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          resolve(false);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port, '0.0.0.0');
  });
}

async function findAvailablePort(startPort = 3000, maxScan = 50) {
  for (let p = startPort; p < startPort + maxScan; p++) {
    const isFree = await checkPort(p);
    if (isFree) {
      return p;
    }
  }
  return startPort;
}

const defaultStart = parseInt(process.env.PORT || '3000', 10) || 3000;
findAvailablePort(defaultStart).then((freePort) => {
  process.stdout.write(String(freePort));
  process.exit(0);
}).catch(() => {
  process.stdout.write('3000');
  process.exit(0);
});

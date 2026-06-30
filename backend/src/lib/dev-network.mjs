import os from 'os';

/** Endereços IPv4 da máquina (Wi‑Fi/Ethernet), úteis para acesso na rede local. */
export function getLanAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];

  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      const family = net.family === 'IPv4' || net.family === 4;
      if (family && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return [...new Set(addresses)];
}

export function logDevServerUrls({ label, port, host = '0.0.0.0' }) {
  console.log(`[${label}] Local:   http://localhost:${port}`);

  const exposeNetwork = host === '0.0.0.0' || host === '::' || host === '[::]';
  if (!exposeNetwork) {
    console.log(`[${label}] Bind:    http://${host}:${port}`);
    return;
  }

  const lan = getLanAddresses();
  if (!lan.length) {
    console.log(`[${label}] Network: (nenhuma interface IPv4 externa detectada)`);
    return;
  }

  for (const ip of lan) {
    console.log(`[${label}] Network: http://${ip}:${port}`);
  }
}

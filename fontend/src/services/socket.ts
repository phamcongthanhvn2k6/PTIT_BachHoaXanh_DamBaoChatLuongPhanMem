import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  const host = import.meta.env.VITE_API_HOST || '';
  if (!host) return 'http://127.0.0.1:3001';
  
  // Replace localhost with 127.0.0.1 to avoid Windows IPv6 resolution issues
  let cleanHost = host.replace('/api', '').trim();
  if (cleanHost.includes('localhost')) {
    cleanHost = cleanHost.replace('localhost', '127.0.0.1');
  }
  return cleanHost;
};

const SOCKET_URL = getSocketUrl();
console.log('[Socket] Initializing connection to:', SOCKET_URL);

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
  transports: ['websocket', 'polling'], // Fallback options
});

socket.on('connect', () => {
  console.log('[Socket] Connected successfully, ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err);
});

socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
});

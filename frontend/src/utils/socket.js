import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // Start with 1 second

export const initSocket = (token) => {
  // Disconnect existing socket if token changed
  if (socket && socket.connected) {
    const currentToken = socket.auth?.token;
    if (currentToken !== token) {
      socket.disconnect();
      socket = null;
    } else {
      return socket; // Already connected with same token
    }
  }

  // Create new socket connection
  // Use polling first, then upgrade to websocket if available
  // This prevents WebSocket connection errors when the server isn't ready
  const newSocket = io(SOCKET_URL, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    timeout: 20000,
    // Try polling first, then upgrade to websocket
    // This prevents "WebSocket is closed before connection is established" errors
    transports: ['polling', 'websocket'],
    upgrade: true,
    rememberUpgrade: true,
    forceNew: false,
    // Add additional options for better connection handling
    autoConnect: true,
  });

  // Store reference to avoid closure issues
  socket = newSocket;

  newSocket.on('connect', () => {
    // Use the socket instance from the event context to avoid null reference
    const connectedSocket = socket || newSocket;
    // Socket.id should be available immediately on connect event
    if (connectedSocket?.id) {
      reconnectAttempts = 0; // Reset on successful connection
    } else if (connectedSocket?.connected) {
      // Socket is connected - id will be available shortly
      reconnectAttempts = 0;
    }
  });

  newSocket.on('disconnect', (reason) => {
    const currentSocket = socket || newSocket;
    if (reason === 'io server disconnect' && currentSocket) {
      // Server disconnected the socket, reconnect manually
      currentSocket.connect();
    }
  });

  newSocket.on('connect_error', (error) => {
    // Don't log WebSocket errors as critical - they're expected
    // Socket.IO will automatically fall back to polling transport
    // WebSocket errors are normal when the server isn't ready or doesn't support WebSocket
    const isWebSocketError = error.message && (
      error.message.includes('WebSocket') || 
      error.message.includes('websocket') ||
      error.message.includes('closed before the connection is established')
    );
    
    if (!isWebSocketError) {
      console.error('Socket connection error:', error.message);
    }
    
    reconnectAttempts++;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('Max reconnection attempts reached. Socket.IO will continue trying in the background.');
    }
  });

  newSocket.on('reconnect', (attemptNumber) => {
    reconnectAttempts = 0;
  });

  newSocket.on('reconnect_attempt', (attemptNumber) => {
  });

  newSocket.on('reconnect_error', (error) => {
    // Don't log WebSocket errors as critical - they're expected
    if (error.message && !error.message.includes('WebSocket')) {
      console.error('Reconnection error:', error.message);
    }
  });

  newSocket.on('reconnect_failed', () => {
    console.error('Reconnection failed after all attempts');
  });

  return newSocket;
};

export const getSocket = () => {
  return socket;
};

// Export socket instance for direct access
export { socket };

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    reconnectAttempts = 0;
  }
};

export const reconnectSocket = (token) => {
  if (socket) {
    disconnectSocket();
  }
  return initSocket(token);
};

// Helper functions for socket events
export const joinTournament = (tournamentId) => {
  if (socket) {
    socket.emit('join-tournament', tournamentId);
  }
};

export const joinMatch = (matchId) => {
  if (socket) {
    socket.emit('join-match', matchId);
  }
};

export const onScoreUpdate = (callback) => {
  if (socket) {
    socket.on('score-updated', callback);
  }
};

export const onMatchStatusUpdate = (callback) => {
  if (socket) {
    socket.on('match-status-changed', callback);
  }
};

export const onNotification = (callback) => {
  if (socket) {
    socket.on('new-notification', callback);
  }
};


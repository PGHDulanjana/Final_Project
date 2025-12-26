const socketIO = require('socket.io');

let io;

const initializeSocket = (server) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ].filter(Boolean);

  io = socketIO(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? (process.env.FRONTEND_URL || allowedOrigins)
        : allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join tournament room
    socket.on('join-tournament', (tournamentId) => {
      socket.join(`tournament-${tournamentId}`);
      console.log(`Socket ${socket.id} joined tournament ${tournamentId}`);
    });

    // Join match room for live scoring
    socket.on('join-match', (matchId) => {
      socket.join(`match-${matchId}`);
      console.log(`Socket ${socket.id} joined match ${matchId}`);
    });

    // Handle live score updates
    socket.on('score-update', (data) => {
      io.to(`match-${data.matchId}`).emit('score-updated', data);
    });

    // Handle match status updates
    socket.on('match-status-update', (data) => {
      io.to(`match-${data.matchId}`).emit('match-status-changed', data);
      io.to(`tournament-${data.tournamentId}`).emit('match-status-changed', data);
    });

    // Handle chat messages
    socket.on('chat-message', (data) => {
      io.to(`user-${data.receiverId}`).emit('new-message', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Helper functions to emit events
const emitScoreUpdate = (matchId, scoreData) => {
  if (io) {
    io.to(`match-${matchId}`).emit('score-updated', scoreData);
    io.to(`tournament-${scoreData.tournamentId}`).emit('score-updated', scoreData);
  }
};

const emitMatchStatusUpdate = (matchId, tournamentId, statusData) => {
  if (io) {
    io.to(`match-${matchId}`).emit('match-status-changed', statusData);
    io.to(`tournament-${tournamentId}`).emit('match-status-changed', statusData);
  }
};

const emitNotification = (userId, notificationData) => {
  if (io) {
    io.to(`user-${userId}`).emit('new-notification', notificationData);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitScoreUpdate,
  emitMatchStatusUpdate,
  emitNotification
};


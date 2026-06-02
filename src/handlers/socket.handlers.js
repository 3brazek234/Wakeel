/**
 * Centralized socket event handlers
 */
export function registerSocketHandlers(io) {
  if (!io) throw new Error('io instance required');

  io.on('connection', (socket) => {
    console.info('socket connected', socket.id);

    socket.on('join_room', (payload) => {
      const { room } = payload || {};
      if (!room) return socket.emit('error', { message: 'room required' });
      socket.join(room);
      socket.emit('joined', { room });
    });

    socket.on('send_message', (msg) => {
      if (!msg || !msg.room || !msg.body) return socket.emit('error', { message: 'invalid message' });
      io.to(msg.room).emit('message', {
        id: `msg_${Date.now()}`,
        room: msg.room,
        body: msg.body,
        senderId: msg.senderId || socket.id,
        sentAt: new Date().toISOString(),
      });
    });

    socket.on('disconnect', (reason) => {
      console.info('socket disconnected', socket.id, reason);
    });
  });
}

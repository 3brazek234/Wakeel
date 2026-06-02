import { Server } from 'socket.io';

let io = null;
let _engine = null;

/**
 * Initialize the Socket.IO server singleton.
 * @param {object} engine - the bun-engine instance from @socket.io/bun-engine
 * @param {object} opts - options: { path, serverOptions }
 * @returns {import('socket.io').Server}
 */
export function initSocket(engine, opts = {}) {
  if (io) return io; // to prevent multiple initializations in hot reload scenarios

  if (!engine) {
    throw new Error('Socket Engine is required to initialize Socket.IO');
  }

  _engine = engine;

  io = new Server({ 
    path: opts.path || '/socket.io/', 
    ...(opts.serverOptions || {}) 
  });

  try {
    io.bind(_engine);
  } catch (error) {
    console.error('CRITICAL: Failed to bind Socket.IO to Bun Engine', error);
    throw error;
  }

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized - call initSocket(engine) first');
  }
  return io;
}

export function getEngine() {
  return _engine;
}
import { describe, it, expect, mock } from 'bun:test';

// Mock socket.io Server class
mock.module('socket.io', () => {
  return {
    Server: class FakeServer {
      constructor(opts) {
        this.opts = opts;
        this.bound = false;
      }
      bind(engine) {
        this.bound = true;
        this.engine = engine;
      }
      on() {}
      to() { return this; }
      emit() {}
    }
  };
});

import { initSocket, getIO } from './socket.service.js';

describe('socket.service singleton', () => {
  it('initializes and binds to engine', () => {
    const engine = { isFakeEngine: true };
    const io = initSocket(engine, { path: '/socket.io' });
    expect(io).toBeTruthy();
    // io.bind should have been called
    expect(io.bound).toBe(true);
    expect(io.engine).toBe(engine);
    // getIO returns same instance
    expect(getIO()).toBe(io);
  });

  it('getIO returns the initialized instance', () => {
    expect(typeof getIO()).toBe('object');
  });
});

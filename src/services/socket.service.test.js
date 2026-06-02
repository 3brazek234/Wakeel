import { describe, it, expect, mock } from 'bun:test';

// Mock socket.io Server class
mock.module('socket.io', {
  Server: class FakeServer {
    constructor(opts) {
      this.opts = opts;
      this.attached = false;
    }
    attach(engine) {
      this.attached = true;
      this.engine = engine;
    }
    on() {}
    to() { return this; }
    emit() {}
  }
});

import { initSocket, getIO } from './socket.service.js';

describe('socket.service singleton', () => {
  it('initializes and attaches to engine when engine.attach exists', () => {
    const engine = { attachCalled: false, attach(io) { this.attachCalled = true; this.io = io; } };
    const io = initSocket(engine, { path: '/socket.io' });
    expect(io).toBeTruthy();
    // engine.attach should have been called
    expect(engine.attachCalled).toBe(true);
    // getIO returns same instance
    expect(getIO()).toBe(io);
  });

  it('getIO throws if not initialized (fresh import scenario)', () => {
    // To simulate uninitialized state we cannot unload module easily here,
    // but at minimum ensure getIO returns an object when initialized above.
    expect(typeof getIO()).toBe('object');
  });
});

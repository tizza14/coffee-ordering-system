import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('socket.io-client', () => ({
  io: vi.fn()
}));

import { io } from 'socket.io-client';
import { useSocketStore } from './socket.store';
import { useNotificationStore } from './notification.store';
import type { Notification } from '../api/notification.api';

const mockedIo = vi.mocked(io);

type EventHandler = (...args: unknown[]) => void;

function createMockSocket() {
  const handlers: Record<string, EventHandler> = {};
  const socket = {
    connected: false,
    on: vi.fn().mockImplementation((event: string, handler: EventHandler) => {
      handlers[event] = handler;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    _handlers: handlers,
    _fire(event: string, ...args: unknown[]) {
      handlers[event]?.(...args);
    }
  };
  return socket;
}

describe('socketStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
  });

  it('connects to socket with auth token', () => {
    const mockSocket = createMockSocket();
    mockedIo.mockReturnValue(mockSocket as ReturnType<typeof io>);

    const socketStore = useSocketStore();
    socketStore.connect();

    expect(mockedIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ auth: expect.any(Object) })
    );
    expect(mockSocket.on).toHaveBeenCalledWith('order_updated', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('notification', expect.any(Function));
  });

  it('connects with guest credentials', () => {
    const mockSocket = createMockSocket();
    mockedIo.mockReturnValue(mockSocket as ReturnType<typeof io>);

    const socketStore = useSocketStore();
    socketStore.connect({ orderLookupCode: 'ABC123', guestToken: 'guest-token' });

    expect(mockedIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: expect.objectContaining({
          orderLookupCode: 'ABC123',
          guestToken: 'guest-token'
        })
      })
    );
  });

  it('does not reconnect if socket is already connected', () => {
    const mockSocket = createMockSocket();
    mockSocket.connected = true;
    mockedIo.mockReturnValue(mockSocket as ReturnType<typeof io>);

    const socketStore = useSocketStore();
    socketStore.connect();
    socketStore.connect();

    expect(mockedIo).toHaveBeenCalledTimes(1);
  });

  it('updates latestOrderUpdate when order_updated event fires', () => {
    const mockSocket = createMockSocket();
    mockedIo.mockReturnValue(mockSocket as ReturnType<typeof io>);

    const socketStore = useSocketStore();
    socketStore.connect();

    mockSocket._fire('order_updated', { id: 'o1', status: 'accepted' });

    expect(socketStore.latestOrderUpdate).toEqual({ id: 'o1', status: 'accepted' });
  });

  it('pushes notification to notification store when notification event fires', () => {
    const mockSocket = createMockSocket();
    mockedIo.mockReturnValue(mockSocket as ReturnType<typeof io>);

    const socketStore = useSocketStore();
    const notificationStore = useNotificationStore();
    socketStore.connect();

    const notif: Notification = {
      id: 'n1',
      orderId: 'o1',
      audience: 'user',
      type: 'order_status_updated',
      message: '訂單已接受',
      isRead: false,
      createdAt: new Date().toISOString()
    };

    mockSocket._fire('notification', notif);

    expect(notificationStore.items).toContainEqual(notif);
  });

  it('emits join_room when joinOrderRoom is called', () => {
    const mockSocket = createMockSocket();
    mockedIo.mockReturnValue(mockSocket as ReturnType<typeof io>);

    const socketStore = useSocketStore();
    socketStore.connect();
    socketStore.joinOrderRoom('order-id-1');

    expect(mockSocket.emit).toHaveBeenCalledWith('join_room', { room: 'room:order:order-id-1' });
  });

  it('disconnects socket and clears it', () => {
    const mockSocket = createMockSocket();
    mockedIo.mockReturnValue(mockSocket as ReturnType<typeof io>);

    const socketStore = useSocketStore();
    socketStore.connect();
    socketStore.disconnect();

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(socketStore.socket).toBeNull();
  });
});

import { io, Socket } from 'socket.io-client';
import { API_BASE } from './api';

let socket: Socket | null = null;
let isConnected = false;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true
  });

  socket.on('connect', () => {
    isConnected = true;
    console.log('[Socket] Connected to server');
  });

  socket.on('disconnect', () => {
    isConnected = false;
    console.log('[Socket] Disconnected from server');
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function isSocketConnected(): boolean {
  return isConnected;
}

// Event listeners
export function onChatMessage(callback: (msg: any) => void) {
  socket?.on('chat:message', callback);
  return () => socket?.off('chat:message', callback);
}

export function onFriendRequest(callback: (data: any) => void) {
  socket?.on('friend:request_received', callback);
  return () => socket?.off('friend:request_received', callback);
}

export function onFriendAccepted(callback: (data: any) => void) {
  socket?.on('friend:request_accepted', callback);
  return () => socket?.off('friend:request_accepted', callback);
}

export function onIslandVisitor(callback: (data: any) => void) {
  socket?.on('island:visitor', callback);
  return () => socket?.off('island:visitor', callback);
}

export function onIslandVisitData(callback: (data: any) => void) {
  socket?.on('island:visit_data', callback);
  return () => socket?.off('island:visit_data', callback);
}

export function onIslandVisitError(callback: (data: any) => void) {
  socket?.on('island:visit_error', callback);
  return () => socket?.off('island:visit_error', callback);
}

export function onPresenceStatus(callback: (statuses: Record<string, boolean>) => void) {
  socket?.on('presence:status', callback);
  return () => socket?.off('presence:status', callback);
}

export function onUserOnline(callback: (data: any) => void) {
  socket?.on('user:online', callback);
  return () => socket?.off('user:online', callback);
}

export function onUserOffline(callback: (data: any) => void) {
  socket?.on('user:offline', callback);
  return () => socket?.off('user:offline', callback);
}

// Emit events
export function emitChatSend(toId: string, content: string) {
  socket?.emit('chat:send', { toId, content });
}

export function emitIslandVisit(islandId: string) {
  socket?.emit('island:visit', { islandId });
}

export function emitFriendRequest(toId: string) {
  socket?.emit('friend:request', { toId });
}

export function emitFriendAccepted(toId: string) {
  socket?.emit('friend:accepted', { toId });
}

export function emitPresenceCheck(userIds: string[]) {
  socket?.emit('presence:check', { userIds });
}

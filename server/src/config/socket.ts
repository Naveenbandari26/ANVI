import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export function initializeSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // User joins their personal room
    socket.on('join_user_room', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    });

    // Handle call acceptance
    socket.on('accept_call', async (data: { callId: string; userId: string }) => {
      console.log(`📞 Call ${data.callId} accepted by user ${data.userId}`);
      socket.to(`user:${data.userId}`).emit('call_accepted', { callId: data.callId });
    });

    // Handle call decline
    socket.on('decline_call', async (data: { callId: string; userId: string }) => {
      console.log(`📞 Call ${data.callId} declined by user ${data.userId}`);
      socket.to(`user:${data.userId}`).emit('call_declined', { callId: data.callId });
    });

    // Handle audio stream data
    socket.on('audio_stream', (data: { callId: string; audioData: string; userId: string }) => {
      // Broadcast to backend handlers (will be processed by conversation service)
      socket.to(`call:${data.callId}`).emit('audio_received', data);
    });

    // Handle transcript updates
    socket.on('transcript_update', (data: { callId: string; transcript: string; userId: string }) => {
      socket.to(`call:${data.callId}`).emit('transcript_updated', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export { io };



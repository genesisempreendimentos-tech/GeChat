import { Server } from 'socket.io';
import { authenticateSocket } from './socket-auth.mjs';
import { registerSocketEvents, handleSocketConnection } from './socket-events.mjs';

export function createSocketServer(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const { userId, profile } = await authenticateSocket(socket, app.locals);
      socket.data.userId = userId;
      socket.data.profile = profile;
      next();
    } catch (err) {
      next(new Error(err?.message ?? 'Não autenticado.'));
    }
  });

  io.on('connection', async (socket) => {
    try {
      await handleSocketConnection(io, socket, app.locals);
      registerSocketEvents(io, socket);
    } catch (err) {
      console.error('[socket] connection handler:', err);
      socket.disconnect(true);
    }
  });

  app.locals.io = io;

  return io;
}

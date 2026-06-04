import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import express from 'express';
import connectDB from './config/db.js';
import { Server } from 'socket.io';

import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment Selection
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : 
                process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

const requiredEnvs = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvs = requiredEnvs.filter(e => !process.env[e]);
if (missingEnvs.length > 0) {
  console.error(`[startup] ❌ Fatal: Missing required environment variables: ${missingEnvs.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

const start = async () => {
  console.log('[startup] Loading environment variables...');
  console.log(`[startup] PORT=${PORT} | FRONTEND_URL=${process.env.FRONTEND_URL || 'http://localhost:5173'} | MONGODB_URI=${process.env.MONGODB_URI ? 'set' : 'missing'}`);
  console.log('[AI] OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
  console.log('[AI] GEMINI_RECIPE_KEY exists:', !!process.env.GEMINI_RECIPE_KEY);

  let app;
  try {
    console.log('[startup] Importing app routes...');
    const appModule = await import('./app.js');
    app = appModule.default;
    console.log('[startup] App routes imported successfully.');
  } catch (err) {
    console.error('[startup] Failed to import app routes:', err);
    app = express();
    app.use(express.json());
    app.get('/api/health', (req, res) => {
      res.status(500).json({
        success: false,
        message: 'Server started in degraded mode (route import failed).',
        error: err?.message || 'Unknown route import error',
      });
    });
  }

  console.log('[startup] Connecting MongoDB...');
  const mongoConnected = await connectDB();
  if (!mongoConnected) {
    console.warn('[startup] MongoDB is not connected. Server will continue in degraded mode.');
  }

  console.log('[startup] Initializing Queue Service...');
  try {
    const { initQueueService } = await import('./services/queueService.js');
    await initQueueService();
  } catch (err) {
    console.warn('[startup] Queue Service initialization failed:', err.message);
  }

  console.log('[startup] Creating HTTP server...');
  const server = http.createServer(app);

  console.log('[startup] Attaching Socket.IO...');
  try {
    const io = new Server(server, {
      cors: {
        origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
      },
    });

    global.io = io; // Make io globally accessible without cyclic imports
    app.set('io', io);

    io.on('connection', (socket) => {
      socket.on('join_user', (userId) => {
        if (userId) {
          socket.join(`user_${userId}`);
          console.log(`Socket ${socket.id} joined user_${userId}`);
        }
      });
      socket.on('join_ticket', (ticketId) => {
        socket.join(ticketId);
      });
      socket.on('leave_ticket', (ticketId) => {
        socket.leave(ticketId);
      });
    });

    console.log('[startup] Socket.IO attached successfully.');
  } catch (err) {
    console.error('[startup] Socket.IO initialization failed:', err);
  }

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`[startup] Port ${PORT} is already in use.`);
      return;
    }
    console.error('[startup] HTTP server error:', err);
  });

  console.log('[startup] Starting HTTP listener...');
  const activeServer = server.listen(PORT, () => {
    console.log(`Lotte Mart API running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[startup] Server status: app=${app ? 'loaded' : 'fallback'} | mongo=${mongoConnected ? 'connected' : 'disconnected'} | socket=initialized`);
  });

  // Graceful Shutdown
  const shutdown = async (signal) => {
    console.log(`\n[startup] Received ${signal}. Closing HTTP server...`);
    activeServer.close(async () => {
      console.log('[startup] HTTP server closed.');
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log('[startup] MongoDB connection closed safely.');
      }
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      console.error('[startup] ❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('[startup] Fatal startup error:', err);
});



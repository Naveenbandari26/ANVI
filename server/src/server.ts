import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { connectDatabase } from './config/database';
import { initializeSocket } from './config/socket';
import { initializeSchedules } from './services/schedule.service';
import { initializeTTSService } from './services/tts.service';
import apiRoutes from './routes';

// Load environment variables
dotenv.config();

// Verify JWT_SECRET is set on startup
import { getJWTSecret } from './config/jwt';
getJWTSecret(); // This will log the JWT_SECRET status

const app: Application = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet());

// CORS: in development allow any origin so React Native (Expo) on LAN can connect
const corsOrigin = NODE_ENV === 'development'
  ? true
  : (process.env.CORS_ORIGIN || 'http://localhost:8081');
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Debug middleware to log all incoming requests
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.originalUrl} (path: ${req.path})`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize Socket.io
initializeSocket(httpServer);

// Start server with database connection
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Initialize TTS service connection (non-blocking)
    initializeTTSService().catch((error) => {
      console.warn('⚠️  Telugu TTS service connection failed:', error.message);
      console.warn('📝 Make sure Python TTS service is running');
      console.warn('   Run: cd server/tts-service && python app.py');
    });

    // Initialize scheduled calls
    await initializeSchedules();

    // Bind to 0.0.0.0 so React Native on same LAN (e.g. 192.168.1.58) can connect
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${NODE_ENV}`);
      console.log(`🔗 Local:   http://localhost:${PORT}/health`);
      console.log(`🔗 LAN:     http://0.0.0.0:${PORT} (use your PC's IP, e.g. http://192.168.1.x:${PORT})`);
      console.log(`🔌 WebSocket server initialized`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;


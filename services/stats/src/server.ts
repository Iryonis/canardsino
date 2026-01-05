// services/stats/src/server.ts
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import statsRoutes from './routes/statsRoutes';
import { eventConsumer } from './events/consumer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8005;

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, Last-Event-ID');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'stats',
    mongodb: mongoose.connection.readyState === 1,
    uptime: process.uptime(),
  });
});

// Routes
app.use('/stats', statsRoutes);

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    const dbName = process.env.MONGO_DB_NAME || 'casino_stats';
    
    // Build connection string properly
    let connectionUrl: string;
    if (mongoUrl.includes('?')) {
      // URL has query params: insert DB name before the query string
      const [baseUrl, queryString] = mongoUrl.split('?');
      connectionUrl = `${baseUrl}/${dbName}?${queryString}`;
    } else {
      // No query params: just append DB name
      connectionUrl = `${mongoUrl}/${dbName}`;
    }
    
    await mongoose.connect(connectionUrl);
    console.log('✅ Connected to MongoDB:', dbName);

    // Connect to RabbitMQ consumer (non-blocking, will retry on failure)
    eventConsumer.connect().catch(err => {
      console.error('⚠️ Initial RabbitMQ connection failed, will retry:', err.message);
    });

    app.listen(PORT, () => {
      console.log(`\n📊 Stats Service running on port ${PORT}`);
      console.log(`\nEndpoints:`);
      console.log(`  GET  /stats/stream          - SSE real-time stats`);
      console.log(`  GET  /stats/user/:userId    - User stats`);
      console.log(`  GET  /stats/history/:userId - Game history`);
      console.log(`  GET  /stats/dashboard       - SSE dashboard`);
      console.log(`  GET  /health                - Health check\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await eventConsumer.disconnect();
  await mongoose.disconnect();
  process.exit(0);
});
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'casino_auth';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

// Error handling middleware
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(`${MONGO_URL}/${MONGO_DB_NAME}?authSource=admin`);
    console.log(`Connected to MongoDB: ${MONGO_DB_NAME}`);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Auth service listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

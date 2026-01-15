import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { pricePublisher } from './events/publisher';
import { priceConsumer } from './events/consumer';
import { priceScheduler } from './services/scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8007;

app.use(cors());
app.use(express.json());

app.use('/prices', routes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'coinmarketcap' });
});

async function startServer(): Promise<void> {
  try {
    await pricePublisher.connect();
    console.log('Publisher connected');

    await priceConsumer.connect();
    console.log('Consumer connected');

    await priceScheduler.start();
    console.log('Scheduler started');

    app.listen(PORT, () => {
      console.log(`CoinMarketCap service running on port ${PORT}`);
      console.log('Endpoints:');
      console.log(`  GET /prices/quotes    - All crypto prices`);
      console.log(`  GET /prices/:symbol   - Single crypto price`);
      console.log(`  GET /prices/supported - Supported cryptos`);
      console.log(`  GET /prices/health    - Cache health check`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  priceScheduler.stop();
  await pricePublisher.disconnect();
  await priceConsumer.disconnect();
  process.exit(0);
});

startServer();

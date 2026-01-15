import { cmcService } from './cmcService';
import { pricePublisher } from '../events/publisher';

const FETCH_INTERVAL = parseInt(process.env.FETCH_INTERVAL || '60000', 10);

class PriceScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting price scheduler (interval: ${FETCH_INTERVAL}ms)`);

    await this.fetchAndPublish();

    this.intervalId = setInterval(() => {
      this.fetchAndPublish();
    }, FETCH_INTERVAL);
  }

  private async fetchAndPublish(): Promise<void> {
    try {
      console.log('Fetching crypto prices from CMC...');
      const quotes = await cmcService.fetchQuotes();

      await pricePublisher.publishPriceUpdate(quotes);
      console.log(`Published ${quotes.length} prices to RabbitMQ`);
    } catch (error) {
      console.error('Failed to fetch/publish prices:', error);
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Price scheduler stopped');
  }
}

export const priceScheduler = new PriceScheduler();

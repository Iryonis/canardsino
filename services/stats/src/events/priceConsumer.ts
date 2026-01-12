import amqp, { ChannelModel, Channel } from 'amqplib';
import { priceCache } from '../cache/priceCache';

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const PRICES_EXCHANGE = 'prices.events';

interface PriceEvent {
  type: string;
  payload: {
    quotes: Array<{
      symbol: string;
      price: number;
      percentChange24h: number;
    }>;
  };
  timestamp: string;
}

class PriceConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    try {
      console.log('Connecting to RabbitMQ for prices:', RABBIT_URL);

      this.connection = await amqp.connect(RABBIT_URL);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(PRICES_EXCHANGE, 'fanout', { durable: false });

      const { queue } = await this.channel.assertQueue('', { exclusive: true });

      await this.channel.bindQueue(queue, PRICES_EXCHANGE, '');

      console.log('Price consumer connected to RabbitMQ');

      this.channel.consume(queue, (msg) => {
        if (!msg) return;

        try {
          const event: PriceEvent = JSON.parse(msg.content.toString());

          if (event.type === 'price.updated') {
            priceCache.setPrices(event.payload.quotes);
          }

          this.channel?.ack(msg);
        } catch (error) {
          console.error('Error processing price event:', error);
          this.channel?.nack(msg, false, false);
        }
      });

      this.connection.on('error', (err) => {
        console.error('Price consumer connection error:', err);
        this.reconnect();
      });

      this.connection.on('close', () => {
        console.log('Price consumer connection closed, reconnecting...');
        this.reconnect();
      });
    } catch (error) {
      console.error('Failed to connect price consumer:', error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    this.connection = null;
    this.channel = null;

    setTimeout(() => {
      console.log('Attempting to reconnect price consumer...');
      this.connect();
    }, 5000);
  }

  async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('Price consumer disconnected');
    } catch (error) {
      console.error('Error disconnecting price consumer:', error);
    }
  }
}

export const priceConsumer = new PriceConsumer();

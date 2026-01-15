import amqp, { Channel, ChannelModel } from 'amqplib';
import { CryptoQuote, PriceEvent } from '../types';

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const RABBIT_EXCHANGE = 'prices.events';

class PricePublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    try {
      console.log('Connecting to RabbitMQ (publisher):', RABBIT_URL);
      this.connection = await amqp.connect(RABBIT_URL);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(RABBIT_EXCHANGE, 'fanout', { durable: false });

      console.log('RabbitMQ publisher ready');

      this.connection.on('error', (err) => {
        console.error('RabbitMQ publisher error:', err);
        this.reconnect();
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ publisher connection closed');
        this.reconnect();
      });
    } catch (error) {
      console.error('Failed to connect publisher to RabbitMQ:', error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    this.connection = null;
    this.channel = null;

    setTimeout(() => {
      console.log('Attempting to reconnect publisher...');
      this.connect();
    }, 5000);
  }

  async publishPriceUpdate(quotes: CryptoQuote[]): Promise<void> {
    if (!this.channel) {
      console.warn('Publisher channel not ready, skipping publish');
      return;
    }

    const event: PriceEvent = {
      type: 'price.updated',
      payload: { quotes },
      timestamp: new Date().toISOString(),
    };

    this.channel.publish(
      RABBIT_EXCHANGE,
      '',
      Buffer.from(JSON.stringify(event)),
      { contentType: 'application/json' }
    );

    console.log(`Published price update for ${quotes.length} cryptos`);
  }

  async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('Publisher disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error disconnecting publisher:', error);
    }
  }
}

export const pricePublisher = new PricePublisher();

import amqp, { Channel, ChannelModel } from 'amqplib';
import { PriceEvent } from '../types';
import { priceCache } from '../cache';

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const RABBIT_EXCHANGE = 'prices.events';

class PriceConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    try {
      console.log('Connecting to RabbitMQ (consumer):', RABBIT_URL);
      this.connection = await amqp.connect(RABBIT_URL);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(RABBIT_EXCHANGE, 'fanout', { durable: false });

      const { queue } = await this.channel.assertQueue('', { exclusive: true });

      await this.channel.bindQueue(queue, RABBIT_EXCHANGE, '');

      console.log('RabbitMQ consumer ready, listening on queue:', queue);

      this.channel.consume(queue, (msg) => {
        if (!msg) return;

        try {
          const event: PriceEvent = JSON.parse(msg.content.toString());
          console.log(`Received event: ${event.type}`);

          this.handleEvent(event);

          this.channel?.ack(msg);
        } catch (error) {
          console.error('Error processing event:', error);
          this.channel?.nack(msg, false, false);
        }
      });

      this.connection.on('error', (err) => {
        console.error('RabbitMQ consumer error:', err);
        this.reconnect();
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ consumer connection closed');
        this.reconnect();
      });
    } catch (error) {
      console.error('Failed to connect consumer to RabbitMQ:', error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    this.connection = null;
    this.channel = null;

    setTimeout(() => {
      console.log('Attempting to reconnect consumer...');
      this.connect();
    }, 5000);
  }

  private async handleEvent(event: PriceEvent): Promise<void> {
    if (event.type === 'price.updated') {
      await priceCache.setQuotes(event.payload.quotes);
      console.log(`Updated cache with ${event.payload.quotes.length} prices`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('Consumer disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error disconnecting consumer:', error);
    }
  }
}

export const priceConsumer = new PriceConsumer();

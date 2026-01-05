import amqp, { ChannelModel, Channel } from 'amqplib';
import { sseManager } from '../sse/manager';
import { StatsAggregator } from '../aggregators/statsAggregator';

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const RABBIT_EXCHANGE = process.env.RABBIT_EXCHANGE || 'game.events';

interface GameEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export class EventConsumer {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    try {
      console.log('🔌 Connecting to RabbitMQ:', RABBIT_URL);
      
      this.connection = await amqp.connect(RABBIT_URL);
      this.channel = await this.connection.createChannel();

      // Assert fanout exchange
      await this.channel.assertExchange(RABBIT_EXCHANGE, 'fanout', { durable: false });

      // Create exclusive queue (deleted when consumer disconnects)
      const { queue } = await this.channel.assertQueue('', { exclusive: true });

      // Bind queue to exchange
      await this.channel.bindQueue(queue, RABBIT_EXCHANGE, '');

      console.log('✅ Stats consumer connected to RabbitMQ');
      console.log(`📨 Listening for events on queue: ${queue}`);

      // Start consuming
      this.channel.consume(queue, (msg) => {
        if (!msg) return;

        try {
          const event: GameEvent = JSON.parse(msg.content.toString());
          console.log(`📨 Received event: ${event.type}`);
          
          this.handleEvent(event);
          
          this.channel?.ack(msg);
        } catch (error) {
          console.error('❌ Error processing event:', error);
          this.channel?.nack(msg, false, false);
        }
      });

      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err);
        this.reconnect();
      });

      this.connection.on('close', () => {
        console.log('⚠️ RabbitMQ connection closed, reconnecting...');
        this.reconnect();
      });

    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    this.connection = null;
    this.channel = null;
    
    setTimeout(() => {
      console.log('🔄 Attempting to reconnect to RabbitMQ...');
      this.connect();
    }, 5000);
  }

  private async handleEvent(event: GameEvent): Promise<void> {
    const { type, payload } = event;

    switch (type) {

      case 'game.completed':
        await this.handleGameCompleted(payload);
        break;

    
      default:
        console.log(`Unknown event type: ${type}`);
    }
  }

  /**
   * Handle a game completed even. Get the updated stats and send via SSE.
   * @param payload 
   */
  private async handleGameCompleted(payload: any): Promise<void> {
    const { userId, gameId, totalBet, totalWin, netResult, winningNumber } = payload;

    try {
      const stats = await StatsAggregator.getUserStats(userId);

      sseManager.sendEvent(userId, 'game-completed', {
        gameId,
        result: {
          totalBet,
          totalWin,
          netResult,
          winningNumber,
        },
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }


  async disconnect(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('✅ Disconnected from RabbitMQ');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  }
}

export const eventConsumer = new EventConsumer();
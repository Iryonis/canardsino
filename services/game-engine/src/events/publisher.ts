import amqp from 'amqplib';

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const RABBIT_EXCHANGE = process.env.RABBIT_EXCHANGE || 'game.events';

let channelPromise: Promise<amqp.Channel> | null = null;

async function getChannel(): Promise<amqp.Channel> {
  if (channelPromise) return channelPromise;

  channelPromise = (async () => {
    try {
      console.log('Connecting to RabbitMQ:', RABBIT_URL);
      const connection = await amqp.connect(RABBIT_URL);
      const channel = await connection.createChannel();
      
      await channel.assertExchange(RABBIT_EXCHANGE, 'fanout', { durable: false });
      
      console.log('RabbitMQ publisher ready');

      connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
        channelPromise = null;
      });

      connection.on('close', () => {
        console.log('RabbitMQ connection closed');
        channelPromise = null;
      });

      return channel;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      channelPromise = null;
      throw error;
    }
  })();

  return channelPromise;
}

export async function publishEvent(type: string, payload: any = {}): Promise<void> {
  try {
    const channel = await getChannel();
    const message = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    channel.publish(
      RABBIT_EXCHANGE,
      '', 
      Buffer.from(JSON.stringify(message)),
      { contentType: 'application/json' }
    );

    console.log(`Published event: ${type}`, payload.userId || '');
  } catch (error) {
    console.error('Failed to publish event:', error);
  }
}


export async function publishGameCompleted(data: {
  userId: string;
  gameId: string;
  gameType: string;
  totalBet: number;
  totalWin: number;
  netResult: number;
  winningNumber?: number;
  winningColor?: string;
  bets?: any[];
}): Promise<void> {
  await publishEvent('game.completed', data);
}
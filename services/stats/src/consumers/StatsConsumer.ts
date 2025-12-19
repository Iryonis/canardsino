import amqp, { Channel, Connection } from 'amqplib';
import { sseManager } from '../sse/SSEManager';
import { StatsAggregator } from '../aggregators/StatsAggregator';

export class StatsConsumer {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private readonly RABBITMQ_URL: string;


    private readonly QUEUES = {
        GAME_FINISHED: 'game.finished',
        BET_PLACED: 'bet.placed',
        WALLET_UPDATE: 'wallet.update',
    };

    constructor() {
        this.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    }

    /**
     * Connect to RabbitMQ and setup consumers
     */
    async connect(): Promise<void> {
        try {
            this.connection = await amqp.connect(this.RABBITMQ_URL);
            this.channel = await this.connection.createChannel();

            // Setup exchange
            await this.channel.assertExchange('casino_events', 'topic', { durable: true });

            // Setup queues
            await this.setupGameFinishedQueue();
            await this.setupBetPlacedQueue();
            await this.setupWalletUpdateQueue();


            // Handle connection errors
            this.connection.on('error', (err) => {
                console.error('❌ RabbitMQ connection error:', err);
            });

            this.connection.on('close', () => {
                console.log('🔌 RabbitMQ connection closed, reconnecting...');
                setTimeout(() => this.connect(), 5000);
            });

        } catch (error) {
            console.error('❌ Failed to connect to RabbitMQ:', error);
            setTimeout(() => this.connect(), 5000);
        }
    }

    /**
     * Setup queue for game finished events
     */
    private async setupGameFinishedQueue(): Promise<void> {
        if (!this.channel) return;

        const queueName = this.QUEUES.GAME_FINISHED;
        await this.channel.assertQueue(queueName, { durable: true });
        await this.channel.bindQueue(queueName, 'casino_events', 'game.finished.#');

        this.channel.consume(queueName, async (msg) => {
            if (!msg) return;

            try {
                const event = JSON.parse(msg.content.toString());
                console.log('📊 Game finished event:', event);

                // Update stats in database
                await StatsAggregator.updateGameStats(event);

                // Broadcast updated stats via SSE
                const updatedStats = await StatsAggregator.getGlobalStats();
                sseManager.broadcast({
                    type: 'stats.update',
                    data: updatedStats,
                    timestamp: new Date().toISOString(),
                });

                // Send personalized stats to the player
                if (event.userId) {
                    const userStats = await StatsAggregator.getUserStats(event.userId);
                    sseManager.sendToUser(event.userId, {
                        type: 'user.stats.update',
                        data: userStats,
                        timestamp: new Date().toISOString(),
                    });
                }

                this.channel!.ack(msg);
            } catch (error) {
                console.error('Error processing game finished event:', error);
                this.channel!.nack(msg, false, false); // Don't requeue
            }
        });

        console.log(`✅ Listening to queue: ${queueName}`);
    }

    /**
     * Setup queue for bet placed events
     */
    private async setupBetPlacedQueue(): Promise<void> {
        if (!this.channel) return;

        const queueName = this.QUEUES.BET_PLACED;
        await this.channel.assertQueue(queueName, { durable: true });
        await this.channel.bindQueue(queueName, 'casino_events', 'bet.placed.#');

        this.channel.consume(queueName, async (msg) => {
            if (!msg) return;

            try {
                const event = JSON.parse(msg.content.toString());
                console.log('💰 Bet placed event:', event);

                // Update bet statistics
                await StatsAggregator.updateBetStats(event);

                // Broadcast live bet stats
                const liveStats = await StatsAggregator.getLiveBetStats();
                sseManager.broadcast({
                    type: 'bet.stats.update',
                    data: liveStats,
                    timestamp: new Date().toISOString(),
                });

                this.channel!.ack(msg);
            } catch (error) {
                console.error('Error processing bet placed event:', error);
                this.channel!.nack(msg, false, false);
            }
        });

        console.log(`✅ Listening to queue: ${queueName}`);
    }

    /**
     * Setup queue for wallet update events
     */
    private async setupWalletUpdateQueue(): Promise<void> {
        if (!this.channel) return;

        const queueName = this.QUEUES.WALLET_UPDATE;
        await this.channel.assertQueue(queueName, { durable: true });
        await this.channel.bindQueue(queueName, 'casino_events', 'wallet.#');

        this.channel.consume(queueName, async (msg) => {
            if (!msg) return;

            try {
                const event = JSON.parse(msg.content.toString());
                console.log('👛 Wallet update event:', event);

                // Update wallet statistics
                await StatsAggregator.updateWalletStats(event);

                // Send to specific user
                if (event.userId) {
                    const userWalletStats = await StatsAggregator.getUserWalletStats(event.userId);
                    sseManager.sendToUser(event.userId, {
                        type: 'wallet.stats.update',
                        data: userWalletStats,
                        timestamp: new Date().toISOString(),
                    });
                }

                this.channel!.ack(msg);
            } catch (error) {
                console.error('Error processing wallet update event:', error);
                this.channel!.nack(msg, false, false);
            }
        });

        console.log(`✅ Listening to queue: ${queueName}`);
    }

    /**
     * Close RabbitMQ connection
     */
    async close(): Promise<void> {
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
        console.log('Stats Consumer disconnected from RabbitMQ');
    }
}

// Singleton instance
export const statsConsumer = new StatsConsumer();
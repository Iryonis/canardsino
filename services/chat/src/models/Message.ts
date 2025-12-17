import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  type: 'system' | 'chat';
  username?: string;
  message: string;
  timestamp: Date;
}

const MessageSchema = new Schema<IMessage>({
  type: {
    type: String,
    enum: ['system', 'chat'],
    required: true,
  },
  username: {
    type: String,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

MessageSchema.index({ timestamp: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
}

const MessageSchema = new Schema<IMessage>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index pour trier les messages par date
MessageSchema.index({ timestamp: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

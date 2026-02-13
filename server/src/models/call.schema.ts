import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  userId: mongoose.Types.ObjectId;
  scheduledTime: Date;
  status: 'scheduled' | 'ringing' | 'accepted' | 'declined' | 'completed' | 'missed';
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  conversationId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'ringing', 'accepted', 'declined', 'completed', 'missed'],
      default: 'scheduled',
      required: true,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      min: 0,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
  },
  {
    timestamps: true,
  }
);

CallSchema.index({ userId: 1, scheduledTime: -1 });
CallSchema.index({ status: 1, scheduledTime: 1 });

export const CallModel = mongoose.model<ICall>('Call', CallSchema);



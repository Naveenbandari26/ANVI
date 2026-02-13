import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  callId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: Date;
  scheduledTime?: Date;
  completedAt?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    callId: {
      type: Schema.Types.ObjectId,
      ref: 'Call',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
    },
    scheduledTime: {
      type: Date,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

TaskSchema.index({ userId: 1, status: 1, scheduledTime: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });

export const TaskModel = mongoose.model<ITask>('Task', TaskSchema);



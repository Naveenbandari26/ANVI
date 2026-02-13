import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  userId: mongoose.Types.ObjectId;
  callId: mongoose.Types.ObjectId;
  messages: IConversationMessage[];
  transcript: string; // Full transcript text
  summary?: string;
  emotionalState?: string;
  keyTopics?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMessageSchema: Schema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ConversationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    callId: {
      type: Schema.Types.ObjectId,
      ref: 'Call',
      required: true,
      unique: true,
    },
    messages: {
      type: [ConversationMessageSchema],
      default: [],
    },
    transcript: {
      type: String,
      default: '',
    },
    summary: {
      type: String,
    },
    emotionalState: {
      type: String,
    },
    keyTopics: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ userId: 1, createdAt: -1 });

export const ConversationModel = mongoose.model<IConversation>('Conversation', ConversationSchema);



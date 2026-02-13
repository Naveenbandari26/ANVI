import mongoose, { Schema, Document } from 'mongoose';

export interface IDevice extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: 'ios' | 'android' | 'other';
  type: 'voip' | 'fcm' | 'apns' | 'push' | string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'other'],
      required: true,
    },
    type: {
      type: String,
      required: true,
      default: 'push',
    },
  },
  { timestamps: true }
);

DeviceSchema.index({ userId: 1, token: 1 }, { unique: true });

export const DeviceModel = mongoose.model<IDevice>('Device', DeviceSchema);

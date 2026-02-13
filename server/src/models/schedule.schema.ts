import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  userId: mongoose.Types.ObjectId;
  name?: string;
  time: string; // Time in HH:mm format (e.g., "09:00", "14:30")
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  timezone: string;
  isActive: boolean;
  lastTriggered?: Date;
  nextTrigger?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    time: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
    },
    daysOfWeek: {
      type: [Number],
      required: true,
      validate: {
        validator: (days: number[]) => {
          return days.every((day) => day >= 0 && day <= 6) && days.length > 0;
        },
        message: 'Days must be between 0 (Sunday) and 6 (Saturday)',
      },
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggered: {
      type: Date,
    },
    nextTrigger: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ScheduleSchema.index({ userId: 1, isActive: 1 });
ScheduleSchema.index({ isActive: 1, nextTrigger: 1 });

export const ScheduleModel = mongoose.model<ISchedule>('Schedule', ScheduleSchema);



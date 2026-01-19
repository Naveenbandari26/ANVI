import cron from 'node-cron';
import { ScheduleModel, ISchedule } from '../models/schedule.schema';
import { CallModel } from '../models/call.schema';
import { io } from '../config/socket';

// Store active cron jobs
const activeCronJobs = new Map<string, cron.ScheduledTask>();

/**
 * Calculate next trigger time for a schedule
 */
export function calculateNextTrigger(schedule: ISchedule): Date {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  // Get current day of week (0 = Sunday, 6 = Saturday)
  const currentDay = now.getDay();
  
  // Find next scheduled day
  const sortedDays = [...schedule.daysOfWeek].sort((a, b) => a - b);
  let nextDay = sortedDays.find(day => day > currentDay);
  
  // If no day found in current week, use first day of next week
  if (!nextDay) {
    nextDay = sortedDays[0];
  }
  
  const daysUntilNext = nextDay > currentDay 
    ? nextDay - currentDay 
    : (7 - currentDay) + nextDay;
  
  const nextTrigger = new Date(now);
  nextTrigger.setDate(now.getDate() + daysUntilNext);
  nextTrigger.setHours(hours, minutes, 0, 0);
  
  // If it's today and time hasn't passed, use today
  if (daysUntilNext === 0 && nextTrigger > now) {
    return nextTrigger;
  }
  
  // If time has passed today, move to next occurrence
  if (nextTrigger <= now) {
    nextTrigger.setDate(nextTrigger.getDate() + 7);
  }
  
  return nextTrigger;
}

/**
 * Create a scheduled call
 */
export async function createScheduledCall(userId: string, scheduledTime: Date): Promise<any> {
  try {
    const call = await CallModel.create({
      userId,
      scheduledTime,
      status: 'scheduled',
    });
    
    return call;
  } catch (error) {
    console.error('Error creating scheduled call:', error);
    throw error;
  }
}

/**
 * Trigger a call for a user
 */
export async function triggerCall(schedule: ISchedule): Promise<void> {
  try {
    const scheduledTime = new Date();
    
    // Create call record
    const call = await CallModel.create({
      userId: schedule.userId,
      scheduledTime,
      status: 'ringing',
    });
    
    // Update schedule
    schedule.lastTriggered = new Date();
    schedule.nextTrigger = calculateNextTrigger(schedule);
    await schedule.save();
    
    // Emit call event to user via WebSocket
    io.to(`user:${schedule.userId}`).emit('incoming_call', {
      callId: call._id.toString(),
      scheduledTime: call.scheduledTime,
    });
    
    console.log(`📞 Triggered call for user ${schedule.userId}, call ID: ${call._id}`);
  } catch (error) {
    console.error('Error triggering call:', error);
  }
}

/**
 * Start cron job for a schedule
 */
export function startScheduleCron(schedule: ISchedule): void {
  const scheduleId = schedule._id.toString();
  
  // Stop existing cron if any
  stopScheduleCron(scheduleId);
  
  if (!schedule.isActive) {
    return;
  }
  
  // Build cron expression: minute hour * * dayOfWeek
  // Convert days of week: 0=Sunday in cron, but we use 0=Sunday too
  const daysCron = schedule.daysOfWeek.join(',');
  const [hours, minutes] = schedule.time.split(':');
  
  // Cron format: minute hour dayOfMonth month dayOfWeek
  const cronExpression = `${minutes} ${hours} * * ${daysCron}`;
  
  const task = cron.schedule(cronExpression, async () => {
    try {
      // Refresh schedule from DB to get latest data
      const freshSchedule = await ScheduleModel.findById(schedule._id);
      if (freshSchedule && freshSchedule.isActive) {
        await triggerCall(freshSchedule);
      }
    } catch (error) {
      console.error(`Error in cron job for schedule ${scheduleId}:`, error);
    }
  }, {
    scheduled: true,
    timezone: schedule.timezone || 'UTC',
  });
  
  activeCronJobs.set(scheduleId, task);
  
  // Calculate and update next trigger
  schedule.nextTrigger = calculateNextTrigger(schedule);
  schedule.save().catch(console.error);
  
  console.log(`✅ Started cron job for schedule ${scheduleId}: ${cronExpression}`);
}

/**
 * Stop cron job for a schedule
 */
export function stopScheduleCron(scheduleId: string): void {
  const task = activeCronJobs.get(scheduleId);
  if (task) {
    task.stop();
    activeCronJobs.delete(scheduleId);
    console.log(`⏹️  Stopped cron job for schedule ${scheduleId}`);
  }
}

/**
 * Initialize all active schedules on server start
 */
export async function initializeSchedules(): Promise<void> {
  try {
    const schedules = await ScheduleModel.find({ isActive: true });
    
    for (const schedule of schedules) {
      startScheduleCron(schedule);
    }
    
    console.log(`✅ Initialized ${schedules.length} active schedules`);
  } catch (error) {
    console.error('Error initializing schedules:', error);
  }
}

/**
 * Update schedule and restart cron if needed
 */
export async function updateSchedule(schedule: ISchedule): Promise<void> {
  if (schedule.isActive) {
    startScheduleCron(schedule);
  } else {
    stopScheduleCron(schedule._id.toString());
  }
}



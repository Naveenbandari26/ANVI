/**
 * Display a full-screen call notification on Android using Notifee.
 * Notifee is required lazily to avoid startup crash if the native module fails.
 */
import { Platform } from 'react-native';

const CALL_CHANNEL_ID = 'com.anvi.call.fullscreen';

function getNotifee(): any {
  try {
    return require('@notifee/react-native').default;
  } catch {
    return null;
  }
}

export async function ensureCallChannel() {
  if (Platform.OS !== 'android') return;
  const notifee = getNotifee();
  if (!notifee) return;
  const { AndroidImportance } = require('@notifee/react-native');
  await notifee.createChannel({
    id: CALL_CHANNEL_ID,
    name: 'Incoming Calls',
    importance: AndroidImportance.HIGH,
    sound: 'mixkit-sci-fi-click-900.mp3',
    vibration: true,
    visibility: 1,
  });
}

/**
 * Show a full-screen call notification. On Android this triggers the
 * full-screen intent so the call UI appears over other apps immediately.
 */
export async function showFullScreenCallNotification(callId: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  const notifee = getNotifee();
  if (!notifee) return;
  try {
    await ensureCallChannel();
    const { AndroidCategory, AndroidImportance } = require('@notifee/react-native');
    await notifee.displayNotification({
      id: `incoming-call-${callId}`,
      title: 'Incoming Call',
      body: 'ANVI is calling you...',
      android: {
        channelId: CALL_CHANNEL_ID,
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        fullScreenAction: {
          id: 'incoming-call',
        },
        data: { callId, type: 'INCOMING_CALL' },
        smallIcon: 'ic_notification',
        sound: 'mixkit-sci-fi-click-900.mp3',
      },
      data: { callId, type: 'INCOMING_CALL' },
    });
  } catch (error) {
    console.error('Error showing full-screen call notification:', error);
  }
}

/**
 * Get the notification that launched the app (e.g. from full-screen intent).
 */
export async function getLaunchNotification(): Promise<{ callId: string } | null> {
  try {
    const notifee = getNotifee();
    if (!notifee) return null;
    const initial = await notifee.getInitialNotification();
    if (!initial?.notification?.data) return null;
    const data = initial.notification.data as { callId?: string; type?: string };
    if (data?.type === 'INCOMING_CALL' && data?.callId) {
      return { callId: data.callId };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cancel the full-screen call notification (e.g. after user answers or declines).
 */
export async function cancelCallNotification(callId: string): Promise<void> {
  try {
    const notifee = getNotifee();
    if (!notifee) return;
    await notifee.cancelNotification(`incoming-call-${callId}`);
  } catch (error) {
    console.warn('Error canceling call notification:', error);
  }
}

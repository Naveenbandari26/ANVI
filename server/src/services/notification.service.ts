import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { UserModel } from '../models/user.schema';

const expo = new Expo();

export async function sendCallNotification(userId: string, callId: string) {
    try {
        const user = await UserModel.findById(userId);
        if (!user || !user.pushToken) {
            console.log(`No push token for user ${userId}, skipping notification`);
            return;
        }

        if (!Expo.isExpoPushToken(user.pushToken)) {
            console.error(`Push token ${user.pushToken} is not a valid Expo push token`);
            return;
        }

        const messages: ExpoPushMessage[] = [{
            to: user.pushToken,
            sound: 'mixkit-sci-fi-click-900.mp3',
            title: 'Incoming Call',
            body: 'ANVI is calling you...',
            data: { callId, type: 'INCOMING_CALL' },
            priority: 'high',
            // On Android, this helps show the notification as a heads-up alert
            channelId: 'calls',
            categoryId: 'incoming-call',
        }];

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Push notification sent successfully:', ticketChunk);
            } catch (error) {
                console.error('Error sending push notification chunk:', error);
            }
        }
    } catch (error) {
        console.error('Error in sendCallNotification:', error);
    }
}

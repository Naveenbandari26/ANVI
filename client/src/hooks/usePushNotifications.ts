import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        // Properties required for newer SDKs (53+)
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Define notification categories
Notifications.setNotificationCategoryAsync('incoming-call', [
    {
        identifier: 'accept',
        buttonTitle: 'Accept',
        options: { opensAppToForeground: true },
    },
    {
        identifier: 'decline',
        buttonTitle: 'Decline',
        options: { opensAppToForeground: false },
    },
]);

export const usePushNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const notificationListener = useRef<Notifications.Subscription>(null);
    const responseListener = useRef<Notifications.Subscription>(null);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            setExpoPushToken(token);
            if (token) {
                updatePushTokenOnServer(token);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const { actionIdentifier, notification } = response;
            const callId = notification.request.content.data.callId;

            if (actionIdentifier === 'accept') {
                // The app will foreground itself because of opensAppToForeground: true
                // The CallOverlay will handle showing the call screen
                console.log('User accepted call from notification');
            } else if (actionIdentifier === 'decline') {
                // Handle decline logic (e.g., call API to decline)
                if (callId) {
                    api.post(`/v1/calls/${callId}/decline`).catch(console.error);
                }
            }
        });

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    const updatePushTokenOnServer = async (token: string) => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (userId) {
                await api.put(`/v1/users/${userId}`, { pushToken: token });
                console.log('Push token updated on server');
            }
        } catch (error) {
            console.error('Error updating push token on server:', error);
        }
    };

    return { expoPushToken };
};

export const scheduleIncomingCallNotification = async (callId: string) => {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Incoming Call',
                body: 'ANVI is calling you...',
                data: { callId, type: 'INCOMING_CALL' },
                categoryIdentifier: 'incoming-call',
                color: '#6366f1',
                sound: 'mixkit-sci-fi-click-900.mp3',
                // For Android, this ensures it peeks
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null, // Send immediately
        });
    } catch (error) {
        console.error('Error scheduling local notification:', error);
    }
};

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('calls', {
            name: 'Calls',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 500, 500, 500, 500],
            lightColor: '#6366f1',
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'mixkit-sci-fi-click-900.mp3',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        // For SDK 53+, projectId is required.
        // It's typically found in Constants.expoConfig.extra.eas.projectId
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;

        if (!projectId) {
            console.warn('⚠️ No projectId found. Skipping Expo Push Token retrieval.');
            return;
        }

        try {
            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;
            console.log('Expo Push Token:', token);
        } catch (e) {
            console.error('Error getting push token:', e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { CallOverlay } from '@/src/components/call/CallOverlay';
import { emitIncomingCall } from '@/src/events/incomingCallEvents';

export const unstable_settings = {
  initialRouteName: 'splash',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  usePushNotifications();

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification?.request?.content?.data as { type?: string; callId?: string; scheduledTime?: string } | undefined;
      if (data?.type === 'INCOMING_CALL' && data?.callId) {
        emitIncomingCall({ callId: data.callId, scheduledTime: data.scheduledTime || new Date().toISOString() });
      }
    }).catch(() => {});

    const t = setTimeout(() => {
      import('@/src/services/fullScreenCallNotification').then(({ getLaunchNotification }) => {
        getLaunchNotification().then((payload) => {
          if (payload?.callId) {
            emitIncomingCall({ callId: payload.callId, scheduledTime: new Date().toISOString() });
          }
        }).catch(() => {});
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <CallOverlay />
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../src/services/auth.service';
import { initializeSocket } from '../src/config/socket';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is already logged in
        const token = await authService.getStoredToken();
        
        if (token) {
          // User is logged in, initialize socket and go to main app
          try {
            await initializeSocket();
            router.replace('/(tabs)/timeline');
          } catch (error) {
            console.error('Error initializing socket:', error);
            // Still navigate even if socket fails
            router.replace('/(tabs)/timeline');
          }
        } else {
          // User is not logged in, go to login
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        router.replace('/login');
      }
    };

    // Small delay for splash screen
    const timer = setTimeout(() => {
      checkAuth();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>ANVI</Text>
        <Text style={styles.tagline}>
          Your AI companion that calls, listens, remembers, and organizes your life
        </Text>
        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 16,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  loader: {
    marginTop: 32,
  },
});



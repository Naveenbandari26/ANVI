import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { callService } from '../../services/call.service';
import { getSocket } from '../../config/socket';

const { width } = Dimensions.get('window');

interface IncomingCallModalProps {
  visible: boolean;
  callId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  visible,
  callId,
  onAccept,
  onDecline,
}) => {
  const [ringAnimation] = useState(new Animated.Value(1));
  const [userId, setUserId] = useState<string | null>(null);
  const ringtoneRef = React.useRef<Audio.Sound | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userId').then(setUserId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const startRinging = async () => {
      try {
        if (visible) {
          // Play ringtone
          const { sound } = await Audio.Sound.createAsync(
            require('../../../assets/sounds/mixkit-sci-fi-click-900.mp3'),
            { shouldPlay: true, isLooping: true }
          );
          if (isMounted) {
            ringtoneRef.current = sound;
          } else {
            sound.unloadAsync();
          }

          // Start ringing animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(ringAnimation, {
                toValue: 1.2,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(ringAnimation, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ).start();

          // Haptic feedback
          const hapticInterval = setInterval(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }, 1000);

          return () => {
            clearInterval(hapticInterval);
            if (ringtoneRef.current) {
              ringtoneRef.current.stopAsync();
              ringtoneRef.current.unloadAsync();
              ringtoneRef.current = null;
            }
          };
        }
      } catch (error) {
        console.error('Error playing ringtone:', error);
      }
    };

    const cleanup = startRinging();

    return () => {
      isMounted = false;
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [visible]);

  const handleAccept = () => {
    onAccept();
  };

  const handleDecline = () => {
    onDecline();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.avatarContainer,
              { transform: [{ scale: ringAnimation }] },
            ]}
          >
            <View style={styles.avatar}>
              <Ionicons name="person" size={80} color="#6366f1" />
            </View>
          </Animated.View>

          <Text style={styles.name}>ANVI</Text>
          <Text style={styles.status}>Incoming call...</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Ionicons name="call" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    width: width * 0.9,
  },
  avatarContainer: {
    marginBottom: 40,
  },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#6366f1',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  status: {
    fontSize: 18,
    color: '#94a3b8',
    marginBottom: 60,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
});


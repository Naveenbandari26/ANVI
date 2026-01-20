import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { callService, Call } from '../../services/call.service';
import { ScheduleCallModal } from './ScheduleCallModal';

interface ScheduledCallsViewProps {
  onCallPress?: (call: Call) => void;
}

export const ScheduledCallsView: React.FC<ScheduledCallsViewProps> = ({
  onCallPress,
}) => {
  const [scheduledCalls, setScheduledCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const loadScheduledCalls = async () => {
    try {
      const calls = await callService.getUserCalls('scheduled');
      // Filter to only show future scheduled calls
      const futureCalls = calls.filter((call) => {
        const scheduledTime = parseISO(call.scheduledTime);
        return !isPast(scheduledTime) || scheduledTime.getTime() > Date.now();
      });
      // Sort by scheduled time (earliest first)
      futureCalls.sort((a, b) => 
        parseISO(a.scheduledTime).getTime() - parseISO(b.scheduledTime).getTime()
      );
      setScheduledCalls(futureCalls);
    } catch (error) {
      // Error handled by axios interceptor - silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Only load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadScheduledCalls();
      
      // Refresh every minute to update time displays
      const interval = setInterval(() => {
        loadScheduledCalls();
      }, 60000);

      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadScheduledCalls();
  };

  const formatScheduledTime = (scheduledTime: string) => {
    const date = parseISO(scheduledTime);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy • h:mm a');
    }
  };

  const getTimeUntilCall = (scheduledTime: string) => {
    const date = parseISO(scheduledTime);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs < 0) return null;
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else {
      return 'Starting soon';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6366f1" />
        <Text style={styles.loadingText}>Loading scheduled calls...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {scheduledCalls.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="calendar-outline" size={64} color="#334155" />
          </View>
          <Text style={styles.emptyTitle}>No scheduled calls</Text>
          <Text style={styles.emptySubtext}>
            Schedule a call to get started
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowScheduleModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.createButtonContent}>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.createButtonText}>Schedule a Call</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#6366f1"
              />
            }
          >
            {scheduledCalls.map((call) => {
              const timeUntil = getTimeUntilCall(call.scheduledTime);
              const scheduledDate = parseISO(call.scheduledTime);
              const isUpcoming = scheduledDate.getTime() > Date.now();
              
              return (
                <TouchableOpacity
                  key={call._id}
                  style={styles.callCard}
                  onPress={() => onCallPress?.(call)}
                  activeOpacity={0.9}
                >
                  <View style={styles.callCardContent}>
                    <View style={styles.callCardHeader}>
                      <View style={styles.callIconWrapper}>
                        <View style={styles.callIconContainer}>
                          <Ionicons name="call" size={20} color="#6366f1" />
                        </View>
                        {isUpcoming && (
                          <View style={styles.upcomingBadge}>
                            <View style={styles.upcomingDot} />
                          </View>
                        )}
                      </View>
                      <View style={styles.callCardInfo}>
                        <Text style={styles.callCardTitle}>Scheduled Call</Text>
                        <Text style={styles.callCardDate}>
                          {formatScheduledTime(call.scheduledTime)}
                        </Text>
                      </View>
                    </View>
                    {timeUntil && (
                      <View style={styles.timeUntilContainer}>
                        <Ionicons name="time-outline" size={14} color="#6366f1" />
                        <Text style={styles.timeUntilText}>{timeUntil}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowScheduleModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
            <Text style={styles.addButtonText}>Schedule Another Call</Text>
          </TouchableOpacity>
        </>
      )}
      <ScheduleCallModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onScheduleCreated={() => {
          setShowScheduleModal(false);
          loadScheduledCalls();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 160,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  createButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  callCard: {
    backgroundColor: '#1e293b',
    marginRight: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    width: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  callCardContent: {
    padding: 20,
  },
  callCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  callIconWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  callIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  upcomingBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  upcomingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  callCardInfo: {
    flex: 1,
    paddingTop: 4,
  },
  callCardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  callCardDate: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  timeUntilContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  timeUntilText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  addButtonText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

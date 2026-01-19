import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { callService, Call } from '../../services/call.service';
import { diaryService, DiaryEntry } from '../../services/diary.service';
import { taskService, Task } from '../../services/task.service';

interface TimelineItem {
  id: string;
  type: 'call' | 'diary' | 'task';
  date: Date;
  data: Call | DiaryEntry | Task;
}

export const TimelineView: React.FC = () => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTimeline = async () => {
    try {
      const [calls, diaries, tasks] = await Promise.all([
        callService.getUserCalls(),
        diaryService.getDiaryEntries(),
        taskService.getTasks(),
      ]);

      const timelineItems: TimelineItem[] = [
        ...calls.map((call) => ({
          id: call._id,
          type: 'call' as const,
          date: parseISO(call.scheduledTime),
          data: call,
        })),
        ...diaries.map((diary) => ({
          id: diary._id,
          type: 'diary' as const,
          date: parseISO(diary.createdAt),
          data: diary,
        })),
        ...tasks.map((task) => ({
          id: task._id,
          type: 'task' as const,
          date: parseISO(task.createdAt),
          data: task,
        })),
      ];

      // Sort by date (newest first)
      timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

      setItems(timelineItems);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTimeline();
  };

  const renderItem = (item: TimelineItem) => {
    switch (item.type) {
      case 'call':
        const call = item.data as Call;
        return (
          <View style={styles.item}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="call"
                size={24}
                color={call.status === 'completed' ? '#10b981' : '#6366f1'}
              />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>Call with ANVI</Text>
              <Text style={styles.subtitle}>
                {format(item.date, 'MMM d, yyyy h:mm a')} • {call.status}
              </Text>
              {call.duration && (
                <Text style={styles.meta}>Duration: {Math.floor(call.duration / 60)}m</Text>
              )}
            </View>
          </View>
        );

      case 'diary':
        const diary = item.data as DiaryEntry;
        return (
          <View style={styles.item}>
            <View style={styles.iconContainer}>
              <Ionicons name="book" size={24} color="#f59e0b" />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>Diary Entry</Text>
              <Text style={styles.subtitle}>
                {format(item.date, 'MMM d, yyyy')} • {diary.mood}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {diary.summary}
              </Text>
            </View>
          </View>
        );

      case 'task':
        const task = item.data as Task;
        return (
          <View style={styles.item}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={task.status === 'completed' ? '#10b981' : '#6366f1'}
              />
            </View>
            <View style={styles.content}>
              <Text style={styles.title}>{task.title}</Text>
              <Text style={styles.subtitle}>
                {format(item.date, 'MMM d, yyyy')} • {task.priority} priority
              </Text>
              {task.dueDate && (
                <Text style={styles.meta}>
                  Due: {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                </Text>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={64} color="#64748b" />
          <Text style={styles.emptyText}>No timeline items yet</Text>
          <Text style={styles.emptySubtext}>
            Your calls, diary entries, and tasks will appear here
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <TouchableOpacity key={item.id}>{renderItem(item)}</TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  description: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 4,
  },
  meta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
});



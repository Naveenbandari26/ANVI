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
import { diaryService, DiaryEntry } from '../../src/services/diary.service';

export default function DiaryScreen() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = async () => {
    try {
      const data = await diaryService.getDiaryEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error loading diary entries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading diary entries...</Text>
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
      {entries.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={64} color="#64748b" />
          <Text style={styles.emptyText}>No diary entries yet</Text>
          <Text style={styles.emptySubtext}>
            Your diary entries from conversations will appear here
          </Text>
        </View>
      ) : (
        entries.map((entry) => (
          <View key={entry._id} style={styles.entry}>
            <View style={styles.header}>
              <Text style={styles.date}>
                {format(parseISO(entry.createdAt), 'MMM d, yyyy')}
              </Text>
              <View style={styles.moodBadge}>
                <Text style={styles.moodText}>{entry.mood}</Text>
              </View>
            </View>
            <Text style={styles.summary}>{entry.summary}</Text>
            <Text style={styles.entryText}>{entry.entry}</Text>
            {entry.keyReflections.length > 0 && (
              <View style={styles.reflections}>
                <Text style={styles.reflectionsTitle}>Key Reflections:</Text>
                {entry.keyReflections.map((reflection, index) => (
                  <Text key={index} style={styles.reflectionItem}>
                    • {reflection}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

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
  entry: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    color: '#94a3b8',
    fontSize: 14,
  },
  moodBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  summary: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  entryText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  reflections: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  reflectionsTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  reflectionItem: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
});



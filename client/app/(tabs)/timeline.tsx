import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TimelineView } from '../../src/components/timeline/TimelineView';
import { ScheduledCallsView } from '../../src/components/call/ScheduledCallsView';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TimelineScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.scheduledCallsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Scheduled Calls</Text>
          </View>
          <ScheduledCallsView />
        </View>
        <View style={styles.timelineSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color="#6366f1" />
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>
          <TimelineView />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  scheduledCallsSection: {
    marginBottom: 24,
  },
  timelineSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});



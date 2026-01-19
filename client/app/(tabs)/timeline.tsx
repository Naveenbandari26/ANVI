import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TimelineView } from '../../src/components/timeline/TimelineView';
import { useCallManager } from '../../src/hooks/useCallManager';
import { IncomingCallModal } from '../../src/components/call/IncomingCallModal';
import { ActiveCallScreen } from '../../src/components/call/ActiveCallScreen';

export default function TimelineScreen() {
  const {
    incomingCall,
    activeCall,
    activeConversation,
    acceptCall,
    declineCall,
    endCall,
  } = useCallManager();

  if (activeCall && activeConversation) {
    return (
      <ActiveCallScreen
        callId={activeCall}
        conversationId={activeConversation}
        onEndCall={() => endCall(activeCall)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <TimelineView />
      {incomingCall && (
        <IncomingCallModal
          visible={!!incomingCall}
          callId={incomingCall.callId}
          onAccept={() => acceptCall(incomingCall.callId)}
          onDecline={() => declineCall(incomingCall.callId)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});



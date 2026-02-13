import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { useCallManager } from '../../hooks/useCallManager';
import { IncomingCallModal } from './IncomingCallModal';
import { ActiveCallScreen } from './ActiveCallScreen';

export const CallOverlay: React.FC = () => {
    const {
        incomingCall,
        activeCall,
        activeConversation,
        acceptCall,
        declineCall,
        endCall,
        useNativeOverlay,
        nativeOverlayFailed,
    } = useCallManager();

    const showIncomingCallModal = incomingCall && (!useNativeOverlay || nativeOverlayFailed);

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Incoming Call Modal - full screen when socket or push triggers incoming call */}
            {showIncomingCallModal && (
                <IncomingCallModal
                    visible={true}
                    callId={incomingCall.callId}
                    onAccept={() => acceptCall(incomingCall.callId)}
                    onDecline={() => declineCall(incomingCall.callId)}
                />
            )}

            {/* Active Call Modal */}
            {activeCall && activeConversation && (
                <Modal
                    visible={true}
                    animationType="slide"
                    transparent={false}
                    statusBarTranslucent
                >
                    <ActiveCallScreen
                        callId={activeCall}
                        conversationId={activeConversation}
                        onEndCall={() => endCall(activeCall)}
                    />
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});

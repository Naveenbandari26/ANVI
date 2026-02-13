/**
 * Exclude CallKeep only (causes startup crash). Notifee is used for
 * full-screen call overlay over other apps and is loaded only when a call arrives.
 */
module.exports = {
  dependencies: {
    'react-native-callkeep': { platforms: { android: null, ios: null } },
  },
};

/**
 * Exclude native modules that cause startup crash on Android.
 * Their JS is still in node_modules; only native linking is disabled.
 */
module.exports = {
  dependencies: {
    'react-native-callkeep': { platforms: { android: null, ios: null } },
    '@notifee/react-native': { platforms: { android: null, ios: null } },
  },
};

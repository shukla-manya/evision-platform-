/**
 * Merges app.json with optional Google Maps keys from the environment (Android + iOS).
 * Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) before `expo prebuild` / EAS build.
 */
const appJson = require('./app.json');

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      config: {
        ...(appJson.expo.android?.config || {}),
        googleMaps: {
          ...(appJson.expo.android?.config?.googleMaps || {}),
          apiKey: googleMapsApiKey || appJson.expo.android?.config?.googleMaps?.apiKey || '',
        },
      },
    },
    ios: {
      ...appJson.expo.ios,
      config: {
        ...(appJson.expo.ios?.config || {}),
        googleMapsApiKey: googleMapsApiKey || appJson.expo.ios?.config?.googleMapsApiKey || '',
      },
    },
  },
};

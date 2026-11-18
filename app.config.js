function configureMaps(platformConfig, apiKey) {
  const result = { ...platformConfig };
  const config = { ...result.config };
  if (apiKey) config.googleMaps = { apiKey };
  else delete config.googleMaps;
  if (Object.keys(config).length) result.config = config;
  else delete result.config;
  return result;
}

module.exports = ({ config }) => {
  const ios = configureMaps(config.ios || {}, process.env.GOOGLE_MAPS_IOS_API_KEY);
  if (process.env.IOS_BUNDLE_IDENTIFIER) ios.bundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER;
  const redirectScheme = process.env.EXPO_PUBLIC_GOOGLE_NATIVE_REDIRECT_URI?.split(':')[0];

  return {
    ...config,
    scheme: redirectScheme || config.scheme || 'quickmatatu',
    plugins: [...(config.plugins || []), 'expo-web-browser'],
    ios,
    android: configureMaps(config.android || {}, process.env.GOOGLE_MAPS_ANDROID_API_KEY),
  };
};

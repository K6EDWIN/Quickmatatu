function configureMaps(platformConfig, apiKey) {
  const result = { ...platformConfig };
  const config = { ...result.config };
  if (apiKey) config.googleMaps = { apiKey };
  else delete config.googleMaps;
  if (Object.keys(config).length) result.config = config;
  else delete result.config;
  return result;
}

module.exports = ({ config }) => ({
  ...config,
  ios: configureMaps(config.ios || {}, process.env.GOOGLE_MAPS_IOS_API_KEY),
  android: configureMaps(config.android || {}, process.env.GOOGLE_MAPS_ANDROID_API_KEY),
});

// Components/PlatformMap.js
// Platform-aware map: Leaflet on web, react-native-maps on Android/iOS
import { Platform } from 'react-native';

let PlatformMap;

if (Platform.OS === 'web') {
  PlatformMap = require('./PlatformMap.web').default;
} else {
  PlatformMap = require('./PlatformMap.native').default;
}

export default PlatformMap;

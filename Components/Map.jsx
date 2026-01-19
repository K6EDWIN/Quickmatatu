import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Animated, Image } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

// 1. Setup Location Permissions
const requestLocationPermission = async () => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return null;
    }
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
};

Mapbox.setAccessToken('pk.eyJ1IjoibXVuZ2FpIiwiYSI6ImNtMnRreWd2djAzcHAybHNidms4a251bXYifQ.LY23Gbdw_yBwvH8hD2eRmQ');

const Map = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [activeMatatus, setActiveMatatus] = useState([]); // NEW: State for live drivers
  const [busStops, setBusStops] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Hover & Popup States
  const [hoveredStop, setHoveredStop] = useState(null);
  const [userPopupVisible, setUserPopupVisible] = useState(false);
  const hoverOpacity = useRef(new Animated.Value(0)).current;
  const userPopupOpacity = useRef(new Animated.Value(0)).current;

  // Helper to get API URL
  const getApiUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    return url.replace(/\/$/, '');
  };

  useEffect(() => {
    // A. Fetch User Location
    const fetchLocation = async () => {
      const location = await requestLocationPermission();
      if (location) {
        setUserLocation([location.coords.longitude, location.coords.latitude]);
        setIsLoading(false);
      } else {
        setErrorMessage('Unable to fetch location.');
        setIsLoading(false);
      }
    };

    // B. Fetch Static Bus Stops/Routes
    const fetchRoutes = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/routes`);
        const routes = await response.json();
        const stops = routes.map((route) => ({
          id: route.route_id,
          name: route.route_name,
          destination: route.end_point,
          eta: route.estimated_duration,
          coordinate: [parseFloat(route.longitude), parseFloat(route.latitude)],
        }));
        setBusStops(stops);
      } catch (error) {
        console.error('Error fetching routes:', error);
      }
    };

    // C. Fetch Live Drivers (NEW)
    const fetchLiveMatatus = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/active-matatus`);
        const data = await response.json();
        // data structure: [{driver_id, longitude, latitude, ...}, ...]
        setActiveMatatus(data); 
      } catch (error) {
        console.error("Error fetching live matatus", error);
      }
    };

    fetchLocation();
    fetchRoutes();
    fetchLiveMatatus(); // Initial fetch

    // Poll for live drivers every 10 seconds
    const interval = setInterval(fetchLiveMatatus, 10000);

    return () => clearInterval(interval);
  }, []);

  // -- Interaction Handlers --
  const handleHoverStart = (stop) => {
    Animated.timing(hoverOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setHoveredStop(stop);
  };

  const handleHoverEnd = () => {
    Animated.timing(hoverOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setHoveredStop(null));
  };

  const handleUserMarkerPress = () => {
    setUserPopupVisible(true);
    Animated.timing(userPopupOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.page}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Fetching location...</Text>
        </View>
      ) : userLocation ? (
        <View style={styles.container}>
          <Mapbox.MapView style={styles.map} styleURL="mapbox://styles/mapbox/streets-v11">
            <Mapbox.Camera zoomLevel={14} centerCoordinate={userLocation} animationMode="flyTo" animationDuration={2000} />
            
            {/* 1. User Marker */}
            <Mapbox.MarkerView coordinate={userLocation}>
              <TouchableOpacity onPress={handleUserMarkerPress}>
                <Image source={require('../assets/mappin.png')} style={styles.userIcon} />
              </TouchableOpacity>
            </Mapbox.MarkerView>

            {/* 2. Static Bus Stops */}
            {busStops.map((stop) => (
              <Mapbox.MarkerView key={`stop-${stop.id}`} coordinate={stop.coordinate}>
                <TouchableOpacity
                  style={styles.busStopMarker}
                  onPressIn={() => handleHoverStart(stop)}
                  onPressOut={handleHoverEnd}>
                  <Text style={styles.busStopText}>🚏</Text>
                </TouchableOpacity>
              </Mapbox.MarkerView>
            ))}

            {/* 3. Live Matatu Drivers (NEW) */}
            {activeMatatus.map((matatu) => (
              <Mapbox.MarkerView 
                key={`driver-${matatu.driver_id}`} 
                coordinate={[parseFloat(matatu.longitude), parseFloat(matatu.latitude)]}
              >
                <View style={styles.liveMatatuMarker}>
                   <Text style={{fontSize: 20}}>🚐</Text>
                </View>
              </Mapbox.MarkerView>
            ))}

          </Mapbox.MapView>

          {/* Popups */}
          {hoveredStop && (
            <Animated.View style={[styles.hoverPopup, { opacity: hoverOpacity }]}>
              <Text style={styles.popupText}>{hoveredStop.name} to {hoveredStop.destination}</Text>
              <Text style={styles.popupText}>Est. Duration: {hoveredStop.eta}</Text>
            </Animated.View>
          )}
          {userPopupVisible && (
            <Animated.View style={[styles.userPopup, { opacity: userPopupOpacity }]}>
              <Text style={styles.popupText}>You are here</Text>
              <TouchableOpacity onPress={() => setUserPopupVisible(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage || 'Unable to fetch location'}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { height: height, width: width },
  map: { ...StyleSheet.absoluteFillObject },
  userIcon: { width: 40, height: 40, resizeMode: 'contain' },
  
  busStopMarker: {
    backgroundColor: 'black',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveMatatuMarker: {
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'green',
    elevation: 5,
  },
  busStopText: { fontSize: 16 },
  
  hoverPopup: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    borderRadius: 10,
    elevation: 5,
  },
  userPopup: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    borderRadius: 10,
    elevation: 5,
  },
  popupText: { fontSize: 14, marginBottom: 5, fontWeight: 'bold' },
  closeText: { fontSize: 14, color: 'blue', textAlign: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: 'red' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#0000ff', marginTop: 10 },
});

export default Map;
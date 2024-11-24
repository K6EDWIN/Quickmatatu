import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Animated, Image } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const requestLocationPermission = async () => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      maximumAge: 10000,
      timeout: 5000,
    });

    return location;
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
};

Mapbox.setAccessToken('pk.eyJ1IjoibXVuZ2FpIiwiYSI6ImNtMnRreWd2djAzcHAybHNidms4a251bXYifQ.LY23Gbdw_yBwvH8hD2eRmQ');

const Map = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busStops, setBusStops] = useState([]);
  const [hoveredStop, setHoveredStop] = useState(null);
  const [userPopupVisible, setUserPopupVisible] = useState(false);
  const hoverOpacity = useRef(new Animated.Value(0)).current;
  const userPopupOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchLocation = async () => {
      const location = await requestLocationPermission();
      if (location) {
        const { longitude, latitude } = location.coords;
        setUserLocation([longitude, latitude]);
        setIsLoading(false);
      } else {
        setErrorMessage('Unable to fetch location. Please ensure location is enabled.');
        setIsLoading(false);
      }
    };

    const fetchRoutes = async () => {
      try {
        const response = await fetch('http://localhost:3001/routes');
        const routes = await response.json();
        const stops = routes.map((route) => ({
          id: route.route_id,
          name: route.route_name,
          destination: route.end_point,
          eta: route.estimated_duration,
          coordinate: [route.longitude, route.latitude],
        }));

        setBusStops(stops);
      } catch (error) {
        console.error('Error fetching routes:', error);
      }
    };

    fetchLocation();
    fetchRoutes();
  }, []);

  const handleHoverStart = (stop) => {
    Animated.timing(hoverOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setHoveredStop(stop);
  };

  const handleHoverEnd = () => {
    Animated.timing(hoverOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setHoveredStop(null);
    });
  };

  const handleUserMarkerPress = () => {
    setUserPopupVisible(true);
    Animated.timing(userPopupOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleUserPopupClose = () => {
    Animated.timing(userPopupOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setUserPopupVisible(false));
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
            <Mapbox.Camera
              zoomLevel={14}
              centerCoordinate={userLocation}
              animationMode="flyTo"
              animationDuration={2000}
            />
            <Mapbox.MarkerView coordinate={userLocation}>
              <TouchableOpacity onPress={handleUserMarkerPress}>
                <Image 
                  source={require('../assets/mappin.png')}
                  style={styles.userIcon}
                />
              </TouchableOpacity>
            </Mapbox.MarkerView>
            {busStops.map((stop) => (
              <Mapbox.MarkerView key={stop.id} coordinate={stop.coordinate}>
                <TouchableOpacity
                  style={styles.busStopMarker}
                  onPressIn={() => handleHoverStart(stop)}
                  onPressOut={handleHoverEnd}>
                  <Text style={styles.busStopText}>🚌</Text>
                </TouchableOpacity>
              </Mapbox.MarkerView>
            ))}
          </Mapbox.MapView>
          {hoveredStop && (
            <Animated.View
              style={[
                styles.hoverPopup,
                {
                  bottom: 150,
                  opacity: hoverOpacity,
                },
              ]}>
              <Text style={styles.popupText}>
                {hoveredStop.name} Destination: {hoveredStop.destination}
              </Text>
              <Text style={styles.popupText}>Next matatu leaving in: {hoveredStop.eta}</Text>
            </Animated.View>
          )}
          {userPopupVisible && (
            <Animated.View
              style={[
                styles.userPopup,
                {
                  opacity: userPopupOpacity,
                },
              ]}>
              <Text style={styles.popupText}>You are here</Text>
              <TouchableOpacity onPress={handleUserPopupClose}>
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

export default Map;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    height: height,
    width: width,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  busStopMarker: {
    backgroundColor: 'black',
    padding: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busStopText: {
    fontSize: 16,
  },
  hoverPopup: {
    position: 'absolute',
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    alignSelf: 'center',
  },
  userPopup: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  popupText: {
    fontSize: 14,
    marginBottom: 5,
  },
  closeText: {
    fontSize: 14,
    color: 'blue',
    textAlign: 'center',
    marginTop: 10,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#0000ff',
    marginTop: 10,
  },
});

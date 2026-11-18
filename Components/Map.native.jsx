import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { getApiBaseUrl } from './api';

const { width, height } = Dimensions.get('window');

// 1. Setup Location Permissions
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (mapboxToken) Mapbox.setAccessToken(mapboxToken);

const requestLocationPermission = async () => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return null;
    }
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
};

const Map = ({ searchQuery }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [activeMatatus, setActiveMatatus] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userPopupVisible, setUserPopupVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!mapboxToken) {
      setErrorMessage('Map display needs EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN. No map location or ETA is being simulated.');
      setIsLoading(false);
      return () => { mounted = false; };
    }

    const fetchLocation = async () => {
      const location = await requestLocationPermission();
      if (!mounted) return;
      if (location) {
        setUserLocation([location.coords.longitude, location.coords.latitude]);
        setIsLoading(false);
      } else {
        setErrorMessage('Unable to fetch location.');
        setIsLoading(false);
      }
    };

    const fetchLiveMatatus = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/active-matatus`);
        if (!response.ok) throw new Error('Unable to fetch recent driver locations.');
        const data = await response.json();
        if (mounted && Array.isArray(data)) {
          setActiveMatatus(data.filter((driver) => {
            if (driver.latitude === null || driver.latitude === undefined || String(driver.latitude).trim() === ''
              || driver.longitude === null || driver.longitude === undefined || String(driver.longitude).trim() === '') return false;
            const latitude = Number(driver.latitude);
            const longitude = Number(driver.longitude);
            return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
              && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
          }));
        }
      } catch (error) {
        if (mounted) setErrorMessage(error.message || 'Unable to load recent driver locations.');
      }
    };

    fetchLocation();
    fetchLiveMatatus(); 
    const interval = setInterval(fetchLiveMatatus, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleUserMarkerPress = () => {
    setUserPopupVisible(true);
  };

  return (
    <View style={styles.page}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1b4332" />
          <Text style={styles.loadingText}>Finding your location…</Text>
        </View>
      ) : userLocation ? (
        <View style={styles.container}>
          <Mapbox.MapView style={styles.map} styleURL="mapbox://styles/mapbox/streets-v11">
            <Mapbox.Camera zoomLevel={14} centerCoordinate={userLocation} animationMode="flyTo" animationDuration={2000} />
            
            <Mapbox.MarkerView coordinate={userLocation}>
              <TouchableOpacity onPress={handleUserMarkerPress}>
                <Image source={require('../assets/mappin.png')} style={styles.userIcon} />
              </TouchableOpacity>
            </Mapbox.MarkerView>

            {activeMatatus.map((matatu) => (
              <Mapbox.MarkerView 
                key={`driver-${matatu.driver_id}`} 
                coordinate={[Number(matatu.longitude), Number(matatu.latitude)]}
              >
                <View style={styles.liveDriverMarker}>
                   <Text style={styles.driverMarkerText}>Driver</Text>
                </View>
              </Mapbox.MarkerView>
            ))}

          </Mapbox.MapView>

          <View style={styles.locationLegend}>
            <Text style={styles.legendTitle}>Recent driver locations</Text>
            <Text style={styles.legendText}>
              {activeMatatus.length
                ? `${activeMatatus.length} location${activeMatatus.length === 1 ? '' : 's'} updated within 5 minutes. Not an ETA or vehicle assignment.`
                : 'No active driver locations are available.'}
            </Text>
            {!!searchQuery && <Text style={styles.legendText}>Use the planner to select route stages.</Text>}
          </View>
          {userPopupVisible && (
            <View style={styles.userPopup}>
              <Text style={styles.popupText}>Your current location</Text>
              <TouchableOpacity onPress={() => setUserPopupVisible(false)}>
                <Text style={styles.closeText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
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
  liveDriverMarker: {
    backgroundColor: '#1b4332',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    elevation: 5,
  },
  driverMarkerText: { color: 'white', fontSize: 12, fontWeight: '700' },
  locationLegend: { position: 'absolute', top: 16, left: 16, right: 16, backgroundColor: 'white', padding: 12, borderRadius: 12, elevation: 4 },
  legendTitle: { color: '#1b4332', fontWeight: '700', marginBottom: 4 },
  legendText: { color: '#475569', fontSize: 12, lineHeight: 17 },
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
  closeText: { fontSize: 14, color: '#1b4332', textAlign: 'center', marginTop: 6 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#b42318', textAlign: 'center', padding: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#1b4332', marginTop: 10 },
});

export default Map;
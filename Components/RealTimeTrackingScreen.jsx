import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import Map from '../PlatformMap';
import { getApiBaseUrl } from './api';

const RealTimeTrackingScreen = ({ navigation }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [driverError, setDriverError] = useState('');

  const requestMapLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Allow location access to center the map near you.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      setLocationError(error.message || 'Unable to get your location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchActiveDrivers = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/active-matatus`);
      if (!response.ok) throw new Error('Recent driver locations are unavailable.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Recent driver locations are unavailable.');
      setActiveDrivers(data.filter((driver) => {
        if (driver.latitude === null || driver.latitude === undefined || String(driver.latitude).trim() === ''
          || driver.longitude === null || driver.longitude === undefined || String(driver.longitude).trim() === '') return false;
        const latitude = Number(driver.latitude);
        const longitude = Number(driver.longitude);
        return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
          && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
      }));
      setDriverError('');
    } catch (error) {
      setDriverError(error.message || 'Unable to load recent driver locations.');
    }
  }, []);

  useEffect(() => {
    fetchActiveDrivers();
    const interval = setInterval(fetchActiveDrivers, 30000);
    return () => clearInterval(interval);
  }, [fetchActiveDrivers]);

  const markers = [
    ...(userLocation ? [{ ...userLocation, title: 'Your location', color: '#1b4332' }] : []),
    ...activeDrivers.map((driver) => ({
      latitude: Number(driver.latitude),
      longitude: Number(driver.longitude),
      title: 'Driver location (updated within 5 minutes; no ETA)',
      color: '#e9c46a',
    })),
  ];

  return (
    <View style={styles.container}>
      {userLocation ? (
        <Map
          style={styles.map}
          initialCoordinates={userLocation}
          markers={markers}
          zoom={14}
        />
      ) : (
        <View style={styles.locationPrompt}>
          <Text style={styles.title}>See the map near you</Text>
          <Text style={styles.description}>
            Quickmatatu only shows recent driver locations. It does not have confirmed stops or arrival-time predictions yet.
          </Text>
          {locationLoading ? <ActivityIndicator size="large" color="#1b4332" /> : (
            <TouchableOpacity style={styles.locationButton} onPress={requestMapLocation}>
              <Text style={styles.buttonText}>Use my location</Text>
            </TouchableOpacity>
          )}
          {!!locationError && <Text style={styles.error}>{locationError}</Text>}
        </View>
      )}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Recent driver locations</Text>
        <Text style={styles.statusText}>
          {driverError || (activeDrivers.length
            ? `${activeDrivers.length} location${activeDrivers.length === 1 ? '' : 's'} updated within 5 minutes. Not an ETA, vehicle assignment, or seat confirmation.`
            : 'No active driver locations are available.')}
        </Text>
        <TouchableOpacity style={styles.planButton} onPress={() => navigation.navigate('Tickets')}>
          <Text style={styles.buttonText}>Plan a ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f5ef' },
  map: { flex: 1, height: '100%' },
  locationPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  title: { color: '#1b4332', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  description: { color: '#475569', textAlign: 'center', lineHeight: 22, marginVertical: 16 },
  locationButton: { backgroundColor: '#1b4332', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 },
  buttonText: { color: 'white', fontWeight: '700' },
  error: { marginTop: 16, color: '#b42318', textAlign: 'center' },
  statusCard: { backgroundColor: 'white', padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, borderColor: '#e5e7eb' },
  statusTitle: { color: '#1b4332', fontSize: 16, fontWeight: '700' },
  statusText: { color: '#475569', lineHeight: 20, marginVertical: 8 },
  planButton: { backgroundColor: '#1b4332', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});

export default RealTimeTrackingScreen;

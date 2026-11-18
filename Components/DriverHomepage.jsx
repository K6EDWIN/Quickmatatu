import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import Map from './Map';
import * as Location from 'expo-location';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { apiRequest } from './api';

const DriverHomepage = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationWarning, setLocationWarning] = useState('');
  const locationSubscription = useRef(null);

  const notify = (title, message) => {
    if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  const toggleOnlineStatus = async () => {
    if (locationLoading) return;
    setLocationLoading(true);
    if (isOnline) {
      setLocationWarning('');
      locationSubscription.current?.remove();
      locationSubscription.current = null;
      setIsOnline(false);
      try {
        await apiRequest('/driver/location', { method: 'DELETE' });
        notify("Offline", "Location sharing has stopped.");
      } catch (error) {
        notify("Location sharing stopped", error.message || "The server could not be updated; your last location will expire automatically.");
      } finally {
        setLocationLoading(false);
      }
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          notify("Permission denied", "Location permission is required to share your position.");
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        await apiRequest('/driver/location', {
          method: 'POST',
          body: JSON.stringify({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }),
        });
        locationSubscription.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 25 },
          (nextLocation) => {
            apiRequest('/driver/location', {
              method: 'POST',
              body: JSON.stringify({
                latitude: nextLocation.coords.latitude,
                longitude: nextLocation.coords.longitude,
              }),
            }).catch((error) => {
              setLocationWarning('Location updates have stopped reaching the server. Your last location will expire automatically.');
              console.error('Unable to update driver location:', error);
            });
          },
        );
        setLocationWarning('');
        setIsOnline(true);
        notify("Location sharing on", "Your recent location is visible to commuters. This is not a live ETA or vehicle assignment.");
      } catch (error) {
        locationSubscription.current?.remove();
        locationSubscription.current = null;
        await apiRequest('/driver/location', { method: 'DELETE' }).catch((cleanupError) => {
          console.error('Unable to clear driver location after start failure:', cleanupError);
        });
        notify("Unable to share location", error.message || "Check location permissions and your network, then try again.");
      } finally {
        setLocationLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      locationSubscription.current?.remove();
      if (isOnline) {
        apiRequest('/driver/location', { method: 'DELETE' })
          .catch((error) => console.error('Unable to mark driver offline:', error));
      }
    };
  }, [isOnline]);

  return (
    <View style={styles.container}>
      
      {/* Map Area with Overlay Controls */}
      <View style={styles.mapContainer}>
         <Map />

         {/* Driver Control Panel Overlay */}
         <View style={styles.controlPanel}>
            <Text style={styles.statusText}>
                Status: <Text style={{color: isOnline ? '#2d6a4f' : '#647067', fontWeight:'bold'}}>
                    {isOnline ? "ONLINE" : "OFFLINE"}
                </Text>
            </Text>
            {!!locationWarning && <Text style={styles.locationWarning}>{locationWarning}</Text>}
            
            <TouchableOpacity
                style={[styles.onlineButton, {backgroundColor: isOnline ? '#b42318' : '#2d6a4f'}]}
                onPress={toggleOnlineStatus}
                disabled={locationLoading}
            >
                {locationLoading ? <ActivityIndicator color="white" /> : (
                  <Text style={styles.buttonText}>{isOnline ? "STOP SHARING" : "GO ONLINE"}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity 
                style={styles.bookingsButton}
                onPress={() => navigation.navigate("HistoryScreenDriver")}
            >
                <Text style={{color: 'black'}}>View Incoming Requests</Text>
            </TouchableOpacity>
         </View>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.iconscontainer}>
        <View style={styles.icons}>
            <TouchableOpacity>
                <Foundation name='home' size={24} style={styles.icon}/>
                <Text>Home</Text>
            </TouchableOpacity>
        </View>
        <View style={styles.icons}>
            <TouchableOpacity onPress={()=>{navigation.navigate("HistoryScreenDriver")}}>
                <MaterialCommunityIcons name='history' size={24} color='rgb(107,107,107)' style={styles.icon}/>
                <Text>History</Text>
            </TouchableOpacity>
        </View>
        <View style={styles.icons}>
            <TouchableOpacity onPress={()=>{navigation.navigate("Account",{name: 'Driver'})}}>
                <AntDesign name='user' size={24} color='rgb(107,107,107)' style={styles.icon}/>
                <Text>Account</Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  controlPanel: {
    position: 'absolute',
    top: 60, 
    left: 20, 
    right: 20, 
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 15,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    alignItems: 'center',
    zIndex: 100 // Ensure it sits on top of the map
  },
  statusText: { fontSize: 16, marginBottom: 15 },
  onlineButton: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10
  },
  bookingsButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  iconscontainer: {
    display: 'flex',
    flexDirection: 'row',
    height: 80,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f7f5ef'
  },
  icons: { alignItems: 'center' },
  icon: { paddingLeft: 11, marginBottom: 5 },
  locationWarning: { color: '#b42318', marginBottom: 10, textAlign: 'center' }
});

export default DriverHomepage;
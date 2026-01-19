import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import Map from './Map';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';

const DriverHomepage = ({ navigation }) => {
  const [isOnline, setIsOnline] = useState(false);
  const locationInterval = useRef(null);

  // Helper to get API URL
  const getApiUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    return url.replace(/\/$/, '');
  };

  const toggleOnlineStatus = async () => {
    if (isOnline) {
      // Go Offline
      if (locationInterval.current) clearInterval(locationInterval.current);
      setIsOnline(false);
      Alert.alert("Offline", "You are no longer sharing your location.");
    } else {
      // Go Online
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required to go online.");
        return;
      }

      setIsOnline(true);
      Alert.alert("Online", "You are now visible to commuters.");
      
      // Start sending location immediately, then every 10s
      sendLocationUpdate();
      locationInterval.current = setInterval(sendLocationUpdate, 10000); 
    }
  };

  const sendLocationUpdate = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const userSession = await AsyncStorage.getItem('userSession');
      const user = userSession ? JSON.parse(userSession) : null;

      if (user && user.id) {
        await fetch(`${getApiUrl()}/api/update-location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_id: user.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          })
        });
        console.log("Location sent successfully");
      }
    } catch (error) {
      console.error("Error sending location:", error);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (locationInterval.current) clearInterval(locationInterval.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      
      {/* Map Area with Overlay Controls */}
      <View style={styles.mapContainer}>
         <Map />

         {/* Driver Control Panel Overlay */}
         <View style={styles.controlPanel}>
            <Text style={styles.statusText}>
                Status: <Text style={{color: isOnline ? 'green' : 'red', fontWeight:'bold'}}>
                    {isOnline ? "ONLINE" : "OFFLINE"}
                </Text>
            </Text>
            
            <TouchableOpacity 
                style={[styles.onlineButton, {backgroundColor: isOnline ? '#d9534f' : '#5cb85c'}]}
                onPress={toggleOnlineStatus}
            >
                <Text style={styles.buttonText}>
                    {isOnline ? "STOP SHARING" : "GO ONLINE"}
                </Text>
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
            <TouchableOpacity onPress={()=>{navigation.navigate("UserAccount",{name: 'Driver'})}}>
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
    backgroundColor: 'rgb(207,220,255)'
  },
  icons: { alignItems: 'center' },
  icon: { paddingLeft: 11, marginBottom: 5 }
});

export default DriverHomepage;
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountScreen({ route, navigation }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Default to commuter if not passed, but we will check Storage too
  const [userType, setUserType] = useState(route.params?.name || 'commuter'); 

  const getApiUrl = () => {
    let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    return url.replace(/\/api\/?$/, '').replace(/\/$/, '') + '/api';
  };

  useEffect(() => {
    const fetchUserData = async () => {
        try {
            // 1. Try to get user from AsyncStorage first (Most Reliable)
            const jsonValue = await AsyncStorage.getItem('userSession');
            let userId = null;

            if (jsonValue != null) {
                const user = JSON.parse(jsonValue);
                userId = user.id;
                setUserType(user.userType || 'commuter');
            } 

            // 2. If we have an ID, fetch the full profile from the server
            if (userId) {
                const response = await fetch(`${getApiUrl()}/users/${userId}`);
                const data = await response.json();

                if (response.ok) {
                    setProfileData(data);
                } else {
                    console.log("Failed to fetch full profile:", data.error);
                }
            } else {
                // If no storage, try the session endpoint as a backup
                const response = await fetch(`${getApiUrl()}/get_user`, { credentials: 'include' });
                const data = await response.json();
                if (response.ok && data.user) {
                     setProfileData(data.user);
                     setUserType(data.user.userType);
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
        // 1. Clear Local Storage
        await AsyncStorage.removeItem('userSession');
        
        // 2. Call Logout API
        await fetch(`${getApiUrl()}/logout`, { method: 'POST', credentials: 'include' });

        // 3. Navigate to Login
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    } catch (e) {
        console.error("Logout failed", e);
        navigation.navigate('Login');
    }
  };

  const handleManageAccount = () => {
    if (!profileData) return;
    
    // Simple way to show details since we don't have a dedicated Edit Profile page yet
    const info = `Username: ${profileData.username}\nEmail: ${profileData.email}\nUser Type: ${profileData.userType}\n${profileData.license_number ? 'License: ' + profileData.license_number : ''}`;
    
    if (Platform.OS === 'web') {
        alert("Account Details:\n" + info);
    } else {
        Alert.alert("Account Details", info);
    }
  };

  const OptionItem = ({ icon, label, description, onPress }) => (
    <TouchableOpacity style={styles.optionItem} onPress={onPress}>
      <MaterialIcons name={icon} size={hp('4%')} color="black" />
      <View style={styles.optionTextContainer}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#ccc" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );

  // --- Navigation Logic for Bottom Bar ---
  const bottomNavigation = (selected) => {
    // If driver, you might want to redirect to DriverHomepage
    if (selected === 'home') {
       navigation.navigate(userType === 'driver' ? 'DriverHomepage' : 'UserHomepage');
    } else if (selected === 'history') {
       navigation.navigate(userType === 'driver' ? 'HistoryScreenDriver' : 'HistoryScreenUser');
    } else if (selected === 'account-circle') {
       // We are already here
    } else if (selected === 'confirmation-number') {
       navigation.navigate('TicketsPage');
    }
  };

  const BottomNavigation = () => {
    const bottomNavItems = [
      { icon: 'home', label: 'Home' },
      { icon: 'history', label: 'History' },
      { icon: 'confirmation-number', label: 'Tickets' },
      { icon: 'account-circle', label: 'Account' },
    ];

    return (
      <View style={styles.bottomNavigation}>
        {bottomNavItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.iconContainer}
            onPress={() => bottomNavigation(item.icon)}
          >
            <MaterialIcons 
                name={item.icon} 
                size={hp('4%')} 
                color={item.label === 'Account' ? 'blue' : 'black'} 
            />
            <Text style={[styles.iconLabel, item.label === 'Account' && { color: 'blue' }]}>
                {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="blue" />
        <Text>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <FontAwesome name="user-circle" size={hp('10%')} color="#333" />
          </View>
          <Text style={styles.username}>{profileData?.username || 'Guest'}</Text>
          <Text style={{ color: 'gray' }}>{profileData?.email}</Text>
        </View>

        <View style={styles.optionsContainer}>
          <OptionItem 
            icon="person" 
            label="Manage Account" 
            description="View your personal details" 
            onPress={handleManageAccount}
          />
          <OptionItem 
            icon="history" 
            label="History" 
            description="View your past trips" 
            onPress={() => navigation.navigate(userType === 'driver' ? 'HistoryScreenDriver' : 'HistoryScreenUser')}
          />
          <OptionItem 
            icon="help-outline" 
            label="Help" 
            description="Contact customer support" 
            onPress={() => Alert.alert("Help", "Contact support at support@quickmatatu.com")}
          />
          <OptionItem 
            icon="settings" 
            label="Settings" 
            description="App preferences" 
            onPress={() => Alert.alert("Settings", "Settings coming soon!")}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Only show bottom nav if it's a commuter, usually drivers have different nav */}
      {userType !== 'driver' && <BottomNavigation />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 100, // Space for bottom nav
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  profileImageContainer: {
    marginBottom: 10,
  },
  username: {
    fontSize: hp('3%'),
    fontWeight: 'bold',
    color: '#333',
  },
  optionsContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    elevation: 2, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionTextContainer: {
    marginLeft: 15,
  },
  optionLabel: {
    fontSize: hp('2.2%'),
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: hp('1.8%'),
    color: '#888',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 40,
    marginTop: 30,
    alignSelf: 'center',
    elevation: 2,
  },
  logoutText: {
    color: 'white',
    fontSize: hp('2.2%'),
    fontWeight: 'bold',
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    position: 'absolute',
    bottom: 0,
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconLabel: {
    fontSize: hp('1.8%'),
    color: '#333',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
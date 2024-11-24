import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default function AccountScreen({ route, navigation }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const userType = route.params?.name || 'commuter'; 

// Fetch the logged-in user's username
  useEffect(() => {
    const fetchUsername = async () => {
        try {
// Get commuter ID from session
            const response = await fetch('http://localhost:3001/get_user', {
                credentials: 'include',
            });
            const data = await response.json();

            if (response.ok && data.commuterId) {
// Fetch username using commuter ID
                const userResponse = await fetch(`http://localhost:3001/user/${data.commuterId}`, {
                    credentials: 'include',
                });
                const userData = await userResponse.json();
                if (userResponse.ok && userData.username) {
                    setUsername(userData.username);
                } else {
                    setUsername('Unknown User');
                }
            } else {
                setUsername('Not Logged In');
            }
        } catch (error) {
            console.error('Error fetching username:', error.message);
            setUsername('Error fetching user');
        } finally {
            setLoading(false);
        }
    };

    fetchUsername();
  }, []);

  const BottomNavigationCommuter = () => {
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
            onPress={() => {
              bottomNavigation(item.icon, 'Commuter');
            }}
          >
            <MaterialIcons name={item.icon} size={hp('4%')} color="black" />
            <Text style={styles.iconLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const bottomNavigation = (selected, userType) => {
    if (selected === 'home' && userType === 'Commuter') {
      navigation.navigate('UserHomepage');
    } else if (selected === 'history' && userType === 'Commuter') {
      navigation.navigate('UserHistoryScreen');
    } else if (selected === 'account-circle' && userType === 'Commuter') {
      navigation.navigate('UserAccount', { name: 'User' });
    } else if (selected === 'confirmation-number' && userType === 'Commuter') {
      navigation.navigate('TicketsPage', { name: 'User' });

    } else {
      console.log('No route selected');
    }
  };

  const OptionItem = ({ icon, label, description }) => (
    <TouchableOpacity style={styles.optionItem}>
      <MaterialIcons name={icon} size={hp('4%')} color="black" />
      <View style={styles.optionTextContainer}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );

  const Logout = () => {
    fetch('http://192.168.43.201:3001/logout', {
      method: 'POST',
      credentials: 'include',
    })
      .then(() => {
        navigation.navigate('Login');
      })
      .catch((error) => {
        console.error('Error logging out:', error);
      });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="blue" />
        <Text>Loading Account Information...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <FontAwesome name="user-circle" size={hp('10%')} color="black" />
        </View>
        <Text style={styles.username}>{username || 'Guest'}</Text>
      </View>

      <View style={styles.optionsContainer}>
        <OptionItem icon="account-circle" label="Manage Account" description="Your account settings" />
        <OptionItem icon="history" label="History" description="Check your history" />
        <OptionItem icon="help-outline" label="Help" description="Contact our customer care" />
        <OptionItem icon="settings" label="Settings" description="Adjust your preferences" />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={Logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <BottomNavigationCommuter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
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
    marginTop: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  optionTextContainer: {
    marginLeft: 15,
  },
  optionLabel: {
    fontSize: hp('2.5%'),
    fontWeight: 'bold',
  },
  optionDescription: {
    fontSize: hp('2%'),
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 20,
    alignSelf: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: hp('2.5%'),
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
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconLabel: {
    fontSize: hp('2%'),
    color: '#333',
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

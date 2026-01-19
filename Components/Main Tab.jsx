// Components/MainTabs.jsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';

// Import your screens
import RealTimeTrackingScreen from './RealTimeTrackingScreen';
import HistoryScreenUser from './HistoryScreenUser';
import TicketsPage from './TicketsPage';
import AccountScreen from './AccountScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // We hide the tab header because screens have their own
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            return <MaterialIcons name="home" size={30} color={color} />;
          } else if (route.name === 'History') {
            return <MaterialIcons name="history" size={30} color={color} />;
          } else if (route.name === 'Tickets') {
            return <MaterialIcons name="confirmation-number" size={30} color={color} />;
          } else if (route.name === 'Account') {
            return <FontAwesome name="user-circle" size={28} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={RealTimeTrackingScreen} 
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreenUser} 
      />
      <Tab.Screen 
        name="Tickets" 
        component={TicketsPage} 
        initialParams={{ name: 'User' }}
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen} 
        initialParams={{ name: 'User' }}
      />
    </Tab.Navigator>
  );
}
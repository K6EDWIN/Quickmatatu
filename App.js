import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import your existing components
import LoginForm from "./Components/LoginForm";
import RegistrationForm from "./Components/Registration";
import DriverHomepage from './Components/DriverHomepage';
import RealTimeTrackingScreen from "./Components/RealTimeTrackingScreen";
import RatingPage from './Components/RatingPage';
import AccountScreen from './Components/AccountScreen';
import HistoryScreenDriver from './Components/HistoryScreenDriver';
import HistoryScreenUser from './Components/HistoryScreenUser';
import TicketsPage from './Components/TicketsPage';

// Import the Welcome Screen
import WelcomeScreen from './Components/WelcomeScreen';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      {/* Changed initialRouteName to "Welcome" */}
      <Stack.Navigator initialRouteName="Welcome">
        
        {/* Add Welcome Screen to the Stack */}
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen} 
          options={{ headerShown: false }} 
        />

        <Stack.Screen 
          name="Registration" 
          component={RegistrationForm} 
          options={{ headerTitle: "Register" }}
        />
        
        <Stack.Screen 
          name="Login" 
          component={LoginForm} 
          options={{ headerTitle: "Login" }}
        />
        
        {/* UserHomepage to RealTimeTrackingScreen  */}
        <Stack.Screen name="UserHomepage" component={RealTimeTrackingScreen} />
        <Stack.Screen name="DriverHomepage" component={DriverHomepage} />
        <Stack.Screen name="RatingPage" component={RatingPage} />
        <Stack.Screen name="UserAccount" component={AccountScreen} />
        <Stack.Screen name="HistoryScreenDriver" component={HistoryScreenDriver} />
        <Stack.Screen name="HistoryScreenUser" component={HistoryScreenUser} />
        <Stack.Screen name="TicketsPage" component={TicketsPage} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
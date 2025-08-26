import * as React from 'react';
import { useState } from "react";
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import LoginForm from "./Components/LoginForm";
import RegistrationForm from "./Components/Registration";
import DriverHomepage from './Components/DriverHomepage';
import RealTimeTrackingScreen from "./Components/RealTimeTrackingScreen";
import RatingPage from './Components/RatingPage';
import AccountScreen from './Components/AccountScreen';
import HistoryScreenDriver from './Components/HistoryScreenDriver';
import HistoryScreenUser from './Components/HistoryScreenUser';
import TicketsPage from './Components/TicketsPage';

const Stack = createNativeStackNavigator();

const App = () => {
  // const [userType, setUserType] = useState('');
  // const [showLogin, setShowLogin] = useState(false);
  // const [loggedIn, setLoggedIn] = useState(false);

  // const handleLoginSuccess = () => {
  //   setLoggedIn(true);
  //   console.log(loggedIn) // Set loggedIn to true when login is successful
  // };

  // console.log(loggedIn) 
  // return (
  //   <>
  //     {loggedIn ? (
  //       // Show DriverHomepage only when loggedIn is true
       

  //       <DriverHomepage />
  //     ) : (
  //       // Show either the Login or Registration form
  //       showLogin ? (
  //         <LoginForm 
  //           handleLoginSuccess={handleLoginSuccess}
  //           onCreateAccountPress={() => {
  //             setShowLogin(false);
  //             //setLoggedIn(true);
  //           }}
  //            // Pass the success handler to LoginForm
  //         />
  //       ) : (
  //         <RegistrationForm onLoginPress={() => setShowLogin(true)} userType={userType} setUserType={setUserType}/>
  //       )
  //     )}
  //   </>
  // );
  return(
    <>
    <NavigationContainer>
      <Stack.Navigator  initialRouteName="Registration">
        <Stack.Screen name="Registration" component={RegistrationForm} />
        <Stack.Screen name="Login" component={LoginForm} />
        <Stack.Screen name="UserHomepage" component={RealTimeTrackingScreen} />
        <Stack.Screen name="DriverHomepage" component={DriverHomepage} />
        <Stack.Screen name="RatingPage" component={RatingPage} />
        <Stack.Screen name="UserAccount" component={AccountScreen} />
        <Stack.Screen name="HistoryScreenDriver" component={HistoryScreenDriver} />
        <Stack.Screen name="HistoryScreenUser" component={HistoryScreenUser} />
        <Stack.Screen name="TicketsPage" component={TicketsPage} />
      </Stack.Navigator>
    </NavigationContainer>
    </>
  )
};

export default App;

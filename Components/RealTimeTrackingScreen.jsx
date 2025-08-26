// import React, { useState, useEffect } from 'react';
// import 'react-native-get-random-values';
// import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
// import MapView, { Marker } from 'react-native-maps';
// import * as Location from 'expo-location';
// import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
// import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
// import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

// const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY';

// export default function RealTimeTrackingScreen() {
//   const [location, setLocation] = useState(null);
//   const [errorMsg, setErrorMsg] = useState(null);

//   useEffect(() => {
//     (async () => {
//       let { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         setErrorMsg('Permission to access location was denied');
//         return;
//       }

//       let loc = await Location.getCurrentPositionAsync({});
//       setLocation(loc.coords);
//     })();
//   }, []);

//   const handlePlaceSelect = (data, details) => {
//     const { lat, lng } = details.geometry.location;
//     setLocation({
//       latitude: lat,
//       longitude: lng,
//     });
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
     
//       <View style={styles.searchBarContainer}>
//         <GooglePlacesAutocomplete
//           placeholder="Search for a place"
//           fetchDetails
//           onPress={handlePlaceSelect}
//           query={{
//             key: GOOGLE_PLACES_API_KEY,
//             language: 'en',
//           }}
//           styles={{
//             textInputContainer: styles.textInputContainer,
//             textInput: styles.textInput,
//           }}
//         />
//       </View>

    
//       <View style={styles.mapContainer}>
//         {location ? (
//           <MapView
//             style={styles.map}
//             region={{
//               latitude: location.latitude,
//               longitude: location.longitude,
//               latitudeDelta: 0.01,
//               longitudeDelta: 0.01,
//             }}
//           >
//             <Marker
//               coordinate={{
//                 latitude: location.latitude,
//                 longitude: location.longitude,
//               }}
//               title="Selected Location"
//             />
//           </MapView>
//         ) : (
//           <Text style={styles.locationText}>{errorMsg || "Fetching current location..."}</Text>
//         )}
//       </View>

      
//       <View style={styles.optionsContainer}>
//         <OptionItem icon="account-circle" label="Manage Account" description="Your account settings" />
//         <OptionItem icon="history" label="History" description="Check your history" />
//         <OptionItem icon="help-outline" label="Help" description="Contact our customer care" />
//         <OptionItem icon="settings" label="Settings" description="Adjust your preferences" />
//       </View>

//       <TouchableOpacity style={styles.logoutButton}>
//         <Text style={styles.logoutText}>Log Out</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const OptionItem = ({ icon, label, description }) => (
//   <TouchableOpacity style={styles.optionItem}>
//     <MaterialIcons name={icon} size={hp('4%')} color="black" style={styles.icon} />
//     <View style={styles.optionTextContainer}>
//       <Text style={styles.optionLabel}>{label}</Text>
//       <Text style={styles.optionDescription}>{description}</Text>
//     </View>
//     <MaterialIcons name="chevron-right" size={hp('4%')} color="black" />
//   </TouchableOpacity>
// );

// const styles = StyleSheet.create({
//   container: {
//     flexGrow: 1,
//     padding: wp('5%'),
//     backgroundColor: '#F0F4FF',
//     alignItems: 'center',
//   },
//   searchBarContainer: {
//     width: '100%',
//     marginBottom: hp('2%'),
//   },
//   textInputContainer: {
//     backgroundColor: 'white',
//     borderRadius: 10,
//     paddingHorizontal: wp('2%'),
//     paddingVertical: hp('1%'),
//   },
//   textInput: {
//     height: hp('5%'),
//     fontSize: hp('2%'),
//   },
//   mapContainer: {
//     width: '100%',
//     height: hp('30%'),
//     borderRadius: 10,
//     overflow: 'hidden',
//     marginBottom: hp('3%'),
//   },
//   map: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   locationText: {
//     fontSize: hp('2%'),
//     color: '#888888',
//     textAlign: 'center',
//     marginTop: hp('10%'),
//   },
//   optionsContainer: {
//     width: '100%',
//     backgroundColor: '#FFFFFF',
//     borderRadius: 10,
//     paddingVertical: hp('1%'),
//   },
//   optionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: hp('2%'),
//     paddingHorizontal: wp('4%'),
//     borderBottomWidth: 1,
//     borderBottomColor: '#E8E8E8',
//   },
//   icon: {
//     marginRight: wp('4%'),
//   },
//   optionTextContainer: {
//     flex: 1,
//   },
//   optionLabel: {
//     fontSize: hp('2%'),
//     fontWeight: 'bold',
//     color: 'black',
//   },
//   optionDescription: {
//     fontSize: hp('1.5%'),
//     color: '#888888',
//   },
//   logoutButton: {
//     marginTop: hp('3%'),
//     backgroundColor: '#FFFFFF',
//     borderRadius: 10,
//     paddingVertical: hp('2%'),
//     paddingHorizontal: wp('10%'),
//     alignItems: 'center',
//     justifyContent: 'center',
//     width: '100%',
//   },
//   logoutText: {
//     fontSize: hp('2%'),
//     fontWeight: 'bold',
//     color: 'black',
//   },
// });
import {TouchableOpacity, StyleSheet, Text, View, TextInput } from 'react-native';
import Map from './Map';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Ionicons from  'react-native-vector-icons/Ionicons';


const RealTimeTrackingScreen = ({navigation}) => {
  return (
      <> 
      <View style={styles.container}>

      <Map />
      
      <View
      style={styles.search}>
        <View>
        <EvilIcons
        name='search'
        size={30}
        color='rgb(107,107,107)'/>
        </View>
        <View>
        <TextInput
        placeholder='Search'
        fontSize={16}/>
        </View>
      </View>

      <View style={styles.iconscontainer}>

        <View style={styles.icons}>
      <TouchableOpacity>
        <Foundation
        name='home'
        size={24}
        style={styles.icon}/>
        <Text
        >Home</Text>
      </TouchableOpacity>
      </View>

      <View style={styles.icons}>
      <TouchableOpacity>
        <MaterialCommunityIcons
        name='history'
        size={24}
        color='rgb(107,107,107)'
        style={styles.icon}
        onPress={()=>{navigation.navigate("HistoryScreenUser")}}/>
        <Text>History</Text>
      </TouchableOpacity>
      </View>

      <View style={styles.icons}>
      <TouchableOpacity>
        <Ionicons
        name='ticket-outline'
        color='rgb(107,107,107)'
        size={24}
        style={styles.icon}
        onPress={()=>{navigation.navigate("TicketsPage")}}/>
        <Text
        >Tickets</Text>
      </TouchableOpacity>
      </View>

      <View style={styles.icons}>
      <TouchableOpacity>
        <AntDesign
        name='user'
        size={24}
        color='rgb(107,107,107)'
        style={styles.icon}
        onPress={()=>{
          navigation.navigate("UserAccount",{name: 'User'})}}/>
        <Text>Account</Text>
      </TouchableOpacity>
      </View>
      </View>

      </View>
    </>

  );
}

const styles = StyleSheet.create({
  container:{
    flex:1
  },
  search:{
    display:'flex',
    flexDirection:'row',
    position: 'absolute',
    backgroundColor:'white',
    justifyContent:'start',
    borderRadius: 5,
    left:40,
    right:40,
    top:50,
    height:40,
    
    alignItems:'center',
  },
  iconscontainer:{
    display: 'flex',
    flexDirection: 'row',
    height:80,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgb(207,220,255)'
  },
  icons:{
    alignItems: 'center',
    color: 'blue'
  },
  icon:{
    paddingLeft:11, 
    marginBottom: 5,
  }
  
});

export default RealTimeTrackingScreen;
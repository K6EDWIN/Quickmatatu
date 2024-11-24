import { StatusBar } from 'expo-status-bar';
import { useState } from "react";
import {TouchableOpacity, StyleSheet, Text, View, TextInput } from 'react-native';
import Map from './Map';
import Foundation from 'react-native-vector-icons/Foundation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import EvilIcons from 'react-native-vector-icons/EvilIcons';


const DriverHompage = ({navigation}) => {
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
        onPress={()=>{navigation.navigate("DriverHistoryScreen")}}
        />
        <Text>History</Text>
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
          navigation.navigate("UserAccount",{name: 'Driver'})}}/>
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

export default DriverHompage;
import React from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import Map from './Map';
import EvilIcons from 'react-native-vector-icons/EvilIcons';

const RealTimeTrackingScreen = ({navigation}) => {
  return (
      <View style={styles.container}>
        <Map />
        
        <View style={styles.search}>
            <View>
                <EvilIcons name='search' size={30} color='rgb(107,107,107)'/>
            </View>
            <View>
                <TextInput placeholder='Search' fontSize={16} style={{width: 200}}/>
            </View>
        </View>

        {}
      </View>
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
    borderRadius: 5,
    left:40,
    right:40,
    top:50,
    height:40,
    alignItems:'center',
    paddingHorizontal: 10,
    elevation: 3, 
  },
});

export default RealTimeTrackingScreen;
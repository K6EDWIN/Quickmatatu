import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity } from 'react-native';
import Map from './Map';
import EvilIcons from 'react-native-vector-icons/EvilIcons';

const RealTimeTrackingScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
      <View style={styles.container}>
        <Map searchQuery={searchQuery} />
        
        <View style={styles.search}>
            <View>
                <EvilIcons name='search' size={30} color='rgb(107,107,107)'/>
            </View>
            <View style={{ flex: 1, marginLeft: 5 }}>
                <TextInput
                  placeholder='Search destination or route'
                  fontSize={16}
                  style={{ width: '100%' }}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
            </View>
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <EvilIcons name='close' size={24} color='rgb(107,107,107)' />
              </TouchableOpacity>
            )}
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
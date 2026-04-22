// Components/PlatformMap.native.js
// Native version: uses react-native-maps for Android & iOS
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const PlatformMap = ({
  style,
  initialCoordinates = { latitude: -1.2921, longitude: 36.8219 }, // Nairobi default
  zoom = 13,
  markers = [], // [{ latitude, longitude, title, color }]
  onMapReady,
}) => {
  const mapRef = useRef(null);

  // Convert zoom level to delta (approximate)
  const delta = 360 / Math.pow(2, zoom) * 2;

  return (
    <View style={[styles.wrapper, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: initialCoordinates.latitude,
          longitude: initialCoordinates.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        onMapReady={() => onMapReady && onMapReady(mapRef.current)}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title || ''}
            pinColor={marker.color || '#e63946'}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
    borderRadius: 12,
  },
});

export default PlatformMap;

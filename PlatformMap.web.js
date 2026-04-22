// Components/PlatformMap.web.js
// Web version: uses Leaflet via react-leaflet
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

// Dynamically inject Leaflet CSS + JS if not present, then render map into a div
const PlatformMap = ({
  style,
  initialCoordinates = { latitude: -1.2921, longitude: 36.8219 }, // Nairobi default
  zoom = 13,
  markers = [], // [{ latitude, longitude, title, color }]
  onMapReady,
}) => {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS then init map
    const initMap = () => {
      if (!mapRef.current || leafletMapRef.current) return;

      const L = window.L;
      if (!L) return;

      // Fix default icon paths (common Leaflet/webpack issue)
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center: [initialCoordinates.latitude, initialCoordinates.longitude],
        zoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;

      // Add initial markers
      markers.forEach((m) => addMarkerToMap(L, map, m));

      if (onMapReady) onMapReady(map);
    };

    if (window.L) {
      initMap();
    } else if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      // Script tag exists but not yet loaded
      document.getElementById('leaflet-js').addEventListener('load', initMap);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers when prop changes
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const L = window.L;
    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((m) => {
      const marker = addMarkerToMap(L, map, m);
      if (marker) markersRef.current.push(marker);
    });
  }, [markers]);

  const addMarkerToMap = (L, map, { latitude, longitude, title, color }) => {
    if (!latitude || !longitude) return null;

    const iconHtml = `
      <div style="
        width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
        background: ${color || '#e63946'};
        border: 3px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -30],
    });

    const marker = L.marker([latitude, longitude], { icon });
    if (title) marker.bindPopup(`<strong>${title}</strong>`);
    marker.addTo(map);
    return marker;
  };

  return (
    <View style={[styles.wrapper, style]}>
      <div
        ref={mapRef}
        style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
  },
});

export default PlatformMap;

import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';

let MapView: any;
let Marker: any;
let Callout: any;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Maps = require('react-native-maps');
    MapView = Maps.MapView || Maps.default?.MapView;
    Marker = Maps.Marker;
    Callout = Maps.Callout;
  } catch (e) {
    // If we are on web and the require fails, we leave them as undefined and then provide web fallbacks below.
    console.warn('react-native-maps is not available on web:', e);
  }
}

// If we are on web or the require failed, provide web fallbacks
if (!MapView) {
  MapView = ({ children, style }: any) => {
    // Coerce style if it's an array (React Native style) to an object for consistent behavior
    const s = Array.isArray(style) ? Object.assign({}, ...style) : style || {};
    return (
      <View style={[styles.mapPlaceholder, s]}>
        <Text style={styles.mapText}>Map (web placeholder)</Text>
        {children}
      </View>
    );
  };
  Marker = (_props: any) => null;
  Callout = (_props: any) => null;
}

export { MapView, Marker, Callout };

const styles = StyleSheet.create({
  mapPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' },
  mapText: { color: '#666' },
});
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BikeDetailScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.placeholder}>Bike Detail Screen</Text>
            <Text style={styles.info}>Full bike details, documents, and maintenance history</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    placeholder: { fontSize: 24, color: '#ffffff', fontWeight: 'bold' },
    info: { fontSize: 14, color: '#868e96', marginTop: 8 },
});

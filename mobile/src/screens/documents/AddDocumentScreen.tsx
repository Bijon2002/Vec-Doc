import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddDocumentScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.placeholder}>Add Document Screen</Text>
            <Text style={styles.info}>Upload and track document expiry dates</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    placeholder: { fontSize: 24, color: '#ffffff', fontWeight: 'bold' },
    info: { fontSize: 14, color: '#868e96', marginTop: 8 },
});

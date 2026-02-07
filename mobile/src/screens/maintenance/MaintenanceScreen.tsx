import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MaintenanceScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Service</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.emoji}>🔧</Text>
                <Text style={styles.placeholder}>Maintenance Screen</Text>
                <Text style={styles.info}>Track oil changes, services, and parts</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    header: { padding: 24, paddingTop: 60 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emoji: { fontSize: 64, marginBottom: 16 },
    placeholder: { fontSize: 24, color: '#ffffff', fontWeight: 'bold' },
    info: { fontSize: 14, color: '#868e96', marginTop: 8 },
});

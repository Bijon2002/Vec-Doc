import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LogMaintenanceScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.placeholder}>Log Maintenance Screen</Text>
            <Text style={styles.info}>Record oil changes & service history</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    placeholder: { fontSize: 24, color: '#ffffff', fontWeight: 'bold' },
    info: { fontSize: 14, color: '#868e96', marginTop: 8 },
});

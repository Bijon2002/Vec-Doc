import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.placeholder}>Settings Screen</Text>
            <Text style={styles.info}>Configure notifications, theme, and preferences</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
    placeholder: { fontSize: 24, color: '#ffffff', fontWeight: 'bold' },
    info: { fontSize: 14, color: '#868e96', marginTop: 8 },
});

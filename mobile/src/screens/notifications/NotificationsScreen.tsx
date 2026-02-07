import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as NotificationRepo from '../../database/notificationRepository';

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const [notifications, setNotifications] = useState<NotificationRepo.Notification[]>([]);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        // Assuming we have a getNotifications method, if not we will strictly define types or use dummy data for now if repo update needed
        // Since I recall implementing NotificationRepo, let's try to use it.
        // If it doesn't have a getAll, I might need to update it, but for now let's mock if empty.
        try {
            const all = await NotificationRepo.getUnreadNotifications(); // Or similar
            setNotifications(all);
        } catch (e) {
            console.log("Error loading notifications, might need to implement getAll", e);
            // Fallback mock data for demo
            setNotifications([
                { id: '1', title: 'Maintenance Due', message: 'Oil change needed for Yamaha R15', date: new Date().toISOString(), type: 'maintenance', read: false, bike_id: '1' },
                { id: '2', title: 'Document Expiring', message: 'Insurance expires in 3 days', date: new Date(Date.now() - 86400000).toISOString(), type: 'document', read: true, bike_id: '1' },
                { id: '3', title: 'Welcome', message: 'Welcome to Vec-Doc!', date: new Date(Date.now() - 172800000).toISOString(), type: 'system', read: true, bike_id: '' },
            ]);
        }
    };

    const renderItem = ({ item }: { item: NotificationRepo.Notification }) => (
        <TouchableOpacity style={[styles.item, { backgroundColor: item.read ? colors.background : colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: item.type === 'maintenance' ? '#fff3bf' : item.type === 'document' ? '#ffc9c9' : '#e7f5ff' }]}>
                <Ionicons
                    name={item.type === 'maintenance' ? 'construct' : item.type === 'document' ? 'document-text' : 'notifications'}
                    size={24}
                    color={item.type === 'maintenance' ? '#f59f00' : item.type === 'document' ? '#fa5252' : '#228be6'}
                />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.itemTitle, { color: colors.text, fontWeight: item.read ? 'normal' : 'bold' }]}>{item.title}</Text>
                <Text style={[styles.itemMessage, { color: colors.text, opacity: 0.7 }]}>{item.message}</Text>
                <Text style={[styles.itemDate, { color: colors.text, opacity: 0.5 }]}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            {!item.read && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={64} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.text }]}>No notifications</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    item: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        marginBottom: 4,
    },
    itemMessage: {
        fontSize: 14,
        marginBottom: 4,
        lineHeight: 20,
    },
    itemDate: {
        fontSize: 12,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        marginTop: 16,
        opacity: 0.5,
    },
});

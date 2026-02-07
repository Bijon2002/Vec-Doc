import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';

export default function PrivacyPolicyScreen() {
    const { colors } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.date, { color: colors.text }]}>Last updated: February 7, 2026</Text>

                <Section title="1. Introduction" colors={colors}>
                    Welcome to Vec-Doc. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our app and tell you about your privacy rights.
                </Section>

                <Section title="2. Data We Collect" colors={colors}>
                    We collect data to provide better services to all our users. This includes:
                    {'\n'}• Device Information
                    {'\n'}• Location Data (for Nearby Services and Ride Tracking)
                    {'\n'}• Usage Data (Maintenance Logs, Documents)
                </Section>

                <Section title="3. Local Storage" colors={colors}>
                    Vec-Doc is primarily a local-first application. Most of your data, including bike details, documents, and maintenance logs, is stored locally on your device using SQLite. We do not upload this data to a cloud server unless you explicitly enable cloud sync features (coming soon).
                </Section>

                <Section title="4. Location Services" colors={colors}>
                    We use your location to show nearby services and track your rides. You can disable location services at any time in your device settings.
                </Section>

                <Section title="5. Contact Us" colors={colors}>
                    If you have any questions about this privacy policy, please contact us at support@vec-doc.com.
                </Section>

                <View style={{ height: 40 }} />
            </View>
        </ScrollView>
    );
}

const Section = ({ title, children, colors }: { title: string, children: React.ReactNode, colors: any }) => (
    <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
        <Text style={[styles.sectionText, { color: colors.text }]}>{children}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    date: {
        fontSize: 14,
        opacity: 0.6,
        marginBottom: 32,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    sectionText: {
        fontSize: 16,
        lineHeight: 24,
        opacity: 0.8,
    },
});

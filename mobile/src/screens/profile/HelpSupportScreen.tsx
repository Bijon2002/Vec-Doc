import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function HelpSupportScreen() {
    const { colors } = useTheme();

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@vec-doc.com?subject=Vec-Doc Support Request');
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.headerText, { color: colors.text }]}>How can we help you?</Text>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Frequently Asked Questions</Text>

                    <FAQItem question="How do I add a new bike?" answer="Go to the 'My Bikes' tab and tap the '+' button in the top right corner." colors={colors} />
                    <FAQItem question="Is my data backed up?" answer="Currently, data is stored locally on your device. We are working on a cloud sync feature." colors={colors} />
                    <FAQItem question="How does ride tracking work?" answer="We use your device's GPS to calculate distance. Ensure location permissions are granted." colors={colors} />
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Contact Support</Text>
                    <Text style={[styles.contactText, { color: colors.text }]}>
                        Need further assistance? Our support team is here to help.
                    </Text>
                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleEmailSupport}>
                        <Ionicons name="mail" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Email Support</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const FAQItem = ({ question, answer, colors }: { question: string, answer: string, colors: any }) => (
    <View style={[styles.faqItem, { borderBottomColor: colors.border }]}>
        <Text style={[styles.question, { color: colors.text }]}>{question}</Text>
        <Text style={[styles.answer, { color: colors.text }]}>{answer}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    contactText: {
        fontSize: 15,
        marginBottom: 20,
        opacity: 0.8,
        lineHeight: 22,
    },
    button: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    faqItem: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    question: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 8,
    },
    answer: {
        fontSize: 14,
        opacity: 0.7,
        lineHeight: 20,
    },
});

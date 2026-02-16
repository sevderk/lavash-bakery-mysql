import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';
import { Contact, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Divider,
    Snackbar,
    Text,
    TextInput,
    useTheme,
} from 'react-native-paper';

import { addCustomer } from '@/lib/api';

export default function AddCustomerScreen() {
    const theme = useTheme();
    const router = useRouter();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', isError: false });

    const pickContact = async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'İzin Gerekli',
                    'Rehbere erişim izni verilmedi. Lütfen ayarlardan izin verin.',
                    [{ text: 'Tamam' }]
                );
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
            });

            if (!data || data.length === 0) {
                Alert.alert('Bilgi', 'Rehberde kişi bulunamadı.');
                return;
            }

            // Show a list for user to pick — using Alert for simplicity
            // For a production app, a modal list would be better
            const contact = data[0]; // expo-contacts on device shows native picker
            // On device, presentContactPickerAsync is better if available

            // Try the native contact picker first
            const pickedContact = await pickContactNative(data);

            if (pickedContact) {
                if (pickedContact.name) {
                    setName(pickedContact.name);
                }
                if (pickedContact.phoneNumbers && pickedContact.phoneNumbers.length > 0) {
                    setPhone(pickedContact.phoneNumbers[0].number ?? '');
                }

                setSnackbar({
                    visible: true,
                    message: `"${pickedContact.name}" rehberden seçildi`,
                    isError: false,
                });
            }
        } catch (error: any) {
            console.error('Rehber hatası:', error);
            Alert.alert('Hata', 'Rehber okunurken bir hata oluştu.');
        }
    };

    // Helper: show contacts in an actionSheet-like flow
    const pickContactNative = async (
        contacts: Contacts.Contact[]
    ): Promise<Contacts.Contact | null> => {
        return new Promise((resolve) => {
            // Show first 20 contacts with phone numbers
            const withPhone = contacts
                .filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0)
                .slice(0, 20);

            if (withPhone.length === 0) {
                Alert.alert('Bilgi', 'Telefon numarası olan kişi bulunamadı.');
                resolve(null);
                return;
            }

            const buttons = withPhone.map((c) => ({
                text: `${c.name} — ${c.phoneNumbers?.[0]?.number ?? ''}`,
                onPress: () => resolve(c),
            }));
            buttons.push({ text: 'İptal', onPress: () => resolve(null) });

            Alert.alert('Rehberden Seç', 'Bir kişi seçin:', buttons);
        });
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            setSnackbar({ visible: true, message: 'Müşteri adı zorunludur.', isError: true });
            return;
        }

        setSubmitting(true);

        try {
            await addCustomer({
                name: name.trim(),
                phone: phone.trim() || null,
            });

            setSnackbar({
                visible: true,
                message: 'Müşteri başarıyla eklendi!',
                isError: false,
            });
            // Navigate back after a short delay
            setTimeout(() => {
                router.back();
            }, 600);
        } catch (err: any) {
            console.error('Müşteri ekleme hatası:', err.message);
            setSnackbar({
                visible: true,
                message: `Hata: ${err.message}`,
                isError: true,
            });
        }

        setSubmitting(false);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header Icon */}
                <View style={[styles.headerIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                    <UserPlus size={40} color={theme.colors.primary} />
                </View>

                <Text
                    variant="headlineSmall"
                    style={[styles.heading, { color: theme.colors.onSurface }]}
                >
                    Yeni Müşteri Ekle
                </Text>

                <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 24 }}
                >
                    Müşteri bilgilerini girin veya rehberden seçin
                </Text>

                <Divider style={{ marginBottom: 20 }} />

                {/* Contacts Button */}
                <Button
                    mode="outlined"
                    icon={({ size, color }) => <Contact size={size} color={color} />}
                    onPress={pickContact}
                    style={[styles.contactsButton, { borderColor: theme.colors.primary }]}
                    textColor={theme.colors.primary}
                    contentStyle={{ paddingVertical: 6 }}
                >
                    Rehberden Seç
                </Button>

                {/* Form */}
                <TextInput
                    label="Müşteri Adı *"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={styles.input}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    left={<TextInput.Icon icon="account" />}
                    placeholder="Örn: Ahmet Yılmaz"
                />

                <TextInput
                    label="Telefon Numarası"
                    value={phone}
                    onChangeText={setPhone}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="phone-pad"
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    left={<TextInput.Icon icon="phone" />}
                    placeholder="Örn: 0532 123 45 67"
                />

                {/* Submit */}
                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={submitting}
                    disabled={submitting}
                    style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                    contentStyle={{ paddingVertical: 8 }}
                    labelStyle={{ fontSize: 16, fontWeight: '600' }}
                >
                    Müşteri Ekle
                </Button>
            </ScrollView>

            {/* Snackbar Feedback */}
            <Snackbar
                visible={snackbar.visible}
                onDismiss={() => setSnackbar((s) => ({ ...s, visible: false }))}
                duration={3000}
                style={{
                    backgroundColor: snackbar.isError ? '#D32F2F' : '#2E7D32',
                }}
                action={{
                    label: 'Kapat',
                    textColor: '#FFFFFF',
                    onPress: () => setSnackbar((s) => ({ ...s, visible: false })),
                }}
            >
                {snackbar.message}
            </Snackbar>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingTop: 32,
    },
    headerIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    heading: {
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    contactsButton: {
        marginBottom: 20,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    input: {
        marginBottom: 16,
        borderRadius: 10,
    },
    submitButton: {
        marginTop: 12,
        borderRadius: 12,
        elevation: 2,
    },
});

import { useFocusEffect, useRouter } from 'expo-router';
import { ClipboardList, ShoppingBag } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    TextInput as RNTextInput,
    StyleSheet,
    View,
} from 'react-native';
import {
    ActivityIndicator,
    Button,
    Surface,
    Text,
    useTheme
} from 'react-native-paper';

import { createOrders, getCustomers, type Customer } from '@/lib/api';
import { DEFAULT_UNIT_PRICE, useOrderStore } from '@/lib/order-store';

// Generate a UUID v4 without external dependency
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export default function OrdersScreen() {
    const theme = useTheme();
    const router = useRouter();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const { draftOrders, setQuantity, setUnitPrice, clearDrafts } = useOrderStore();

    // ── Fetch customers ──────────────────────────────────
    const fetchCustomers = useCallback(async () => {
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (err: any) {
            console.error('Müşteri yükleme hatası:', err.message);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchCustomers();
        }, [fetchCustomers])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCustomers();
    }, [fetchCustomers]);

    // ── Summary calculations ─────────────────────────────
    const summary = useMemo(() => {
        let totalQuantity = 0;
        let totalAmount = 0;
        let customerCount = 0;

        for (const customer of customers) {
            const draft = draftOrders[customer.id];
            const qty = draft?.quantity ?? 0;
            if (qty > 0) {
                customerCount++;
                totalQuantity += qty;
                totalAmount += qty * (draft?.unitPrice ?? DEFAULT_UNIT_PRICE);
            }
        }

        return { totalQuantity, totalAmount, customerCount };
    }, [customers, draftOrders]);

    // ── Format currency ──────────────────────────────────
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

    // ── Submit batch ─────────────────────────────────────
    const handleSubmit = () => {
        if (summary.customerCount === 0) {
            Alert.alert('Uyarı', 'Sipariş girilmemiş. En az bir müşteri için miktar girin.');
            return;
        }

        Alert.alert(
            'Günlüğü Onayla',
            `Toplam ${summary.totalQuantity} lavaş, ${summary.customerCount} müşteri.\n` +
            `Genel toplam: ${formatCurrency(summary.totalAmount)}\n\n` +
            `Onaylıyor musunuz?`,
            [
                { text: 'İptal', style: 'cancel' },
                { text: 'Onayla', onPress: submitOrders },
            ]
        );
    };

    const submitOrders = async () => {
        setSubmitting(true);
        const orderGroupId = generateUUID();

        const rows = customers
            .filter((c) => {
                const draft = draftOrders[c.id];
                return draft && draft.quantity > 0;
            })
            .map((c) => {
                const draft = draftOrders[c.id]!;
                return {
                    customer_id: c.id,
                    quantity: draft.quantity,
                    unit_price: draft.unitPrice,
                    total_price: draft.quantity * draft.unitPrice,
                    order_group_id: orderGroupId,
                };
            });

        try {
            await createOrders(rows);
            clearDrafts();
            Alert.alert(
                'Başarılı! ✅',
                `${rows.length} müşteri için ${summary.totalQuantity} lavaş kaydedildi.`,
                [{ text: 'Tamam', onPress: () => router.replace('/(tabs)') }]
            );
        } catch (err: any) {
            console.error('Sipariş kayıt hatası:', err.message);
            Alert.alert('Hata', `Siparişler kaydedilemedi: ${err.message}`);
        }

        setSubmitting(false);
    };

    // ── Stepper helpers ──────────────────────────────────
    const increment = (customerId: string) => {
        const current = draftOrders[customerId]?.quantity ?? 0;
        setQuantity(customerId, current + 1);
    };

    const decrement = (customerId: string) => {
        const current = draftOrders[customerId]?.quantity ?? 0;
        if (current > 0) setQuantity(customerId, current - 1);
    };

    // ── Render a single customer row ─────────────────────
    const renderRow = ({ item }: { item: Customer }) => {
        const draft = draftOrders[String(item.id)];
        const qty = draft?.quantity ?? 0;
        const price = draft?.unitPrice ?? DEFAULT_UNIT_PRICE;
        const hasDebt = item.current_balance > 0;
        const rowActive = qty > 0;

        return (
            <Surface
                style={[
                    styles.row,
                    {
                        backgroundColor: rowActive
                            ? (theme.dark ? '#2A2018' : '#FFF8F0')
                            : theme.colors.surface,
                        borderLeftColor: rowActive ? theme.colors.primary : 'transparent',
                    },
                ]}
                elevation={rowActive ? 2 : 1}
            >
                {/* Left: customer info */}
                <View style={styles.customerCol}>
                    <Text
                        variant="titleSmall"
                        style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                    <Text
                        variant="labelSmall"
                        style={{ color: hasDebt ? '#D32F2F' : '#2E7D32' }}
                    >
                        Bakiye: {formatCurrency(item.current_balance)}
                    </Text>
                </View>

                {/* Center: quantity stepper */}
                <View style={styles.stepperCol}>
                    <View style={styles.stepper}>
                        <Button
                            mode="outlined"
                            compact
                            onPress={() => decrement(String(item.id))}
                            style={[styles.stepperBtn, { borderColor: theme.colors.outline }]}
                            labelStyle={{ fontSize: 18, marginHorizontal: 0 }}
                            contentStyle={styles.stepperBtnContent}
                            disabled={qty === 0}
                        >
                            −
                        </Button>

                        <RNTextInput
                            style={[
                                styles.qtyInput,
                                {
                                    color: theme.colors.onSurface,
                                    borderColor: rowActive ? theme.colors.primary : theme.colors.outline,
                                    backgroundColor: theme.dark ? '#251C14' : '#FFFFFF',
                                },
                            ]}
                            value={qty === 0 ? '' : String(qty)}
                            placeholder="0"
                            placeholderTextColor={theme.colors.onSurfaceVariant}
                            keyboardType="number-pad"
                            textAlign="center"
                            textAlignVertical="center"
                            onChangeText={(text) => {
                                const n = parseInt(text, 10);
                                setQuantity(String(item.id), isNaN(n) || n < 0 ? 0 : n);
                            }}
                            selectTextOnFocus
                        />

                        <Button
                            mode="outlined"
                            compact
                            onPress={() => increment(String(item.id))}
                            style={[styles.stepperBtn, { borderColor: theme.colors.outline }]}
                            labelStyle={{ fontSize: 18, marginHorizontal: 0 }}
                            contentStyle={styles.stepperBtnContent}
                        >
                            +
                        </Button>
                    </View>
                </View>

                {/* Right: unit price */}
                <View style={styles.priceCol}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>
                        ₺/adet
                    </Text>
                    <RNTextInput
                        style={[
                            styles.priceInput,
                            {
                                color: theme.colors.onSurface,
                                borderColor: theme.colors.outline,
                                backgroundColor: theme.dark ? '#251C14' : '#FFFFFF',
                            },
                        ]}
                        value={String(price)}
                        keyboardType="decimal-pad"
                        textAlign="center"
                        textAlignVertical="center"
                        onChangeText={(text) => {
                            const cleaned = text.replace(',', '.');
                            const n = parseFloat(cleaned);
                            setUnitPrice(String(item.id), isNaN(n) || n < 0 ? 0 : n);
                        }}
                        selectTextOnFocus
                    />
                </View>
            </Surface>
        );
    };

    // ── Empty state ──────────────────────────────────────
    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <ShoppingBag size={64} color={theme.colors.onSurfaceVariant} strokeWidth={1} />
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
                    Henüz müşteri yok
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Önce müşteri ekleyin
                </Text>
            </View>
        );
    };

    // ── Main render ──────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header info */}
            <View style={[styles.headerBar, { backgroundColor: theme.dark ? '#251C14' : '#FFF3E6' }]}>
                <ClipboardList size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginLeft: 8, fontWeight: '500' }}>
                    Günlük Sipariş Girişi
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                        Müşteriler yükleniyor...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={customers}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderRow}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                />
            )}

            {/* Bottom summary bar */}
            {summary.customerCount > 0 && (
                <Surface
                    style={[styles.summaryBar, { backgroundColor: theme.dark ? '#2A2018' : '#FFF3E6' }]}
                    elevation={4}
                >
                    <View style={styles.summaryInfo}>
                        <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                            {summary.totalQuantity} lavaş
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {summary.customerCount} müşteri · {formatCurrency(summary.totalAmount)}
                        </Text>
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting}
                        style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
                        contentStyle={{ paddingVertical: 4 }}
                        labelStyle={{ fontWeight: '700' }}
                    >
                        Günlüğü Tamamla
                    </Button>
                </Surface>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 12,
        paddingBottom: 120,
        flexGrow: 1,
    },
    row: {
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
    },
    customerCol: {
        flex: 1,
        marginRight: 8,
    },
    stepperCol: {
        alignItems: 'center',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    stepperBtn: {
        minWidth: 36,
        borderRadius: 8,
    },
    stepperBtnContent: {
        width: 36,
        height: 36,
    },
    qtyInput: {
        width: 50,
        height: 38,
        borderWidth: 1.5,
        borderRadius: 8,
        fontSize: 16,
        fontWeight: '700',
        paddingHorizontal: 4,
        paddingVertical: 0,
        includeFontPadding: false,
    },
    priceCol: {
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        minWidth: 60,
    },
    priceInput: {
        width: 60,
        height: 40,
        borderWidth: 1,
        borderRadius: 8,
        fontSize: 14,
        paddingHorizontal: 4,
        paddingVertical: 0,
        textAlignVertical: 'center',
        includeFontPadding: false,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    summaryBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    summaryInfo: {
        flex: 1,
        marginRight: 12,
    },
    submitBtn: {
        borderRadius: 12,
    },
});

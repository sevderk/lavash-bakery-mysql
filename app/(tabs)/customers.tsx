import { useFocusEffect, useRouter } from 'expo-router';
import { Phone, UserCircle, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';
import {
    ActivityIndicator,
    Card,
    FAB,
    Searchbar,
    Text,
    useTheme
} from 'react-native-paper';

import { getCustomers, type Customer } from '@/lib/api';

export default function CustomersScreen() {
    const theme = useTheme();
    const router = useRouter();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredCustomers = customers.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(amount);
    };

    const renderCustomer = ({ item }: { item: Customer }) => {
        const hasDebt = item.current_balance > 0;

        return (
            <Card
                style={[styles.customerCard, { backgroundColor: theme.colors.surface }]}
                mode="elevated"
                onPress={() => router.push({ pathname: '/customers/[id]', params: { id: item.id } })}
            >
                <Card.Content style={styles.customerCardContent}>
                    <View style={styles.customerInfo}>
                        <View style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}>
                            <UserCircle size={28} color={theme.colors.primary} />
                        </View>
                        <View style={styles.customerText}>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                                {item.name}
                            </Text>
                            {item.phone ? (
                                <View style={styles.phoneRow}>
                                    <Phone size={14} color={theme.colors.onSurfaceVariant} />
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                                        {item.phone}
                                    </Text>
                                </View>
                            ) : (
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Telefon girilmemiş
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.balanceContainer}>
                        <Text
                            variant="labelSmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                        >
                            Bakiye
                        </Text>
                        <Text
                            variant="titleMedium"
                            style={{
                                color: hasDebt ? '#D32F2F' : '#2E7D32',
                                fontWeight: '700',
                            }}
                        >
                            {formatCurrency(item.current_balance)}
                        </Text>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Users size={64} color={theme.colors.onSurfaceVariant} strokeWidth={1} />
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
                    Henüz müşteri eklenmemiş
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Aşağıdaki + butonuna basarak ilk müşterinizi ekleyin
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Search Bar */}
            <Searchbar
                placeholder="Müşteri ara..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
                inputStyle={{ color: theme.colors.onSurface }}
                iconColor={theme.colors.onSurfaceVariant}
                placeholderTextColor={theme.colors.onSurfaceVariant}
            />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                        Müşteriler yükleniyor...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredCustomers}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderCustomer}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                            tintColor={theme.colors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* FAB */}
            <FAB
                icon="plus"
                label="Yeni Müşteri"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="#FFFFFF"
                onPress={() => router.push('/customers/add')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchbar: {
        margin: 16,
        marginBottom: 8,
        borderRadius: 12,
        elevation: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
        paddingBottom: 100,
        flexGrow: 1,
    },
    customerCard: {
        borderRadius: 14,
        elevation: 2,
    },
    customerCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    customerText: {
        flex: 1,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    balanceContainer: {
        alignItems: 'flex-end',
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        borderRadius: 16,
    },
});

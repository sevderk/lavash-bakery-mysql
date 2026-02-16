import { useFocusEffect } from 'expo-router';
import { Banknote, Package, TrendingUp, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Text, useTheme } from 'react-native-paper';

import { getDashboardStats } from '@/lib/api';

interface DashboardStats {
    todayQuantity: number;
    todayRevenue: number;
    todayCustomerCount: number;
    totalDebt: number;
}

export default function HomeScreen() {
    const theme = useTheme();
    const [stats, setStats] = useState<DashboardStats>({
        todayQuantity: 0,
        todayRevenue: 0,
        todayCustomerCount: 0,
        totalDebt: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getDashboardStats();
            setStats(data);
        } catch (err: any) {
            console.error('Dashboard yükleme hatası:', err.message);
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchStats();
        }, [fetchStats])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStats();
    }, [fetchStats]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[theme.colors.primary]}
                    tintColor={theme.colors.primary}
                />
            }
        >
            {/* Brand Header */}
            <View style={styles.header}>
                <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.primary }]}>
                    🫓 Lavaş Fırını
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    Günlük Özet
                </Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.grid}>
                {/* Today's Production */}
                <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
                    <Card.Content style={styles.statContent}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}>
                            <Package size={24} color={theme.colors.primary} />
                        </View>
                        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
                            {stats.todayQuantity}
                        </Text>
                        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            Bugünün Üretimi
                        </Text>
                    </Card.Content>
                </Card>

                {/* Daily Revenue */}
                <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
                    <Card.Content style={styles.statContent}>
                        <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                            <TrendingUp size={24} color="#2E7D32" />
                        </View>
                        <Text variant="headlineMedium" style={{ color: '#2E7D32', fontWeight: '800' }}>
                            {formatCurrency(stats.todayRevenue)}
                        </Text>
                        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            Günlük Ciro
                        </Text>
                    </Card.Content>
                </Card>
            </View>

            <View style={styles.grid}>
                {/* Active Customers */}
                <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
                    <Card.Content style={styles.statContent}>
                        <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                            <Users size={24} color="#1565C0" />
                        </View>
                        <Text variant="headlineMedium" style={{ color: '#1565C0', fontWeight: '800' }}>
                            {stats.todayCustomerCount}
                        </Text>
                        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            Bugünkü Müşteri
                        </Text>
                    </Card.Content>
                </Card>

                {/* Total Debt */}
                <Card style={[styles.statCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
                    <Card.Content style={styles.statContent}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
                            <Banknote size={24} color="#D32F2F" />
                        </View>
                        <Text variant="headlineMedium" style={{ color: '#D32F2F', fontWeight: '800' }}>
                            {formatCurrency(stats.totalDebt)}
                        </Text>
                        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            Toplam Borç
                        </Text>
                    </Card.Content>
                </Card>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginTop: 8,
        marginBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontWeight: '700',
        marginBottom: 4,
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        elevation: 2,
    },
    statContent: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 6,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
});

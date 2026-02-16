import * as Clipboard from 'expo-clipboard';
import { cacheDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/src/legacy';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    MessageCircle
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    Text as RNText,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    ActivityIndicator,
    Divider,
    IconButton,
    Surface,
    Text,
    useTheme,
} from 'react-native-paper';
import * as XLSX from 'xlsx';

import { getReports } from '@/lib/api';

/** An order row joined with customer name */
interface ReportRow {
    id: string;
    customerName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    status: string;
    currentBalance: number;
}

export default function ReportsScreen() {
    const theme = useTheme();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Date helpers ───────────────────────────────────
    const formatDateTR = (d: Date) =>
        d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

    const formatDateShort = (d: Date) =>
        d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const isToday = (d: Date) => {
        const now = new Date();
        return d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();
    };

    const shiftDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        // Don't allow future dates
        if (d > new Date()) return;
        setSelectedDate(d);
    };

    // ── Fetch orders for selected date ─────────────────
    const fetchOrders = useCallback(async () => {
        const dayDate = selectedDate.toISOString().slice(0, 10); // YYYY-MM-DD

        try {
            const data = await getReports(dayDate);
            const mapped: ReportRow[] = data.map((o: any, index: number) => ({
                id: `${o.id}-${index}`,
                customerName: o.customer_name ?? 'Bilinmeyen',
                quantity: o.quantity,
                unitPrice: Number(o.unit_price),
                totalPrice: Number(o.total_price),
                status: o.status,
                currentBalance: Number(o.current_balance ?? 0),
            }));
            setRows(mapped);
        } catch (err: any) {
            console.error('Rapor yükleme hatası:', err.message);
            setRows([]);
        }

        setLoading(false);
        setRefreshing(false);
    }, [selectedDate]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchOrders();
        }, [fetchOrders])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchOrders();
    }, [fetchOrders]);

    // ── Summary ────────────────────────────────────────
    const summary = useMemo(() => {
        let totalQty = 0;
        let totalAmount = 0;
        for (const r of rows) {
            totalQty += r.quantity;
            totalAmount += r.totalPrice;
        }
        return { totalQty, totalAmount, count: rows.length };
    }, [rows]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

    const statusLabel = (s: string) => (s === 'paid' ? 'Ödendi' : 'Ödenmedi');

    // ── Excel Export ───────────────────────────────────
    const handleExcelExport = async () => {
        if (rows.length === 0) {
            Alert.alert('Uyarı', 'Dışa aktarılacak sipariş bulunamadı.');
            return;
        }

        try {
            const wsData = [
                ['Müşteri', 'Miktar', 'Birim Fiyat', 'Toplam', 'Durum'],
                ...rows.map((r) => [
                    r.customerName,
                    r.quantity,
                    r.unitPrice,
                    r.totalPrice,
                    statusLabel(r.status),
                ]),
                [],
                ['TOPLAM', summary.totalQty, '', summary.totalAmount, ''],
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Column widths
            ws['!cols'] = [
                { wch: 25 }, // Müşteri
                { wch: 10 }, // Miktar
                { wch: 12 }, // Birim Fiyat
                { wch: 12 }, // Toplam
                { wch: 15 }, // Durum
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Dağıtım');

            const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
            const fileName = `dagitim_${formatDateShort(selectedDate).replace(/\./g, '-')}.xlsx`;
            const filePath = `${cacheDirectory}${fileName}`;

            await writeAsStringAsync(filePath, wbout, {
                encoding: EncodingType.Base64,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(filePath, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Dağıtım Listesini Paylaş',
                });
            } else {
                Alert.alert('Bilgi', 'Paylaşım bu cihazda desteklenmiyor.');
            }
        } catch (err: any) {
            console.error('Excel hatası:', err);
            Alert.alert('Hata', `Excel oluşturulamadı: ${err.message}`);
        }
    };

    // ── WhatsApp List ──────────────────────────────────
    const handleWhatsAppList = async () => {
        if (rows.length === 0) {
            Alert.alert('Uyarı', 'Paylaşılacak sipariş bulunamadı.');
            return;
        }

        const dateStr = formatDateShort(selectedDate);
        let text = `📅 ${dateStr} Dağıtım Listesi\n\n`;

        for (const r of rows) {
            text += `${r.customerName}: ${r.quantity} Adet\n`;
        }

        text += `=============\n`;
        text += `Toplam: ${summary.totalQty} Adet\n`;
        text += `Ciro: ${formatCurrency(summary.totalAmount)}`;

        try {
            await Clipboard.setStringAsync(text);
            Alert.alert(
                'Kopyalandı! 📋',
                'Dağıtım listesi panoya kopyalandı. WhatsApp\'a yapıştırabilirsiniz.',
                [{ text: 'Tamam' }]
            );
        } catch (err: any) {
            console.error('Pano hatası:', err);
            Alert.alert('Hata', 'Panoya kopyalanamadı.');
        }
    };

    // ── Render row ─────────────────────────────────────
    const renderRow = ({ item }: { item: ReportRow }) => {
        const isPaid = item.status === 'paid' || item.currentBalance <= 0;

        return (
            <Surface
                style={[styles.row, { backgroundColor: theme.colors.surface }]}
                elevation={1}
            >
                <View style={styles.rowLeft}>
                    <Text
                        variant="titleSmall"
                        style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                        numberOfLines={1}
                    >
                        {item.customerName}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {item.quantity} Adet × {formatCurrency(item.unitPrice)}
                    </Text>
                </View>

                <View style={styles.rowRight}>
                    <Text
                        variant="titleSmall"
                        style={{ color: theme.colors.primary, fontWeight: '700' }}
                    >
                        {formatCurrency(item.totalPrice)}
                    </Text>
                    <View style={{
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        backgroundColor: isPaid ? '#E8F5E9' : '#FFF3E0',
                    }}>
                        <RNText style={{
                            fontSize: 10,
                            color: isPaid ? '#2E7D32' : '#E65100',
                            fontWeight: 'bold',
                            includeFontPadding: false,
                            textAlignVertical: 'center',
                            lineHeight: 12,
                        }}>
                            {isPaid ? 'Ödendi' : 'Ödenmedi'}
                        </RNText>
                    </View>
                </View>
            </Surface>
        );
    };

    // ── Empty state ────────────────────────────────────
    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Calendar size={56} color={theme.colors.onSurfaceVariant} strokeWidth={1} />
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
                    Bu tarihte sipariş yok
                </Text>
            </View>
        );
    };

    // ── Main render ────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Date Navigation */}
            <Surface style={[styles.dateBar, { backgroundColor: theme.dark ? '#251C14' : '#FFF3E6' }]} elevation={2}>
                <IconButton
                    icon={() => <ChevronLeft size={22} color={theme.colors.primary} />}
                    onPress={() => shiftDate(-1)}
                    size={22}
                />
                <View style={styles.dateCenter}>
                    <Calendar size={16} color={theme.colors.primary} />
                    <Text
                        variant="titleSmall"
                        style={{
                            color: theme.colors.primary,
                            fontWeight: '600',
                            marginLeft: 6,
                            textAlignVertical: 'center',
                            includeFontPadding: false,
                            paddingTop: 0,
                            marginTop: 0,
                        }}
                    >
                        {formatDateTR(selectedDate)}
                    </Text>
                    {isToday(selectedDate) && (
                        <View style={{
                            marginLeft: 8,
                            height: 24,
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingHorizontal: 8,
                            borderRadius: 12,
                            backgroundColor: '#D2691E',
                        }}>
                            <RNText style={{
                                fontSize: 12,
                                color: '#FFFFFF',
                                fontWeight: 'bold',
                                includeFontPadding: false,
                                textAlignVertical: 'center',
                                lineHeight: 14,
                            }}>
                                Bugün
                            </RNText>
                        </View>
                    )}
                </View>
                <IconButton
                    icon={() => <ChevronRight size={22} color={isToday(selectedDate) ? theme.colors.outline : theme.colors.primary} />}
                    onPress={() => shiftDate(1)}
                    disabled={isToday(selectedDate)}
                    size={22}
                />
            </Surface>

            {/* Summary Strip */}
            {rows.length > 0 && (
                <View style={[styles.summaryStrip, { backgroundColor: theme.dark ? '#1A1210' : '#FFFAF5' }]}>
                    <View style={styles.summaryItem}>
                        <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: '800' }}>
                            {summary.totalQty}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Toplam Adet</Text>
                    </View>
                    <Divider style={{ width: 1, height: 32 }} />
                    <View style={styles.summaryItem}>
                        <Text variant="headlineSmall" style={{ color: '#2E7D32', fontWeight: '800' }}>
                            {formatCurrency(summary.totalAmount)}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Toplam Ciro</Text>
                    </View>
                    <Divider style={{ width: 1, height: 32 }} />
                    <View style={styles.summaryItem}>
                        <Text variant="headlineSmall" style={{ color: '#1565C0', fontWeight: '800' }}>
                            {summary.count}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Sipariş</Text>
                    </View>
                </View>
            )}

            {/* Order List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={rows}
                    keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : index.toString()}
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
                />
            )}

            {/* Export Buttons */}
            {rows.length > 0 && (
                <Surface
                    style={[styles.exportBar, { backgroundColor: theme.dark ? '#2A2018' : '#FFF3E6' }]}
                    elevation={4}
                >
                    <TouchableOpacity
                        onPress={handleExcelExport}
                        style={{
                            flex: 1,
                            height: 50,
                            backgroundColor: '#1B5E20',
                            borderRadius: 8,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 0,
                        }}
                        activeOpacity={0.7}
                    >
                        <FileSpreadsheet size={18} color="white" style={{ marginRight: 6 }} />
                        <RNText style={{
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 'bold',
                            includeFontPadding: false,
                            textAlignVertical: 'center',
                            lineHeight: 18,
                        }}>
                            Excel İndir
                        </RNText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleWhatsAppList}
                        style={{
                            flex: 1,
                            height: 50,
                            backgroundColor: '#25D366',
                            borderRadius: 8,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 0,
                        }}
                        activeOpacity={0.7}
                    >
                        <MessageCircle size={18} color="white" style={{ marginRight: 6 }} />
                        <RNText style={{
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 'bold',
                            includeFontPadding: false,
                            textAlignVertical: 'center',
                            lineHeight: 18,
                        }}>
                            WhatsApp Listesi
                        </RNText>
                    </TouchableOpacity>
                </Surface>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    dateBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 0,
        height: 50,
    },
    dateCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryStrip: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    summaryItem: {
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 12,
        paddingBottom: 100,
        flexGrow: 1,
    },
    row: {
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowLeft: {
        flex: 1,
        marginRight: 8,
    },
    rowRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    exportBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
});

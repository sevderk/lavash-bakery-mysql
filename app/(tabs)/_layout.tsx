import { Tabs } from 'expo-router';
import { ClipboardList, FileText, Home, Users } from 'lucide-react-native';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: isDark ? '#F4A460' : '#D2691E',
                tabBarInactiveTintColor: isDark ? '#9BA1A6' : '#687076',
                tabBarStyle: {
                    backgroundColor: isDark ? '#1A1210' : '#FFFAF5',
                    borderTopColor: isDark ? '#2A2018' : '#F0E6D9',
                },
                headerStyle: {
                    backgroundColor: isDark ? '#1A1210' : '#FFFAF5',
                },
                headerTintColor: isDark ? '#F4A460' : '#D2691E',
                headerShown: true,
                tabBarButton: HapticTab,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Ana Sayfa',
                    tabBarIcon: ({ color, size }) => <Home size={size ?? 24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Siparişler',
                    tabBarIcon: ({ color, size }) => <ClipboardList size={size ?? 24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="customers"
                options={{
                    title: 'Müşteriler',
                    tabBarIcon: ({ color, size }) => <Users size={size ?? 24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: 'Raporlar',
                    tabBarIcon: ({ color, size }) => <FileText size={size ?? 24} color={color} />,
                }}
            />
            {/* Hide the old explore tab */}
            <Tabs.Screen name="explore" options={{ href: null }} />
        </Tabs>
    );
}


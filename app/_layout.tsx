import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
    anchor: '(tabs)',
};

// Custom Paper theme with bakery brand colors
const lightPaperTheme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: '#D2691E',
        primaryContainer: '#FFDAB9',
        secondary: '#8B4513',
        secondaryContainer: '#FFE4C4',
        surface: '#FFFAF5',
        background: '#FFFAF5',
    },
};

const darkPaperTheme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: '#F4A460',
        primaryContainer: '#5C3317',
        secondary: '#DEB887',
        secondaryContainer: '#3E2723',
        surface: '#1A1210',
        background: '#1A1210',
    },
};

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <PaperProvider theme={isDark ? darkPaperTheme : lightPaperTheme}>
            <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
                <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="customers/add"
                        options={{
                            title: 'Yeni Müşteri',
                            presentation: 'modal',
                            headerStyle: { backgroundColor: isDark ? '#1A1210' : '#FFFAF5' },
                            headerTintColor: isDark ? '#F4A460' : '#D2691E',
                        }}
                    />
                    <Stack.Screen
                        name="customers/[id]"
                        options={{
                            title: 'Müşteri Detayı',
                            headerStyle: { backgroundColor: isDark ? '#1A1210' : '#FFFAF5' },
                            headerTintColor: isDark ? '#F4A460' : '#D2691E',
                        }}
                    />
                    <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
                <StatusBar style="auto" />
            </ThemeProvider>
        </PaperProvider>
    );
}

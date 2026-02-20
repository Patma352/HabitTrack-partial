import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

function RootLayout() {
  const { isDark, colors } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="habit/[type]" options={{ headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary, headerTitle: '' }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary, headerTitle: '' }} />
        <Stack.Screen name="orders" options={{ headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary, headerTitle: 'My Orders' }} />
        <Stack.Screen name="admin/index" options={{ headerShown: true, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary, headerTitle: 'Admin Panel' }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

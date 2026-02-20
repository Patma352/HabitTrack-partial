import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions, SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function LoginScreen() {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [showWebView, setShowWebView] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const isProcessing = useRef(false);

  const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(BACKEND_URL)}`;
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

  const handleSessionId = async (sessionId: string) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setShowWebView(false);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (resp.ok) {
        const data = await resp.json();
        await login(data.user, data.session_token);
        router.replace('/(tabs)/home');
      }
    } catch (e) {
      console.error('Session error:', e);
      isProcessing.current = false;
    }
  };

  const handleNavigationChange = (state: { url: string }) => {
    const url = state.url;
    if (BACKEND_URL && url.startsWith(BACKEND_URL) && url.includes('session_id=')) {
      const match = url.match(/session_id=([^&\s#]+)/);
      if (match) handleSessionId(match[1]);
    }
  };

  const handleShouldStartLoad = (request: { url: string }) => {
    const url = request.url;
    if (BACKEND_URL && url.startsWith(BACKEND_URL) && url.includes('session_id=')) {
      const match = url.match(/session_id=([^&\s#]+)/);
      if (match) handleSessionId(match[1]);
      return false;
    }
    return true;
  };

  if (showWebView) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity testID="close-webview-btn" onPress={() => { setShowWebView(false); isProcessing.current = false; }} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕ Cancel</Text>
          </TouchableOpacity>
        </View>
        {webViewLoading && (
          <View style={styles.webViewLoader}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        <WebView
          testID="auth-webview"
          source={{ uri: authUrl }}
          onNavigationStateChange={handleNavigationChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onLoadStart={() => setWebViewLoading(true)}
          onLoadEnd={() => setWebViewLoading(false)}
          style={styles.webView}
          javaScriptEnabled
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header graphic */}
      <View style={styles.heroSection}>
        <View style={[styles.coinBadge, { backgroundColor: colors.secondary }]}>
          <Text style={styles.coinEmoji}>🪙</Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>HabitCoin</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Build habits. Earn coins. Shop rewards.
        </Text>
      </View>

      {/* Feature highlights */}
      <View style={styles.features}>
        {[
          { icon: '👟', text: 'Track steps, water, sleep & calories' },
          { icon: '🪙', text: 'Earn coins for completing goals' },
          { icon: '🛍️', text: 'Spend coins on exclusive clothing' },
        ].map((f, i) => (
          <View key={i} style={[styles.featureRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={[styles.featureText, { color: colors.textPrimary }]}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Google login button */}
      <TouchableOpacity
        testID="google-login-btn"
        style={[styles.googleBtn, { backgroundColor: colors.primary }]}
        onPress={() => { isProcessing.current = false; setShowWebView(true); setWebViewLoading(true); }}
        activeOpacity={0.85}
      >
        <Text style={styles.googleBtnText}>🔐 Continue with Google</Text>
      </TouchableOpacity>

      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
        1 Coin = ₹1 Rupee Value
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heroSection: { alignItems: 'center', marginBottom: 40 },
  coinBadge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  coinEmoji: { fontSize: 40 },
  title: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  subtitle: { fontSize: 16, marginTop: 8, textAlign: 'center' },
  features: { width: '100%', marginBottom: 40, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, gap: 12 },
  featureIcon: { fontSize: 24 },
  featureText: { fontSize: 15, fontWeight: '500' },
  googleBtn: { width: '100%', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footerText: { marginTop: 16, fontSize: 13 },
  webViewHeader: { backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 12 },
  closeBtn: { alignSelf: 'flex-end' },
  closeBtnText: { color: '#fff', fontSize: 16 },
  webViewLoader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', zIndex: 10 },
  webView: { flex: 1 },
});

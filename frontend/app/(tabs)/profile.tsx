import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const s = makeStyles(colors);
  const menuItems = [
    { icon: '📦', label: 'My Orders', onPress: () => router.push('/orders'), testID: 'orders-btn' },
    ...(user?.is_admin ? [{ icon: '⚙️', label: 'Admin Panel', onPress: () => router.push('/admin/'), testID: 'admin-btn' }] : []),
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Profile</Text>

        {/* User card */}
        <View style={[s.userCard, { backgroundColor: colors.surface }]}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={[s.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={s.avatarInitial}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={s.userInfo}>
            <Text style={[s.userName, { color: colors.textPrimary }]}>{user?.name}</Text>
            <Text style={[s.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
            {user?.is_admin && (
              <View style={[s.adminBadge, { backgroundColor: colors.primary }]}>
                <Text style={s.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
        </View>

        {/* Coin balance */}
        <View style={[s.coinCard, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary + '40' }]}>
          <Text style={s.coinEmoji}>🪙</Text>
          <View>
            <Text style={[s.coinBalance, { color: colors.secondary }]}>{user?.coins || 0} Coins</Text>
            <Text style={[s.coinValue, { color: colors.textSecondary }]}>Worth ₹{user?.coins || 0}</Text>
          </View>
          <TouchableOpacity testID="shop-now-btn" style={[s.shopBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(tabs)/shop')}>
            <Text style={s.shopBtnText}>Shop</Text>
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>SETTINGS</Text>

        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.menuRow}>
            <View style={s.menuLeft}>
              <Text style={s.menuIcon}>{isDark ? '🌙' : '☀️'}</Text>
              <Text style={[s.menuLabel, { color: colors.textPrimary }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
            </View>
            <Switch
              testID="theme-toggle"
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={isDark ? colors.primary : '#fff'}
            />
          </View>

          {menuItems.map((item, i) => (
            <React.Fragment key={i}>
              <View style={[s.separator, { backgroundColor: colors.border }]} />
              <TouchableOpacity testID={item.testID} style={s.menuRow} onPress={item.onPress}>
                <View style={s.menuLeft}>
                  <Text style={s.menuIcon}>{item.icon}</Text>
                  <Text style={[s.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                </View>
                <Text style={[s.chevron, { color: colors.textSecondary }]}>›</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Coin guide */}
        <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>HOW IT WORKS</Text>
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { icon: '👟', text: 'Complete Step Goal → 10 coins' },
            { icon: '💧', text: 'Complete Water Goal → 8 coins' },
            { icon: '😴', text: 'Complete Sleep Goal → 5 coins' },
            { icon: '🔥', text: 'Complete Calorie Goal → 7 coins' },
            { icon: '🛍️', text: 'Use coins to buy clothing in Shop' },
          ].map((item, i) => (
            <View key={i} style={s.guideRow}>
              <Text style={s.menuIcon}>{item.icon}</Text>
              <Text style={[s.guideText, { color: colors.textPrimary }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity testID="logout-btn" style={[s.logoutBtn, { borderColor: colors.error }]} onPress={handleLogout}>
          <Text style={[s.logoutText, { color: colors.error }]}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1 },
  pageTitle: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  userCard: { marginHorizontal: 16, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16, shadowColor: '#00000015', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 28, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2 },
  adminBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6 },
  adminBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  coinCard: { marginHorizontal: 16, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, borderWidth: 1 },
  coinEmoji: { fontSize: 32 },
  coinBalance: { fontSize: 20, fontWeight: '700' },
  coinValue: { fontSize: 12, marginTop: 2 },
  shopBtn: { marginLeft: 'auto', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  shopBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8, letterSpacing: 0.5 },
  section: { marginHorizontal: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: { fontSize: 20 },
  menuLabel: { fontSize: 15, fontWeight: '500' },
  chevron: { fontSize: 20 },
  separator: { height: 1, marginHorizontal: 16 },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  guideText: { fontSize: 14 },
  logoutBtn: { marginHorizontal: 16, marginBottom: 40, borderRadius: 16, borderWidth: 1.5, padding: 16, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '600' },
});

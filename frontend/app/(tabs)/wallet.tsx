import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CircularProgress from '../../components/CircularProgress';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
  const { user, apiCall } = useAuth();
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCoins = useCallback(async () => {
    try {
      const resp = await apiCall('/api/coins');
      if (resp.ok) setData(await resp.json());
    } catch (e) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiCall]);

  useEffect(() => { fetchCoins(); }, []);

  const earned = data?.transactions?.filter((t: any) => t.amount > 0).reduce((s: number, t: any) => s + t.amount, 0) || 0;
  const spent = Math.abs(data?.transactions?.filter((t: any) => t.amount < 0).reduce((s: number, t: any) => s + t.amount, 0) || 0);

  const s = makeStyles(colors);

  const renderTx = ({ item }: { item: any }) => {
    const isEarned = item.amount > 0;
    return (
      <View testID={`tx-item-${item.tx_id}`} style={[s.txRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[s.txIcon, { backgroundColor: isEarned ? colors.success + '20' : colors.error + '20' }]}>
          <Text style={s.txIconText}>{isEarned ? '🪙' : '🛍️'}</Text>
        </View>
        <View style={s.txInfo}>
          <Text style={[s.txDesc, { color: colors.textPrimary }]} numberOfLines={1}>{item.description}</Text>
          <Text style={[s.txDate, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={[s.txAmount, { color: isEarned ? colors.success : colors.error }]}>
          {isEarned ? '+' : ''}{item.amount}
        </Text>
      </View>
    );
  };

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <FlatList
        testID="wallet-list"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCoins(); }} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <Text style={[s.pageTitle, { color: colors.textPrimary }]}>My Wallet</Text>

            {/* Balance card */}
            <View style={[s.balanceCard, { backgroundColor: colors.surface }]}>
              <CircularProgress size={120} progress={Math.min((data?.balance || 0) / 500 * 100, 100)} color={colors.secondary} bgColor={colors.secondary + '20'} strokeWidth={10}>
                <Text style={s.balanceEmoji}>🪙</Text>
              </CircularProgress>
              <View style={s.balanceInfo}>
                <Text style={[s.balanceAmount, { color: colors.secondary }]}>{data?.balance || 0}</Text>
                <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Total Coins</Text>
                <Text style={[s.balanceRupee, { color: colors.textPrimary }]}>₹{data?.balance || 0} Value</Text>
              </View>
            </View>

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
                <Text style={[s.statValue, { color: colors.success }]}>+{earned}</Text>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>Total Earned</Text>
              </View>
              <View style={[s.statCard, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
                <Text style={[s.statValue, { color: colors.error }]}>-{spent}</Text>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>Total Spent</Text>
              </View>
            </View>

            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Transaction History</Text>
          </>
        }
        data={data?.transactions || []}
        keyExtractor={(item) => item.tx_id}
        renderItem={renderTx}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📋</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No transactions yet</Text>
            <Text style={[s.emptyHint, { color: colors.textSecondary }]}>Complete habits to earn your first coins!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1 },
  pageTitle: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  balanceCard: { marginHorizontal: 16, borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 24, shadowColor: '#00000020', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3, marginBottom: 16 },
  balanceEmoji: { fontSize: 28 },
  balanceInfo: { flex: 1 },
  balanceAmount: { fontSize: 48, fontWeight: '800', lineHeight: 52 },
  balanceLabel: { fontSize: 13, marginTop: 2 },
  balanceRupee: { fontSize: 18, fontWeight: '600', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, gap: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  txIconText: { fontSize: 20 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '500' },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptyHint: { fontSize: 13, textAlign: 'center' },
});

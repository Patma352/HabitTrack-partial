import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#34C759',
  shipped: '#007AFF',
  delivered: '#5856D6',
  cancelled: '#FF3B30',
};

export default function OrdersScreen() {
  const { apiCall } = useAuth();
  const { colors } = useTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const resp = await apiCall('/api/orders');
      if (resp.ok) setOrders(await resp.json());
    } catch (e) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiCall]);

  useEffect(() => { fetchOrders(); }, []);

  const s = makeStyles(colors);

  const renderOrder = ({ item }: { item: any }) => (
    <View testID={`order-item-${item.order_id}`} style={[s.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Image source={{ uri: item.product_image }} style={s.orderImg} resizeMode="cover" />
      <View style={s.orderInfo}>
        <Text style={[s.orderName, { color: colors.textPrimary }]} numberOfLines={2}>{item.product_name}</Text>
        {item.size && <Text style={[s.orderSize, { color: colors.textSecondary }]}>Size: {item.size}</Text>}
        <View style={s.orderMeta}>
          <View style={[s.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#888') + '20' }]}>
            <Text style={[s.statusText, { color: STATUS_COLORS[item.status] || '#888' }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          <Text style={[s.coinSpent, { color: colors.secondary }]}>🪙 {item.price_coins}</Text>
        </View>
        <Text style={[s.orderDate, { color: colors.textSecondary }]}>
          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
    </View>
  );

  if (loading) return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <FlatList
        testID="orders-list"
        data={orders}
        keyExtractor={(item) => item.order_id}
        renderItem={renderOrder}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📦</Text>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No orders yet</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>Complete habits to earn coins and start shopping!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 40 },
  orderCard: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1 },
  orderImg: { width: 100, height: 100 },
  orderInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  orderName: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  orderSize: { fontSize: 12, marginTop: 2 },
  orderMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '600' },
  coinSpent: { fontSize: 13, fontWeight: '700' },
  orderDate: { fontSize: 11, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 240 },
});

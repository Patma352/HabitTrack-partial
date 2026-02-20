import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Shoes', 'Accessories'];

export default function ShopScreen() {
  const { apiCall, user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchProducts = useCallback(async () => {
    try {
      const url = activeCategory !== 'All' ? `/api/products?category=${activeCategory}` : '/api/products';
      const resp = await apiCall(url);
      if (resp.ok) setProducts(await resp.json());
    } catch (e) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiCall, activeCategory]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const s = makeStyles(colors);

  const renderProduct = ({ item }: { item: any }) => (
    <TouchableOpacity
      testID={`product-card-${item.product_id}`}
      style={[s.card, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/product/${item.product_id}`)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.image_url }} style={s.cardImg} resizeMode="cover" />
      <View style={s.cardInfo}>
        <Text style={[s.cardName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[s.cardCategory, { color: colors.textSecondary }]}>{item.category}</Text>
        <View style={s.cardFooter}>
          <View style={[s.priceBadge, { backgroundColor: colors.secondary }]}>
            <Text style={s.priceText}>🪙 {item.price_coins}</Text>
          </View>
          {item.stock < 10 && <Text style={[s.stockText, { color: colors.error }]}>Low stock</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>Shop</Text>
        <TouchableOpacity testID="wallet-shortcut-shop" onPress={() => router.push('/(tabs)/wallet')} style={[s.coinBadge, { backgroundColor: colors.secondary }]}>
          <Text style={s.coinBadgeText}>🪙 {user?.coins || 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(i) => i}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`category-${item}`}
            style={[s.categoryChip, { backgroundColor: activeCategory === item ? colors.primary : colors.surface, borderColor: activeCategory === item ? colors.primary : colors.border }]}
            onPress={() => setActiveCategory(item)}
          >
            <Text style={[s.categoryText, { color: activeCategory === item ? '#fff' : colors.textPrimary }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Product grid */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : products.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🏷️</Text>
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>No products in this category</Text>
        </View>
      ) : (
        <FlatList
          testID="product-list"
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.product_id}
          renderItem={renderProduct}
          contentContainerStyle={s.productGrid}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProducts(); }} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700' },
  coinBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  coinBadgeText: { fontSize: 14, fontWeight: '700', color: '#000' },
  categoryList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryText: { fontSize: 13, fontWeight: '600' },
  productGrid: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
  card: { width: CARD_W, borderRadius: 16, overflow: 'hidden', marginBottom: 0, shadowColor: '#00000020', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  cardImg: { width: '100%', height: CARD_W * 1.1 },
  cardInfo: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  cardCategory: { fontSize: 11, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priceText: { fontSize: 12, fontWeight: '700', color: '#000' },
  stockText: { fontSize: 10, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16 },
});

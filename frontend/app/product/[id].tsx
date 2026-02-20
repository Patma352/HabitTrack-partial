import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Alert, ActivityIndicator, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, apiCall, updateUser } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [buying, setBuying] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiCall(`/api/products/${id}`);
        if (resp.ok) {
          const data = await resp.json();
          setProduct(data);
          if (data.size_options?.length > 0) setSelectedSize(data.size_options[0]);
        }
      } catch (e) {} finally { setLoading(false); }
    })();
  }, [id]);

  const canAfford = (user?.coins || 0) >= (product?.price_coins || 0);

  const handleBuy = async () => {
    if (product?.size_options?.length > 0 && !selectedSize) {
      Alert.alert('Select Size', 'Please select a size before purchasing');
      return;
    }
    setConfirmModal(false);
    setBuying(true);
    try {
      const resp = await apiCall('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ product_id: id, size: selectedSize || null }),
      });
      if (resp.ok) {
        const result = await resp.json();
        updateUser({ coins: result.remaining_coins });
        setSuccessModal(true);
      } else {
        const err = await resp.json();
        Alert.alert('Error', err.detail || 'Purchase failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally { setBuying(false); }
  };

  const s = makeStyles(colors);

  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
  if (!product) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textPrimary }}>Product not found</Text>
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product image */}
        <Image source={{ uri: product.image_url }} style={s.productImg} resizeMode="cover" />

        <View style={s.content}>
          {/* Category */}
          <View style={[s.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[s.categoryText, { color: colors.primary }]}>{product.category}</Text>
          </View>

          {/* Name */}
          <Text style={[s.productName, { color: colors.textPrimary }]}>{product.name}</Text>

          {/* Price */}
          <View style={[s.priceRow, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary + '40' }]}>
            <Text style={[s.priceLabel, { color: colors.textSecondary }]}>Price</Text>
            <View style={s.priceValueRow}>
              <Text style={[s.priceCoins, { color: colors.secondary }]}>🪙 {product.price_coins} coins</Text>
              <Text style={[s.priceRupee, { color: colors.textSecondary }]}>≈ ₹{product.price_coins}</Text>
            </View>
          </View>

          {/* User balance */}
          <View style={[s.balanceRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.balanceLabel, { color: colors.textSecondary }]}>Your balance</Text>
            <Text style={[s.balanceValue, { color: canAfford ? colors.success : colors.error }]}>
              🪙 {user?.coins || 0} coins
            </Text>
          </View>

          {/* Description */}
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
          <Text style={[s.description, { color: colors.textSecondary }]}>{product.description}</Text>

          {/* Size selection */}
          {product.size_options?.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Select Size</Text>
              <View style={s.sizeRow}>
                {product.size_options.map((size: string) => (
                  <TouchableOpacity
                    key={size}
                    testID={`size-btn-${size}`}
                    style={[s.sizeChip, {
                      backgroundColor: selectedSize === size ? colors.primary : colors.surface,
                      borderColor: selectedSize === size ? colors.primary : colors.border,
                    }]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text style={[s.sizeText, { color: selectedSize === size ? '#fff' : colors.textPrimary }]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Stock */}
          <Text style={[s.stockInfo, { color: product.stock < 10 ? colors.error : colors.textSecondary }]}>
            {product.stock < 10 ? `⚠️ Only ${product.stock} left!` : `✅ ${product.stock} in stock`}
          </Text>

          {/* Buy button */}
          <TouchableOpacity
            testID="buy-with-coins-btn"
            style={[s.buyBtn, { backgroundColor: canAfford ? colors.primary : colors.border }]}
            onPress={() => setConfirmModal(true)}
            disabled={!canAfford || buying}
            activeOpacity={0.8}
          >
            {buying ? <ActivityIndicator size="small" color="#fff" /> : (
              <Text style={s.buyBtnText}>
                {canAfford ? `🛍️ Buy for 🪙${product.price_coins}` : '❌ Not enough coins'}
              </Text>
            )}
          </TouchableOpacity>

          {!canAfford && (
            <TouchableOpacity testID="earn-more-btn" onPress={() => router.push('/(tabs)/home')} style={[s.earnBtn, { borderColor: colors.primary }]}>
              <Text style={[s.earnBtnText, { color: colors.primary }]}>Earn more coins from habits →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Confirm Modal */}
      <Modal visible={confirmModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={s.modalEmoji}>🛍️</Text>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Confirm Purchase</Text>
            <Text style={[s.modalSub, { color: colors.textSecondary }]}>{product.name}</Text>
            <View style={[s.modalPriceRow, { backgroundColor: colors.secondary + '15' }]}>
              <Text style={[s.modalPrice, { color: colors.secondary }]}>🪙 {product.price_coins} coins</Text>
            </View>
            <Text style={[s.modalBalance, { color: colors.textSecondary }]}>
              Remaining after: 🪙 {(user?.coins || 0) - product.price_coins}
            </Text>
            <View style={s.modalBtns}>
              <TouchableOpacity testID="cancel-purchase-btn" style={[s.cancelBtn, { borderColor: colors.border }]} onPress={() => setConfirmModal(false)}>
                <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="confirm-purchase-btn" style={[s.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleBuy}>
                <Text style={s.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={s.modalEmoji}>🎉</Text>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Order Placed!</Text>
            <Text style={[s.modalSub, { color: colors.textSecondary }]}>Your {product.name} is on its way!</Text>
            <TouchableOpacity
              testID="view-orders-btn"
              style={[s.viewOrdersBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setSuccessModal(false); router.push('/orders'); }}
            >
              <Text style={s.viewOrdersText}>View My Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="continue-shopping-btn" onPress={() => { setSuccessModal(false); router.push('/(tabs)/shop'); }}>
              <Text style={[s.continueText, { color: colors.textSecondary }]}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  productImg: { width, height: width * 0.85 },
  content: { padding: 20 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 8 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  productName: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  priceLabel: { fontSize: 13 },
  priceValueRow: { alignItems: 'flex-end' },
  priceCoins: { fontSize: 20, fontWeight: '700' },
  priceRupee: { fontSize: 13 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  balanceLabel: { fontSize: 13 },
  balanceValue: { fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  sizeChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  sizeText: { fontSize: 14, fontWeight: '600' },
  stockInfo: { fontSize: 13, marginBottom: 20 },
  buyBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  buyBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  earnBtn: { height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, marginBottom: 32 },
  earnBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, alignItems: 'center' },
  modalEmoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 14, marginBottom: 16 },
  modalPriceRow: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, marginBottom: 8 },
  modalPrice: { fontSize: 20, fontWeight: '700' },
  modalBalance: { fontSize: 13, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  viewOrdersBtn: { height: 52, paddingHorizontal: 32, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  viewOrdersText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  continueText: { fontSize: 14, paddingBottom: 16 },
});

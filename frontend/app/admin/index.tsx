import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Image, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface ProductForm {
  name: string;
  description: string;
  price_coins: string;
  image_url: string;
  category: string;
  size_options: string;
  stock: string;
}

const EMPTY_FORM: ProductForm = { name: '', description: '', price_coins: '', image_url: '', category: 'Tops', size_options: 'S,M,L,XL', stock: '50' };
const CATEGORIES = ['Tops', 'Bottoms', 'Shoes', 'Accessories'];

export default function AdminPanel() {
  const { apiCall } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'products'>('stats');

  const fetchData = useCallback(async () => {
    try {
      const [statsResp, prodResp] = await Promise.all([
        apiCall('/api/admin/stats'),
        apiCall('/api/admin/products'),
      ]);
      if (statsResp.ok) setStats(await statsResp.json());
      if (prodResp.ok) setProducts(await prodResp.json());
    } catch (e) {} finally { setLoading(false); }
  }, [apiCall]);

  useEffect(() => { fetchData(); }, []);

  const openAddForm = () => {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (product: any) => {
    setEditProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      price_coins: String(product.price_coins),
      image_url: product.image_url,
      category: product.category,
      size_options: product.size_options?.join(',') || '',
      stock: String(product.stock),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price_coins || !form.image_url) {
      Alert.alert('Missing Fields', 'Name, price, and image URL are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price_coins: parseInt(form.price_coins),
        image_url: form.image_url,
        category: form.category,
        size_options: form.size_options ? form.size_options.split(',').map(s => s.trim()).filter(Boolean) : [],
        stock: parseInt(form.stock) || 50,
      };

      let resp;
      if (editProduct) {
        resp = await apiCall(`/api/products/${editProduct.product_id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        resp = await apiCall('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      }

      if (resp.ok) {
        Alert.alert('Success', editProduct ? 'Product updated!' : 'Product added!');
        setShowForm(false);
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to save product');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong');
    } finally { setSaving(false); }
  };

  const handleDelete = (product: any) => {
    Alert.alert('Delete Product', `Delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await apiCall(`/api/products/${product.product_id}`, { method: 'DELETE' });
        fetchData();
      }},
    ]);
  };

  const s = makeStyles(colors);

  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Tab bar */}
      <View style={[s.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(['stats', 'products'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            testID={`admin-tab-${tab}`}
            style={[s.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
              {tab === 'stats' ? '📊 Stats' : '📦 Products'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'stats' ? (
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.statsGrid}>
            {[
              { label: 'Total Users', value: stats?.users_count || 0, icon: '👤' },
              { label: 'Total Orders', value: stats?.orders_count || 0, icon: '📦' },
              { label: 'Active Products', value: stats?.products_count || 0, icon: '🛍️' },
            ].map((stat, i) => (
              <View key={i} testID={`stat-card-${i}`} style={[s.statCard, { backgroundColor: colors.surface }]}>
                <Text style={s.statIcon}>{stat.icon}</Text>
                <Text style={[s.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Recent Orders</Text>
          {stats?.recent_orders?.map((order: any) => (
            <View key={order.order_id} style={[s.recentOrder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.orderLeft}>
                <Text style={[s.orderName, { color: colors.textPrimary }]} numberOfLines={1}>{order.product_name}</Text>
                <Text style={[s.orderUser, { color: colors.textSecondary }]}>{new Date(order.created_at).toLocaleDateString('en-IN')}</Text>
              </View>
              <Text style={[s.orderCoins, { color: colors.secondary }]}>🪙 {order.price_coins}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <>
          <TouchableOpacity testID="add-product-btn" style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openAddForm}>
            <Text style={s.addBtnText}>+ Add Product</Text>
          </TouchableOpacity>
          <FlatList
            testID="admin-product-list"
            data={products}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={s.productList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[s.productRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Image source={{ uri: item.image_url }} style={s.productThumb} resizeMode="cover" />
                <View style={s.productInfo}>
                  <Text style={[s.productName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[s.productCategory, { color: colors.textSecondary }]}>{item.category}</Text>
                  <View style={s.productMeta}>
                    <Text style={[s.productCoins, { color: colors.secondary }]}>🪙 {item.price_coins}</Text>
                    <Text style={[s.productStock, { color: item.is_active ? colors.success : colors.error }]}>
                      {item.is_active ? `Stock: ${item.stock}` : 'Inactive'}
                    </Text>
                  </View>
                </View>
                <View style={s.productActions}>
                  <TouchableOpacity testID={`edit-product-${item.product_id}`} style={[s.actionBtn, { backgroundColor: colors.primary + '20' }]} onPress={() => openEditForm(item)}>
                    <Text style={[s.actionBtnText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={`delete-product-${item.product_id}`} style={[s.actionBtn, { backgroundColor: colors.error + '20' }]} onPress={() => handleDelete(item)}>
                    <Text style={[s.actionBtnText, { color: colors.error }]}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </>
      )}

      {/* Add/Edit Product Modal */}
      <Modal visible={showForm} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={[s.modalSafe, { backgroundColor: colors.background }]}>
            <View style={[s.modalHeader, { borderColor: colors.border }]}>
              <TouchableOpacity testID="close-form-btn" onPress={() => setShowForm(false)}>
                <Text style={[s.closeText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
                {editProduct ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity testID="save-product-btn" onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.primary} /> : (
                  <Text style={[s.saveText, { color: colors.primary }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={s.formScroll} keyboardShouldPersistTaps="handled">
              {[
                { label: 'Product Name *', key: 'name', placeholder: 'e.g. FitPro Hoodie' },
                { label: 'Description', key: 'description', placeholder: 'Product description...' },
                { label: 'Price (Coins) *', key: 'price_coins', placeholder: 'e.g. 150', keyboard: 'numeric' as const },
                { label: 'Image URL *', key: 'image_url', placeholder: 'https://...' },
                { label: 'Size Options (comma separated)', key: 'size_options', placeholder: 'S,M,L,XL' },
                { label: 'Stock', key: 'stock', placeholder: 'e.g. 50', keyboard: 'numeric' as const },
              ].map((field) => (
                <View key={field.key} style={s.formGroup}>
                  <Text style={[s.formLabel, { color: colors.textSecondary }]}>{field.label}</Text>
                  <TextInput
                    testID={`form-${field.key}`}
                    style={[s.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textSecondary}
                    value={(form as any)[field.key]}
                    onChangeText={(val) => setForm(prev => ({ ...prev, [field.key]: val }))}
                    keyboardType={field.keyboard || 'default'}
                    multiline={field.key === 'description'}
                    numberOfLines={field.key === 'description' ? 3 : 1}
                  />
                </View>
              ))}

              {/* Category picker */}
              <View style={s.formGroup}>
                <Text style={[s.formLabel, { color: colors.textSecondary }]}>Category</Text>
                <View style={s.catRow}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      testID={`category-pick-${cat}`}
                      style={[s.catChip, { backgroundColor: form.category === cat ? colors.primary : colors.surface, borderColor: form.category === cat ? colors.primary : colors.border }]}
                      onPress={() => setForm(prev => ({ ...prev, category: cat }))}
                    >
                      <Text style={[s.catText, { color: form.category === cat ? '#fff' : colors.textPrimary }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1, padding: 16 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#00000015', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  recentOrder: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  orderLeft: { flex: 1 },
  orderName: { fontSize: 14, fontWeight: '500' },
  orderUser: { fontSize: 12, marginTop: 2 },
  orderCoins: { fontSize: 15, fontWeight: '700' },
  addBtn: { margin: 16, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  productList: { paddingHorizontal: 16, paddingBottom: 40 },
  productRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 10, alignItems: 'center' },
  productThumb: { width: 72, height: 72 },
  productInfo: { flex: 1, padding: 10 },
  productName: { fontSize: 13, fontWeight: '600' },
  productCategory: { fontSize: 11, marginTop: 2 },
  productMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  productCoins: { fontSize: 12, fontWeight: '700' },
  productStock: { fontSize: 12 },
  productActions: { flexDirection: 'column', gap: 6, paddingRight: 10 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  closeText: { fontSize: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  saveText: { fontSize: 16, fontWeight: '600' },
  formScroll: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  formInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13, fontWeight: '500' },
});

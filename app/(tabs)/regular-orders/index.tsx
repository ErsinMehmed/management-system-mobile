import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

/* ─── Types ─── */
interface ProductRef {
  _id: string;
  name: string;
  flavor?: string;
  weight?: number;
  puffs?: number;
  count?: number;
  price?: number;
  units_per_box?: number;
}

interface Order {
  _id: string;
  quantity: number;
  total_amount: number;
  price: number;
  message?: string;
  date: string;
  product: ProductRef | string;
}

/* ─── Helpers ─── */
function productLabel(p: ProductRef) {
  return [
    p.name,
    p.flavor,
    p.weight ? `${p.weight}гр.` : null,
    p.puffs ? `${p.puffs}k` : null,
    p.count ? `${p.count}бр.` : null,
  ].filter(Boolean).join(' ');
}

/* ─── Order Card ─── */
function OrderCard({ order, onDelete, isAdmin }: { order: Order; onDelete: (id: string) => void; isAdmin: boolean }) {
  const product = typeof order.product === 'object' ? order.product : null;
  const name = product ? productLabel(product) : 'Непознат продукт';
  const boxes = product?.units_per_box ? order.quantity / product.units_per_box : null;

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 16, marginVertical: 5,
      padding: 16, borderLeftWidth: 4, borderLeftColor: colors.primary, ...shadow.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }} numberOfLines={2}>{name}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{dayjs(order.date).format('DD MMM YYYY · HH:mm')}</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="layers-outline" size={13} color={colors.textMuted} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>{order.quantity} бр.</Text>
            </View>
            {boxes !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="cube-outline" size={13} color={colors.textMuted} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>{boxes % 1 === 0 ? boxes : boxes.toFixed(1)} кашона</Text>
              </View>
            )}
          </View>
          {order.message ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>{order.message}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8, marginLeft: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{order.total_amount.toFixed(2)} €</Text>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => Alert.alert('Изтрий', 'Сигурен ли си?', [
                { text: 'Отмени', style: 'cancel' },
                { text: 'Изтрий', style: 'destructive', onPress: () => onDelete(order._id) },
              ])}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="trash-outline" size={14} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

/* ─── Product Picker Modal ─── */
function ProductPickerModal({ visible, products, selectedId, onSelect, onClose }: {
  visible: boolean; products: ProductRef[]; selectedId: string;
  onSelect: (p: ProductRef) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={onClose} />
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '65%', ...shadow.lg }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
          <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Избери продукт</Text>
        </View>
        <ScrollView>
          {products.map((p) => (
            <TouchableOpacity
              key={p._id}
              onPress={() => onSelect(p)}
              style={{
                padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: selectedId === p._id ? colors.primaryLight : 'transparent',
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>{productLabel(p)}</Text>
                {p.price ? <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{p.price.toFixed(2)} €</Text> : null}
              </View>
              {selectedId === p._id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ─── Create Modal ─── */
function CreateOrderModal({ visible, onClose, onSuccess, products, onOpenPicker, selectedProduct }: {
  visible: boolean; onClose: () => void; onSuccess: () => void; products: ProductRef[];
  onOpenPicker: () => void; selectedProduct: ProductRef | null;
}) {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);

  // Auto-fill price when product changes
  useEffect(() => {
    if (selectedProduct?.price) setPrice(selectedProduct.price.toString());
  }, [selectedProduct?._id]);

  const reset = () => { setQuantity(''); setPrice(''); setMessage(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity || !price) {
      Alert.alert('Непълни данни', 'Избери продукт, въведи количество и цена.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/orders', {
        product: selectedProduct._id,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        total_amount: total,
        message: message || undefined,
        date: new Date(),
      });
      reset();
      onSuccess();
    } catch (e: any) {
      Alert.alert('Грешка', e?.response?.data?.message ?? 'Неуспешно добавяне.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={handleClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', ...shadow.lg }}>
          <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ position: 'absolute', top: 8, left: '50%', marginLeft: -18, width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 8 }}>Нова поръчка</Text>
            <TouchableOpacity onPress={handleClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            {/* Product picker trigger */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>ПРОДУКТ *</Text>
              <TouchableOpacity
                onPress={onOpenPicker}
                style={{
                  backgroundColor: colors.bgInput, borderRadius: 14,
                  paddingHorizontal: 14, paddingVertical: 13,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  borderWidth: 1.5, borderColor: selectedProduct ? colors.primary : 'transparent',
                }}
              >
                <Text style={{ color: selectedProduct ? colors.textPrimary : colors.textMuted, fontSize: 15, flex: 1, marginRight: 8 }} numberOfLines={1}>
                  {selectedProduct ? productLabel(selectedProduct) : 'Избери продукт...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Quantity + Price row */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>КОЛИЧЕСТВО *</Text>
                <TextInput
                  style={{ backgroundColor: colors.bgInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary }}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>ЦЕНА (€) *</Text>
                <TextInput
                  style={{ backgroundColor: colors.bgInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary }}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Total preview */}
            {total > 0 && (
              <View style={{ backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>Обща сума</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{total.toFixed(2)} €</Text>
              </View>
            )}

            {/* Message */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>БЕЛЕЖКА</Text>
              <TextInput
                style={{ backgroundColor: colors.bgInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary }}
                value={message}
                onChangeText={setMessage}
                placeholder="Бележка..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={{ backgroundColor: saving ? colors.bgElevated : colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 4 }}
            >
              {saving
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Добави поръчка</Text>}
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Main Screen ─── */
export default function RegularOrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRef | null>(null);
  const pageRef = useRef(1);

  const fetchOrders = async (p = 1, replace = true) => {
    try {
      const res = await api.get(`/api/orders?page=${p}&per_page=20`);
      const items: Order[] = res.data.items ?? [];
      setOrders((prev) => replace ? items : [...prev, ...items]);
      setHasMore((res.data.pagination?.current_page ?? 1) < (res.data.pagination?.total_pages ?? 1));
      pageRef.current = p;
    } catch { /* ignore */ }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/api/products?per_page=100');
      setProducts(res.data.items ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    Promise.all([fetchOrders(), fetchProducts()]).finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(1);
    setRefreshing(false);
  }, []);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchOrders(pageRef.current + 1, false);
    setLoadingMore(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/orders?id=${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch {
      Alert.alert('Грешка', 'Неуспешно изтриване.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader title="Поръчки" icon="cart" />

        <FlatList
          data={orders}
          keyExtractor={(o: Order) => o._id}
          renderItem={({ item }: { item: Order }) => (
            <OrderCard order={item} onDelete={handleDelete} isAdmin={isAdmin} />
          )}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} />
              : <View style={{ height: 100 }} />
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View style={{ paddingTop: 16, paddingBottom: 4 }}>
              {loading ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textSecondary }}>Записи</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => setCreateVisible(true)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        backgroundColor: colors.primary, borderRadius: 12,
                        paddingHorizontal: 14, paddingVertical: 9, ...shadow.lg,
                      }}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Добави</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 10 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cart-outline" size={28} color={colors.primary} />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Няма поръчки</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>

      <BottomTabBar />

      <CreateOrderModal
        visible={createVisible && !pickerOpen}
        onClose={() => { setCreateVisible(false); setSelectedProduct(null); }}
        onSuccess={() => { setCreateVisible(false); setSelectedProduct(null); fetchOrders(1); }}
        products={products}
        onOpenPicker={() => setPickerOpen(true)}
        selectedProduct={selectedProduct}
      />

      <ProductPickerModal
        visible={pickerOpen}
        products={products}
        selectedId={selectedProduct?._id ?? ''}
        onSelect={(p) => { setSelectedProduct(p); setPickerOpen(false); }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

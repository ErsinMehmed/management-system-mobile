import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, Image, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';
import api from '@/services/api';

/* ─── Types ─── */
interface Product {
  _id: string;
  name: string;
  flavor?: string;
  weight?: number;
  puffs?: number;
  count?: number;
  price: number;
  sell_prices?: number[];
  availability: number;
  image_url?: string;
}

interface Sale {
  _id: string;
  product: Product;
  quantity: number;
  price: number;
  fuel_price?: number;
  additional_costs?: number;
  message?: string;
  date: string;
  is_wholesale?: boolean;
}

/* ─── Helpers ─── */
function productLabel(p: Product): string {
  const parts: string[] = [p.name];
  if (p.flavor) parts.push(p.flavor);
  if (p.weight) parts.push(`${p.weight}гр.`);
  if (p.puffs)  parts.push(`${p.puffs}k`);
  if (p.count)  parts.push(`${p.count}бр.`);
  return parts.join(' ');
}

/* ─── Product Picker ─── */
function ProductPicker({ products, value, onSelect }: {
  products: Product[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p._id === value);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>ПРОДУКТ *</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.bgInput, borderRadius: 14,
          paddingHorizontal: 14, paddingVertical: 13,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1.5, borderColor: value ? colors.primary : 'transparent',
        }}
      >
        <Text style={{ color: selected ? colors.textPrimary : colors.textMuted, fontSize: 15, flex: 1 }} numberOfLines={1}>
          {selected ? productLabel(selected) : 'Избери продукт...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '70%', ...shadow.lg }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Избери продукт</Text>
          </View>
          <ScrollView>
            {products.map((p) => (
              <TouchableOpacity
                key={p._id}
                onPress={() => { onSelect(p._id); setOpen(false); }}
                style={{
                  padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: value === p._id ? colors.primaryLight : 'transparent',
                }}
              >
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="cube-outline" size={18} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{productLabel(p)}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{p.availability} бр. налични</Text>
                </View>
                {value === p._id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Field ─── */
function Field({ label, value, onChangeText, placeholder, keyboardType, disabled, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; disabled?: boolean; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6, opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: colors.bgInput, borderRadius: 14,
          paddingHorizontal: 14, paddingVertical: 12,
          fontSize: 15, color: colors.textPrimary,
          borderWidth: 1.5, borderColor: 'transparent',
          ...(multiline ? { minHeight: 100, textAlignVertical: 'top' } : null),
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        editable={!disabled}
        multiline={multiline}
        numberOfLines={multiline ? 4 : undefined}
      />
    </View>
  );
}

/* ─── Create Sale Modal ─── */
function CreateSaleModal({ visible, onClose, onSuccess, products }: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: Product[];
}) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity]   = useState('');
  const [price, setPrice]         = useState('');
  const [fuelConsumption, setFuelConsumption] = useState('');
  const [dieselPrice, setDieselPrice]         = useState('');
  const [mileage, setMileage]                 = useState('');
  const [additionalCosts, setAdditionalCosts] = useState('');
  const [message, setMessage]     = useState('');
  const [saving, setSaving]       = useState(false);

  const fuelPrice = fuelConsumption && dieselPrice && mileage
    ? ((parseFloat(fuelConsumption) / 100) * parseFloat(mileage) * parseFloat(dieselPrice))
    : null;

  const canSetMileage = !!fuelConsumption && !!dieselPrice;

  // Auto-fill price from sell_prices
  useEffect(() => {
    if (!productId || !quantity) return;
    const p = products.find((x) => x._id === productId);
    if (!p) return;
    const qty = parseInt(quantity) || 1;
    const autoPrice = p.sell_prices?.[qty - 1] ?? p.price ?? 0;
    if (autoPrice) setPrice(String(autoPrice));
  }, [productId, quantity]);

  const reset = () => {
    setProductId(''); setQuantity(''); setPrice('');
    setFuelConsumption(''); setDieselPrice(''); setMileage('');
    setAdditionalCosts(''); setMessage('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!productId || !quantity || !price) {
      Alert.alert('Непълни данни', 'Попълни: продукт, количество и цена.');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        product: productId,
        quantity: parseInt(quantity),
        price: parseFloat(price),
      };
      if (fuelConsumption) body.fuel_consumption = parseFloat(fuelConsumption);
      if (dieselPrice)     body.diesel_price     = parseFloat(dieselPrice);
      if (mileage)         body.mileage          = parseFloat(mileage);
      if (fuelPrice)       body.fuel_price        = parseFloat(fuelPrice.toFixed(2));
      if (additionalCosts) body.additional_costs  = parseFloat(additionalCosts);
      if (message)         body.message           = message;

      await api.post('/api/sales', body);
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
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%', ...shadow.lg }}>
          {/* Header */}
          <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ position: 'absolute', top: 8, left: '50%', marginLeft: -18, width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 8 }}>Нова продажба</Text>
            <TouchableOpacity onPress={handleClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <ProductPicker products={products} value={productId} onSelect={setProductId} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="КОЛИЧЕСТВО *" value={quantity} onChangeText={setQuantity} placeholder="1" keyboardType="numeric" disabled={!productId} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="ЦЕНА (€) *" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" disabled={!productId} />
              </View>
            </View>

            {/* Fuel section */}
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>ГОРИВО</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Л/100КМ" value={fuelConsumption} onChangeText={setFuelConsumption} placeholder="0.0" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="ЦЕНА ДИЗЕЛ (€)" value={dieselPrice} onChangeText={setDieselPrice} placeholder="0.00" keyboardType="decimal-pad" />
                </View>
              </View>
              <Field label="КИЛОМЕТРИ" value={mileage} onChangeText={setMileage} placeholder="0" keyboardType="numeric" disabled={!canSetMileage} />
              {fuelPrice !== null && (
                <View style={{ backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="car-outline" size={16} color="#EA580C" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#EA580C' }}>
                    Разход гориво: {fuelPrice.toFixed(2)} €
                  </Text>
                </View>
              )}
            </View>

            <Field label="ДОПЪЛНИТЕЛНИ РАЗХОДИ (€)" value={additionalCosts} onChangeText={setAdditionalCosts} placeholder="0.00" keyboardType="decimal-pad" />
            <Field label="СЪОБЩЕНИЕ" value={message} onChangeText={setMessage} placeholder="Бележка..." multiline />

            <View style={{ height: 1 }} />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={{
                backgroundColor: saving ? colors.bgElevated : colors.primary,
                borderRadius: 16, paddingVertical: 15, alignItems: 'center',
                ...(!saving ? shadow.lg : {}),
              }}
            >
              {saving
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Добави продажба</Text>}
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Sale Card ─── */
function SaleCard({ sale, onDelete }: { sale: Sale; onDelete: (id: string) => void }) {
  const totalRevenue = sale.price;
  const expenses = (sale.fuel_price ?? 0) + (sale.additional_costs ?? 0);

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 16, marginVertical: 6,
      overflow: 'hidden', borderTopWidth: 3, borderTopColor: colors.primary, ...shadow.sm,
    }}>
      <View style={{ padding: 16, gap: 12 }}>
        {/* Product row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {sale.product?.image_url ? (
            <Image source={{ uri: sale.product.image_url }} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="cover" />
          ) : (
            <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }} numberOfLines={1}>
              {productLabel(sale.product)}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
              {dayjs(sale.date).format('DD MMM YYYY · HH:mm')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert('Изтрий', 'Сигурен ли си?', [
              { text: 'Отмени', style: 'cancel' },
              { text: 'Изтрий', style: 'destructive', onPress: () => onDelete(sale._id) },
            ])}
            style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="trash-outline" size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, backgroundColor: colors.primaryLight, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>КОЛИЧЕСТВО</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primary }}>{sale.quantity} бр.</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#16A34A' }}>ПРИХОД</Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#16A34A' }}>{totalRevenue.toFixed(2)} €</Text>
          </View>
          {expenses > 0 && (
            <View style={{ flex: 1, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#EA580C' }}>РАЗХОДИ</Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#EA580C' }}>{expenses.toFixed(2)} €</Text>
            </View>
          )}
        </View>

        {sale.message ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
            <Ionicons name="chatbubble-outline" size={13} color={colors.textMuted} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>{sale.message}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ─── Main Screen ─── */
export default function SalesScreen() {
  const [sales, setSales]           = useState<Sale[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [hasMore, setHasMore]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);

  const fetchSales = async (p = 1, replace = true) => {
    try {
      const res = await api.get<{ items: Sale[]; pagination: any }>(`/api/sales?page=${p}&per_page=20`);
      const items = res.data.items ?? [];
      setSales((prev) => replace ? items : [...prev, ...items]);
      setHasMore((res.data.pagination?.current_page ?? 1) < (res.data.pagination?.total_pages ?? 1));
      pageRef.current = p;
    } catch { /* ignore */ }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>('/api/products');
      setProducts((res.data ?? []).filter((p) => !p.hidden));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    Promise.all([fetchSales(1), fetchProducts()]).finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSales(1);
    setRefreshing(false);
  }, []);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchSales(pageRef.current + 1, false);
    setLoadingMore(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/sales?id=${id}`);
      setSales((prev) => prev.filter((s) => s._id !== id));
    } catch {
      Alert.alert('Грешка', 'Неуспешно изтриване.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader title="Продажби" icon="trending-up" />

        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlashList
              data={sales}
              keyExtractor={(s) => s._id}
              renderItem={({ item }) => <SaleCard sale={item} onDelete={handleDelete} />}
              estimatedItemSize={180}
              contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListHeaderComponent={
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 14 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textSecondary }}>
                    {sales.length} продажби
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCreateVisible(true)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: colors.primary, borderRadius: 12,
                      paddingHorizontal: 13, paddingVertical: 9, ...shadow.lg,
                    }}
                  >
                    <Ionicons name="add" size={17} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Добави</Text>
                  </TouchableOpacity>
                </View>
              }
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="trending-up-outline" size={32} color={colors.primary} />
                  </View>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>Няма продажби</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Натисни „Добави" за нова продажба</Text>
                </View>
              }
              ListFooterComponent={loadingMore ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              ) : null}
            />
          )}
        </View>
      </SafeAreaView>

      <BottomTabBar />

      <CreateSaleModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSuccess={() => { setCreateVisible(false); fetchSales(1); }}
        products={products}
      />
    </View>
  );
}

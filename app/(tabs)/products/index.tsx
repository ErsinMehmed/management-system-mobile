import { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, Image, ScrollView,
  ActivityIndicator, TouchableOpacity, TextInput,
  Modal, Animated, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadow, gradients } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

/* ─── Types ─── */
interface Product {
  _id: string;
  name: string;
  flavor?: string;
  weight?: number;
  puffs?: number;
  count?: number;
  availability: number;
  units_per_box?: number;
  price: number;
  sell_prices?: number[];
  seller_prices?: number[];
  image_url?: string;
  hidden?: boolean;
  category: { name: string };
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

function availabilityColor(n: number) {
  if (n === 0) return { bg: '#FEF2F2', text: '#DC2626' };
  if (n <= 10) return { bg: '#FFF7ED', text: '#EA580C' };
  return            { bg: '#F0FDF4',  text: '#16A34A' };
}

/* ─── Edit Value Modal (opens on top of product modal) ─── */
function EditValueModal({
  visible,
  label,
  subtitle,
  value,
  keyboardType,
  onChangeText,
  onSave,
  onCancel,
  saving,
}: {
  visible: boolean;
  label: string;
  subtitle: string;
  value: string;
  keyboardType: 'numeric' | 'decimal-pad';
  onChangeText: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }} onPress={onCancel}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, ...shadow.lg }}>
              {/* Info header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="pencil" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>{subtitle}</Text>
                </View>
              </View>

              {/* Input */}
              <TextInput
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                autoFocus
                selectTextOnFocus
                style={{
                  backgroundColor: colors.bgInput,
                  borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                  fontSize: 22, fontWeight: '800', color: colors.textPrimary,
                  textAlign: 'center', marginBottom: 16,
                  borderWidth: 2, borderColor: colors.primary,
                }}
              />

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={onCancel}
                  style={{ flex: 1, backgroundColor: colors.bgInput, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textSecondary }}>Отказ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onSave}
                  disabled={saving}
                  style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                >
                  {saving
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Запази</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Product Detail Modal ─── */
function ProductModal({
  product,
  onClose,
  onProductUpdate,
}: {
  product: Product | null;
  onClose: () => void;
  onProductUpdate: (updated: Partial<Product> & { _id: string }) => void;
}) {
  const insets       = useSafeAreaInsets();
  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'Super Admin');
  const isAdmin      = useAuthStore((s) => s.user?.role === 'Admin' || s.user?.role === 'Super Admin');
  const slideAnim    = useRef(new Animated.Value(600)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;

  const [sellPrices, setSellPrices] = useState<number[]>([]);

  // edit modal state
  type EditField = { type: 'availability' } | { type: 'sell_price'; index: number };
  const [editField, setEditField]   = useState<EditField | null>(null);
  const [editInput, setEditInput]   = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (product) setSellPrices(product.sell_prices ?? []);
  }, [product]);

  const open = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0,   duration: 340, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1,   duration: 260, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 600, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleSave = async () => {
    if (!product || !editField) return;
    setSaving(true);
    try {
      if (editField.type === 'availability') {
        const val = parseInt(editInput, 10);
        if (isNaN(val) || val < 0) return;
        await api.put(`/api/products/${product._id}`, { availability: val });
        onProductUpdate({ _id: product._id, availability: val });
      } else {
        const val = parseFloat(editInput.replace(',', '.'));
        if (isNaN(val) || val < 0) return;
        const updated = sellPrices.map((p, i) => i === editField.index ? val : p);
        await api.put(`/api/products/${product._id}`, { sell_prices: updated });
        setSellPrices(updated);
        onProductUpdate({ _id: product._id, sell_prices: updated });
      }
      setEditField(null);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  if (!product) return null;

  const avColor = availabilityColor(product.availability);
  const cartons = product.units_per_box && product.units_per_box > 0
    ? (product.availability / product.units_per_box).toFixed(1)
    : null;

  const editLabel = editField?.type === 'availability'
    ? 'Наличност (бр.)'
    : `Цена за ${editField?.type === 'sell_price' ? editField.index + 1 : ''} бр. (€)`;

  return (
    <>
    <Modal visible transparent statusBarTranslucent onShow={open} onRequestClose={close}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', opacity: fadeAnim }}>
        <Pressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '90%',
        paddingBottom: insets.bottom + 8,
        ...shadow.lg,
        transform: [{ translateY: slideAnim }],
      }}>
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 2 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Hero image */}
          <View style={{ width: '100%', height: 220, backgroundColor: colors.bgInput }}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <LinearGradient colors={gradients.primarySoft} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cube-outline" size={64} color={colors.textMuted} />
              </LinearGradient>
            )}
            <TouchableOpacity
              onPress={close}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: 'rgba(0,0,0,0.35)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={{
              position: 'absolute', bottom: 12, left: 12,
              backgroundColor: 'rgba(255,255,255,0.92)',
              borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                {product.category?.name ?? '—'}
              </Text>
            </View>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            {/* Title + price */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary, lineHeight: 26 }}>
                {productLabel(product)}
              </Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.primary }}>
                {product.price?.toFixed(2)} €
              </Text>
            </View>

            {/* Quick stats row */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Availability */}
              <TouchableOpacity
                activeOpacity={isSuperAdmin ? 0.75 : 1}
                onPress={() => {
                  if (!isSuperAdmin) return;
                  setEditInput(String(product.availability));
                  setEditField({ type: 'availability' });
                }}
                style={{ flex: 1, backgroundColor: avColor.bg, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 }}
              >
                {isSuperAdmin && (
                  <View style={{ position: 'absolute', top: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={13} color={avColor.text} />
                  </View>
                )}
                <Ionicons name="archive-outline" size={16} color={avColor.text} />
                <Text style={{ fontSize: 20, fontWeight: '800', color: avColor.text }}>{product.availability}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: avColor.text, opacity: 0.8 }}>НАЛИЧНОСТ</Text>
              </TouchableOpacity>

              {/* Cartons */}
              {cartons !== null && (
                <View style={{ flex: 1, backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 }}>
                  <Ionicons name="cube-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{cartons}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary, opacity: 0.8 }}>КАШОНИ</Text>
                </View>
              )}

              {/* Units per box */}
              {product.units_per_box && (
                <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 }}>
                  <Ionicons name="layers-outline" size={16} color="#16A34A" />
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#16A34A' }}>{product.units_per_box}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#16A34A', opacity: 0.8 }}>БР./КАШ.</Text>
                </View>
              )}
            </View>

            {/* Sell prices */}
            {sellPrices.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 }}>
                  ЦЕНИ ЗА ПРОДАЖБА
                </Text>
                <View style={{ backgroundColor: colors.bg, borderRadius: 14, overflow: 'hidden' }}>
                  {sellPrices.map((price, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={isSuperAdmin ? 0.7 : 1}
                      onPress={() => {
                        if (!isSuperAdmin) return;
                        setEditInput(price.toFixed(2));
                        setEditField({ type: 'sell_price', index: i });
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 16, paddingVertical: 12,
                        borderBottomWidth: i < sellPrices.length - 1 ? 1 : 0,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <View style={{
                        width: 28, height: 28, borderRadius: 8,
                        backgroundColor: colors.primaryLight,
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>{i + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
                        Цена за {i + 1} бр.
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                        {price.toFixed(2)} €
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginLeft: 6 }}>
                        (общо {((i + 1) * product.price).toFixed(2)} €)
                      </Text>
                      {isSuperAdmin && (
                        <Ionicons name="pencil-outline" size={13} color={colors.textMuted} style={{ marginLeft: 8 }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Seller prices — Admin only */}
            {isAdmin && (product.seller_prices?.length ?? 0) > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 }}>
                  ИЗПЛАЩАНЕ НА ДОСТАВЧИК
                </Text>
                <View style={{ backgroundColor: '#FFF7ED', borderRadius: 14, overflow: 'hidden' }}>
                  {product.seller_prices!.map((price, i) => (
                    <View key={i} style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 16, paddingVertical: 12,
                      borderBottomWidth: i < product.seller_prices!.length - 1 ? 1 : 0,
                      borderBottomColor: '#FED7AA',
                    }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 8,
                        backgroundColor: '#FFEDD5',
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: 12,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#EA580C' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#92400E' }}>
                        За {i + 1} бр.
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#EA580C' }}>
                        {price.toFixed(2)} €
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>

    <EditValueModal
      visible={editField !== null}
      label={editLabel}
      subtitle={productLabel(product)}
      value={editInput}
      keyboardType={editField?.type === 'availability' ? 'numeric' : 'decimal-pad'}
      onChangeText={setEditInput}
      onSave={handleSave}
      onCancel={() => setEditField(null)}
      saving={saving}
    />
    </>
  );
}

/* ─── Product Card ─── */
function ProductCard({ item, onPress }: { item: Product; onPress: () => void }) {
  const avColor = availabilityColor(item.availability);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flex: 1, margin: 5,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        ...shadow.sm,
      }}
    >
      {/* Image */}
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.bgInput }}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={gradients.primarySoft}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
          </LinearGradient>
        )}

        {/* Category badge */}
        <View style={{
          position: 'absolute', top: 8, left: 8,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
            {item.category?.name ?? '—'}
          </Text>
        </View>

        {item.hidden && (
          <View style={{
            position: 'absolute', top: 8, right: 8,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
          }}>
            <Ionicons name="eye-off-outline" size={11} color="#fff" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={{ padding: 11, gap: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, lineHeight: 17 }} numberOfLines={2}>
          {productLabel(item)}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
          {item.price?.toFixed(2) ?? '—'} €
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: avColor.bg,
          borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
          alignSelf: 'flex-start', gap: 4,
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: avColor.text }} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: avColor.text }}>
            {item.availability} бр.
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Main Screen ─── */
export default function ProductsScreen() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Product | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    api.get<Product[]>('/api/products')
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    if (p.hidden) return false;
    if (!search)  return true;
    return productLabel(p).toLowerCase().includes(search.toLowerCase());
  });

  const handlePress = (p: Product) => {
    setSelected(p);
    setModalVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader title="Продукти" />

        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', ...shadow.sm }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.bgInput, borderRadius: 12,
            paddingHorizontal: 12, gap: 8,
          }}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Търси продукт..."
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: colors.textPrimary }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(p) => p._id}
            numColumns={2}
            contentContainerStyle={{ padding: 11, paddingBottom: 24 }}
            columnWrapperStyle={{ gap: 0 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <ProductCard item={item} onPress={() => handlePress(item)} />}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
                <Text style={{ marginTop: 12, fontSize: 15, color: colors.textMuted, fontWeight: '600' }}>
                  Няма намерени продукти
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      <BottomTabBar />

      {modalVisible && (
        <ProductModal
          product={selected}
          onClose={() => setModalVisible(false)}
          onProductUpdate={(updated) => {
            setProducts((prev) => prev.map((p) => p._id === updated._id ? { ...p, ...updated } : p));
            setSelected((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}
    </View>
  );
}

import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Modal, Pressable, KeyboardAvoidingView,
  Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadow, gradients } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

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

type EditField =
  | { type: 'availability' }
  | { type: 'price' }
  | { type: 'sell_price'; index: number }
  | { type: 'seller_price'; index: number };

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

function EditValueModal({
  visible, label, subtitle, value, keyboardType,
  onChangeText, onSave, onCancel, saving,
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
          onPress={onCancel}
        >
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, ...shadow.lg }}>
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

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'Super Admin');
  const isAdmin      = useAuthStore((s) => s.user?.role === 'Admin' || s.user?.role === 'Super Admin');

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [editField, setEditField] = useState<EditField | null>(null);
  const [editInput, setEditInput] = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    api.get<Product[]>('/api/products')
      .then((r) => {
        const found = r.data.find((p) => p._id === id);
        if (found) setProduct(found);
        else router.back();
      })
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!product || !editField) return;
    setSaving(true);
    try {
      if (editField.type === 'availability') {
        const val = parseInt(editInput, 10);
        if (isNaN(val) || val < 0) return;
        await api.put(`/api/products/${product._id}`, { availability: val });
        setProduct((p) => p ? { ...p, availability: val } : p);
      } else if (editField.type === 'price') {
        const val = parseFloat(editInput.replace(',', '.'));
        if (isNaN(val) || val < 0) return;
        await api.put(`/api/products/${product._id}`, { price: val });
        setProduct((p) => p ? { ...p, price: val } : p);
      } else if (editField.type === 'sell_price') {
        const val = parseFloat(editInput.replace(',', '.'));
        if (isNaN(val) || val < 0) return;
        const updated = (product.sell_prices ?? []).map((p, i) => i === editField.index ? val : p);
        await api.put(`/api/products/${product._id}`, { sell_prices: updated });
        setProduct((p) => p ? { ...p, sell_prices: updated } : p);
      } else {
        const val = parseFloat(editInput.replace(',', '.'));
        if (isNaN(val) || val < 0) return;
        const updated = (product.seller_prices ?? []).map((p, i) => i === editField.index ? val : p);
        await api.put(`/api/products/${product._id}`, { seller_prices: updated });
        setProduct((p) => p ? { ...p, seller_prices: updated } : p);
      }
      setEditField(null);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const editLabel =
    editField?.type === 'availability'  ? 'Наличност (бр.)' :
    editField?.type === 'price'         ? 'Цена (€)' :
    editField?.type === 'seller_price'  ? `Изплащане за ${editField.index + 1} бр. (€)` :
    `Цена за ${editField?.type === 'sell_price' ? editField.index + 1 : ''} бр. (€)`;

  const editKeyboardType: 'numeric' | 'decimal-pad' =
    editField?.type === 'availability' ? 'numeric' : 'decimal-pad';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) return null;

  const avColor = availabilityColor(product.availability);
  const cartons = product.units_per_box && product.units_per_box > 0
    ? (product.availability / product.units_per_box).toFixed(1)
    : null;
  const sellPrices = product.sell_prices ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Hero image */}
          <View style={{ width: '100%', height: 280, backgroundColor: colors.bgInput }}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <LinearGradient colors={gradients.primarySoft} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cube-outline" size={80} color={colors.textMuted} />
              </LinearGradient>
            )}

            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                position: 'absolute', top: 12, left: 16,
                width: 38, height: 38, borderRadius: 19,
                backgroundColor: 'rgba(0,0,0,0.35)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Category badge */}
            <View style={{
              position: 'absolute', bottom: 14, left: 16,
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
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, lineHeight: 28 }}>
                {productLabel(product)}
              </Text>
              <TouchableOpacity
                activeOpacity={isSuperAdmin ? 0.75 : 1}
                onPress={() => {
                  if (!isSuperAdmin) return;
                  setEditInput(product.price.toFixed(2));
                  setEditField({ type: 'price' });
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>
                  {product.price?.toFixed(2)} €
                </Text>
                {isSuperAdmin && <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />}
              </TouchableOpacity>
            </View>

            {/* 3 stat boxes */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Наличност */}
              <TouchableOpacity
                activeOpacity={isSuperAdmin ? 0.75 : 1}
                onPress={() => {
                  if (!isSuperAdmin) return;
                  setEditInput(String(product.availability));
                  setEditField({ type: 'availability' });
                }}
                style={{ flex: 1, backgroundColor: avColor.bg, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 }}
              >
                {isSuperAdmin && (
                  <View style={{ position: 'absolute', top: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={12} color={avColor.text} />
                  </View>
                )}
                <Ionicons name="archive-outline" size={18} color={avColor.text} />
                <Text style={{ fontSize: 20, fontWeight: '800', color: avColor.text }}>{product.availability}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: avColor.text, opacity: 0.8 }}>НАЛИЧНОСТ</Text>
              </TouchableOpacity>

              {/* Бр. в кашон */}
              <View style={{ flex: 1, backgroundColor: colors.primaryLight, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 }}>
                <Ionicons name="layers-outline" size={18} color={colors.primary} />
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{product.units_per_box ?? '—'}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary, opacity: 0.8 }}>БР./КАШ.</Text>
              </View>

              {/* Кашони */}
              <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 }}>
                <Ionicons name="cube-outline" size={18} color="#16A34A" />
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#16A34A' }}>{cartons ?? '—'}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#16A34A', opacity: 0.8 }}>КАШОНИ</Text>
              </View>
            </View>

            {/* Sell prices */}
            {sellPrices.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 }}>
                  ЦЕНИ ЗА ПРОДАЖБА
                </Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...shadow.sm }}>
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
                        paddingHorizontal: 16, paddingVertical: 14,
                        borderBottomWidth: i < sellPrices.length - 1 ? 1 : 0,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <View style={{
                        width: 30, height: 30, borderRadius: 9,
                        backgroundColor: colors.primaryLight,
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: 14,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>{i + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
                        Цена за {i + 1} бр.
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                        {price.toFixed(2)} €
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginLeft: 6 }}>
                        ({((i + 1) * product.price).toFixed(2)} €)
                      </Text>
                      {isSuperAdmin && (
                        <Ionicons name="pencil-outline" size={14} color={colors.textMuted} style={{ marginLeft: 10 }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Seller prices */}
            {isAdmin && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.5 }}>
                  ИЗПЛАЩАНЕ НА ДОСТАВЧИК
                </Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...shadow.sm }}>
                  {(product.seller_prices ?? []).length === 0 ? (
                    <View style={{ padding: 16 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 14 }}>Няма данни</Text>
                    </View>
                  ) : (product.seller_prices!.map((price, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={isSuperAdmin ? 0.7 : 1}
                      onPress={() => {
                        if (!isSuperAdmin) return;
                        setEditInput(price.toFixed(2));
                        setEditField({ type: 'seller_price', index: i });
                      }}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 16, paddingVertical: 14,
                        borderBottomWidth: i < product.seller_prices!.length - 1 ? 1 : 0,
                        borderBottomColor: '#FED7AA',
                      }}
                    >
                      <View style={{
                        width: 30, height: 30, borderRadius: 9,
                        backgroundColor: '#FFEDD5',
                        alignItems: 'center', justifyContent: 'center',
                        marginRight: 14,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#EA580C' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#92400E' }}>
                        За {i + 1} бр.
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#EA580C' }}>
                        {price.toFixed(2)} €
                      </Text>
                      {isSuperAdmin && (
                        <Ionicons name="pencil-outline" size={14} color="#EA580C" style={{ marginLeft: 10 }} />
                      )}
                    </TouchableOpacity>
                  )))}
                </View>
              </View>
            )}

            <View style={{ height: 16 }} />
          </View>
        </ScrollView>
      </SafeAreaView>

      <EditValueModal
        visible={editField !== null}
        label={editLabel}
        subtitle={productLabel(product)}
        value={editInput}
        keyboardType={editKeyboardType}
        onChangeText={setEditInput}
        onSave={handleSave}
        onCancel={() => setEditField(null)}
        saving={saving}
      />
    </View>
  );
}

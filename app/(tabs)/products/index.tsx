import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image,
  ActivityIndicator, TouchableOpacity, TextInput,
  Modal, ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadow, gradients } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';
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
  price: number;
  image_url?: string;
  hidden?: boolean;
  category: { name: string };
}

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

function VisibilityModal({
  visible,
  products,
  onClose,
  onToggle,
  toggling,
}: {
  visible: boolean;
  products: Product[];
  onClose: () => void;
  onToggle: (id: string, hidden: boolean) => Promise<void>;
  toggling: string | null;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={onClose} />
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', ...shadow.lg }}>
        {/* Header */}
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
          <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>Видимост на продукти</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>Включи или изключи продукти от списъка</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {products.map((p, i) => {
            const isLast = i === products.length - 1;
            const isToggling = toggling === p._id;
            const isVisible = !p.hidden;
            return (
              <View
                key={p._id}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 20, paddingVertical: 14,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.divider,
                }}
              >
                {/* Thumbnail */}
                <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.bgInput }}>
                  {p.image_url ? (
                    <Image source={{ uri: p.image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="cube-outline" size={20} color={colors.textMuted} />
                    </View>
                  )}
                </View>

                {/* Name */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                    {productLabel(p)}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                    {p.category?.name ?? '—'}
                  </Text>
                </View>

                {/* Toggle */}
                {isToggling ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={isVisible}
                    onValueChange={() => onToggle(p._id, !p.hidden)}
                    trackColor={{ false: '#E5E7EB', true: colors.primary + '60' }}
                    thumbColor={isVisible ? colors.primary : '#9CA3AF'}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

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

export default function ProductsScreen() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [visibilityModal, setVisibilityModal] = useState(false);
  const [toggling, setToggling]       = useState<string | null>(null);

  const isSuperAdmin = useAuthStore((s) => s.user?.role === 'Super Admin');

  useEffect(() => {
    api.get<Product[]>('/api/products')
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggleVisibility = async (id: string, hidden: boolean) => {
    setToggling(id);
    try {
      await api.put(`/api/products/${id}`, { hidden });
      setProducts((prev) => prev.map((p) => p._id === id ? { ...p, hidden } : p));
    } catch { /* ignore */ } finally { setToggling(null); }
  };

  const filtered = products.filter((p) => {
    if (p.hidden) return false;
    if (!search)  return true;
    return productLabel(p).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader title="Продукти" icon="cube" />

        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', ...shadow.sm }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
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

            {isSuperAdmin && (
              <TouchableOpacity
                onPress={() => setVisibilityModal(true)}
                style={{
                  width: 42, height: 42, borderRadius: 12,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Ionicons name="eye-outline" size={20} color={colors.primary} />
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
            renderItem={({ item }) => (
              <ProductCard item={item} onPress={() => router.push({ pathname: '/(tabs)/products/[id]', params: { id: item._id } })} />
            )}
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

      <VisibilityModal
        visible={visibilityModal}
        products={products}
        onClose={() => setVisibilityModal(false)}
        onToggle={handleToggleVisibility}
        toggling={toggling}
      />
    </View>
  );
}

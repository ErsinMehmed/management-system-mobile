import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';
import type { SellerStockEntry } from '@/types';

type DirtyMap = Record<string, Record<string, number>>;

function stockColor(qty: number) {
  if (qty <= 0) return colors.rejected;
  if (qty <= 3) return '#D97706';
  return colors.delivered;
}
function stockBg(qty: number) {
  if (qty <= 0) return colors.rejectedBg;
  if (qty <= 3) return '#FFFBEB';
  return colors.deliveredBg;
}

function StockCell({ value, onChange, canEdit }: { value: number; onChange: (v: number) => void; canEdit: boolean }) {
  const [text, setText] = useState(String(value));

  useEffect(() => { setText(String(value)); }, [value]);

  if (!canEdit) {
    return (
      <View style={{ width: 52, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: stockBg(value), borderRadius: 10 }}>
        <Text style={{ color: stockColor(value), fontWeight: '800', fontSize: 15 }}>{value}</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <TouchableOpacity
        onPress={() => { const v = Math.max(0, value - 1); onChange(v); setText(String(v)); }}
        style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="remove" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
      <TextInput
        style={{
          width: 46, height: 36, textAlign: 'center',
          backgroundColor: stockBg(value), borderRadius: 10,
          color: stockColor(value), fontWeight: '800', fontSize: 15,
        }}
        value={text}
        keyboardType="numeric"
        onChangeText={(t) => { setText(t); onChange(Math.max(0, parseInt(t) || 0)); }}
        onBlur={() => setText(String(value))}
      />
      <TouchableOpacity
        onPress={() => { const v = value + 1; onChange(v); setText(String(v)); }}
        style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="add" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function SellerCard({ seller, isSuperAdmin, dirty, onChange }: {
  seller: SellerStockEntry; isSuperAdmin: boolean;
  dirty: Record<string, number>; onChange: (productId: string, value: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const dirtyCount = Object.keys(dirty).length;
  const total = seller.products.reduce((s, sp) => s + (dirty[sp.productId] !== undefined ? dirty[sp.productId] : sp.stock), 0);

  return (
    <View style={{ marginBottom: 12, borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden', ...shadow.sm }}>
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}>{seller.sellerName}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{seller.products.length} продукта · Общо: {total}</Text>
        </View>
        {dirtyCount > 0 && (
          <View style={{ backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 }}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>+{dirtyCount}</Text>
          </View>
        )}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
          {seller.products.map((sp) => {
            const current = dirty[sp.productId] !== undefined ? dirty[sp.productId] : sp.stock;
            return (
              <View
                key={sp.productId}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: colors.divider,
                  backgroundColor: dirty[sp.productId] !== undefined ? colors.primaryLight : 'transparent',
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }} numberOfLines={2}>
                    {sp.productName}{sp.productFlavor ? ` · ${sp.productFlavor}` : ''}{sp.productWeight ? ` · ${sp.productWeight}g` : ''}
                  </Text>
                </View>
                <StockCell value={current} onChange={(v) => onChange(sp.productId, v)} canEdit={isSuperAdmin} />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function StockTab() {
  const { stock, loadStock, saveSellerStock, isStockLoading } = useClientOrderStore();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'Super Admin';
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState<DirtyMap>({});
  const [saving, setSaving] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStock();
    setRefreshing(false);
  }, [loadStock]);

  const handleChange = useCallback((sellerId: string, productId: string, value: number) => {
    setDirty((prev) => ({ ...prev, [sellerId]: { ...(prev[sellerId] ?? {}), [productId]: value } }));
  }, []);

  const totalDirty = Object.values(dirty).reduce((s, d) => s + Object.keys(d).length, 0);

  const handleSave = async () => {
    setSaving(true);
    for (const [sellerId, products] of Object.entries(dirty)) {
      await saveSellerStock(sellerId, Object.entries(products).map(([productId, stock]) => ({ productId, stock })));
    }
    setDirty({});
    setSaving(false);
  };

  const sellers: SellerStockEntry[] = stock?.sellers ?? [];

  if (isStockLoading && !sellers.length) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        data={sellers}
        keyExtractor={(item) => item.sellerId}
        renderItem={({ item }) => (
          <SellerCard
            seller={item} isSuperAdmin={isSuperAdmin}
            dirty={dirty[item.sellerId] ?? {}}
            onChange={(pid, v) => handleChange(item.sellerId, pid, v)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: totalDirty > 0 ? 100 : 24, paddingTop: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="cube-outline" size={28} color={colors.primary} />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>Няма наличности</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      />

      {totalDirty > 0 && isSuperAdmin && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#fff', padding: 16, paddingBottom: 24,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderTopWidth: 1, borderTopColor: colors.divider,
          ...shadow.md,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 14 }}>{totalDirty} промени</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Готови за запазване</Text>
          </View>
          <TouchableOpacity onPress={() => setDirty({})} style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.bgInput }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Отмени</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave} disabled={saving}
            style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', ...shadow.lg }}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Запази</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

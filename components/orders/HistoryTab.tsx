import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  RefreshControl, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore, type HistorySeller, type HistoryPayment, type HistoryProduct } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, productTitle } from '@/utils/format';

function productName(p: HistoryProduct): string {
  return productTitle({ name: p.name, flavor: p.flavor, weight: p.weight, puffs: p.puffs, count: p.count } as any);
}

function PaymentRow({ payment, isSuperAdmin }: { payment: HistoryPayment; isSuperAdmin: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const dateLabel = payment.paidAt ? dayjs(payment.paidAt).format('DD.MM.YYYY') : 'Непотвърдено';

  return (
    <View style={{ marginBottom: 8, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.bgInput }}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>{dateLabel}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {payment.orderCount} поръчки{payment.revenueConfirmed ? ' · ✓' : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
          <Text style={{ color: colors.delivered, fontWeight: '800', fontSize: 15 }}>{formatCurrency(payment.totalRevenue)}</Text>
          {isSuperAdmin && (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
              Хонорар: {formatCurrency(payment.totalPayout)}
            </Text>
          )}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, minWidth: 320 }}>
            <View style={{ flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ flex: 2, color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>ПРОДУКТ</Text>
              <Text style={{ width: 46, color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'center' }}>БР.</Text>
              <Text style={{ width: 76, color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'right' }}>ПРИХОД</Text>
              {isSuperAdmin && <Text style={{ width: 76, color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'right' }}>ХОНОРАР</Text>}
            </View>
            {payment.products.map((p, i) => (
              <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <Text style={{ flex: 2, color: colors.textPrimary, fontSize: 13 }} numberOfLines={1}>{productName(p)}</Text>
                <Text style={{ width: 46, color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>{p.quantity}</Text>
                <Text style={{ width: 76, color: colors.delivered, fontSize: 13, fontWeight: '600', textAlign: 'right' }}>{formatCurrency(p.price * p.quantity)}</Text>
                {isSuperAdmin && <Text style={{ width: 76, color: colors.textMuted, fontSize: 13, textAlign: 'right' }}>{formatCurrency(p.payout)}</Text>}
              </View>
            ))}
            <View style={{ flexDirection: 'row', paddingTop: 8 }}>
              <Text style={{ flex: 2, color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>Общо</Text>
              <Text style={{ width: 46 }} />
              <Text style={{ width: 76, color: colors.delivered, fontSize: 13, fontWeight: '800', textAlign: 'right' }}>{formatCurrency(payment.totalRevenue)}</Text>
              {isSuperAdmin && <Text style={{ width: 76, color: colors.primary, fontSize: 13, fontWeight: '800', textAlign: 'right' }}>{formatCurrency(payment.totalPayout)}</Text>}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function SellerAccordion({ seller, isSuperAdmin, onConfirmRevenue }: {
  seller: HistorySeller; isSuperAdmin: boolean;
  onConfirmRevenue: (sellerId: string, paidAt: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <View style={{ marginBottom: 12, borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden', ...shadow.sm }}>
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 22,
          backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12,
        }}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}>{seller.sellerName}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
            {seller.orderCount} поръчки · {seller.payments.length} плащания
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
          <Text style={{ color: colors.delivered, fontWeight: '800', fontSize: 15 }}>{formatCurrency(seller.totalRevenue)}</Text>
          {isSuperAdmin && <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{formatCurrency(seller.totalPayout)}</Text>}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
          {seller.payments.map((payment, i) => (
            <View key={i}>
              {isSuperAdmin && !payment.revenueConfirmed && (
                <TouchableOpacity
                  onPress={async () => {
                    const key = payment.paidAt ?? 'null';
                    setConfirming(key);
                    await onConfirmRevenue(seller.sellerId, payment.paidAt);
                    setConfirming(null);
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: 10, borderRadius: 12, marginBottom: 6,
                    backgroundColor: colors.deliveredBg,
                  }}
                >
                  {confirming === (payment.paidAt ?? 'null')
                    ? <ActivityIndicator size="small" color={colors.delivered} />
                    : <>
                        <Ionicons name="checkmark-circle" size={15} color={colors.delivered} />
                        <Text style={{ color: colors.delivered, fontWeight: '700', fontSize: 13 }}>Потвърди приход</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
              <PaymentRow payment={payment} isSuperAdmin={isSuperAdmin} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function HistoryTab() {
  const { history, loadHistory, confirmRevenue, isHistoryLoading } = useClientOrderStore();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'Super Admin';
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const sellers = history?.sellers ?? [];
  const grandTotal = history?.grandTotal ?? 0;
  const grandPayout = history?.grandPayout ?? 0;

  const ListHeader = (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
      <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, ...shadow.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>ОБЩО ПРИХОД</Text>
        <Text style={{ color: colors.delivered, fontSize: 22, fontWeight: '800' }}>{formatCurrency(grandTotal)}</Text>
      </View>
      {isSuperAdmin && (
        <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, ...shadow.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>ОБЩО ХОНОРАР</Text>
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '800' }}>{formatCurrency(grandPayout)}</Text>
        </View>
      )}
    </View>
  );

  if (isHistoryLoading && !sellers.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlashList
      data={sellers}
      keyExtractor={(item) => item.sellerId}
      renderItem={({ item }) => (
        <SellerAccordion seller={item} isSuperAdmin={isSuperAdmin} onConfirmRevenue={confirmRevenue} />
      )}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 }}
      ListHeaderComponent={ListHeader}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="time-outline" size={28} color={colors.primary} />
          </View>
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>Няма история</Text>
        </View>
      }
    />
  );
}

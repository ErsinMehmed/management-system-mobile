import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert, Modal, Image,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';
import SwipeableCard from './SwipeableCard';
import { productTitle, formatCurrency } from '@/utils/format';
import type { Order, OrderStatus } from '@/types';

const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; label: string }> = {
  нова:      { color: '#6366F1', bg: '#EEF2FF', label: 'Нова' },
  доставена: { color: '#16A34A', bg: '#DCFCE7', label: 'Доставена' },
  отказана:  { color: '#EF4444', bg: '#FEE2E2', label: 'Отказана' },
};

function OrderCard({ order, onRejection }: { order: Order; onRejection: (id: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const { updateStatus, deleteOrder } = useClientOrderStore();
  const isSeller = user?.role === 'Seller';
  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin = user?.role === 'Admin' || isSuperAdmin;
  const isLocked = ['отказана', 'доставена'].includes(order.status) && !isSuperAdmin;

  const [statusSheet, setStatusSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const s = STATUS_CFG[order.status] ?? STATUS_CFG['нова'];
  const STATUSES: OrderStatus[] = ['нова', 'доставена', 'отказана'];

  const handleDelete = () => {
    Alert.alert('Изтрий поръчка', 'Сигурен ли си?', [
      { text: 'Отмени', style: 'cancel' },
      {
        text: 'Изтрий', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          await deleteOrder(order._id);
          setDeleting(false);
        },
      },
    ]);
  };

  const totalAmount = order.price + (order.secondProduct?.product ? order.secondProduct.price : 0);
  const hasSecond = !!order.secondProduct?.product;
  const heroImage = order.product?.image_url;

  const cardContent = (
    <TouchableOpacity
      activeOpacity={0.96}
      onPress={() => router.push(`/(tabs)/orders/${order._id}`)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 22,
        overflow: 'hidden',
        shadowColor: '#1C1C2E',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
        elevation: 16,
      }}
    >
      {/* ── HERO IMAGE BANNER ── */}
      <View style={{ height: 140, backgroundColor: '#ECEDF8', position: 'relative' }}>
        {heroImage ? (
          <Image
            source={{ uri: heroImage }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="cube-outline" size={56} color="#C7CDE8" />
          </View>
        )}

        {/* Bottom gradient for text legibility */}
        <LinearGradient
          colors={['transparent', 'rgba(15,15,30,0.92)']}
          locations={[0.35, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 }}
          pointerEvents="none"
        />

        {/* TOP ROW: order # pill + status pill */}
        <View style={{
          position: 'absolute', top: 12, left: 12, right: 12,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 999,
            paddingLeft: !order.viewedBySeller ? 8 : 12, paddingRight: 12, paddingVertical: 5,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            {!order.viewedBySeller && (
              <View style={{
                width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444',
                shadowColor: '#EF4444', shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
              }} />
            )}
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#1C1C2E', letterSpacing: -0.2 }}>
              {order.orderNumber > 0 ? `#${order.orderNumber}` : order.phone}
            </Text>
          </View>

          {(isAdmin && !isSeller) ? (
            <TouchableOpacity
              onPress={() => setStatusSheet(true)}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: s.color, borderRadius: 999,
                paddingLeft: 10, paddingRight: 8, paddingVertical: 5,
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.label}</Text>
              <Ionicons name="chevron-down" size={10} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: s.color, borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 5,
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.label}</Text>
            </View>
          )}
        </View>

        {/* New client floating badge */}
        {order.isNewClient && (
          <View style={{
            position: 'absolute', top: 50, right: 12,
            backgroundColor: '#FEF08A', borderRadius: 6,
            paddingHorizontal: 8, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#854D0E', letterSpacing: 0.5 }}>НОВ КЛИЕНТ</Text>
          </View>
        )}

        {/* BOTTOM: product title over gradient */}
        <View style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>
            {productTitle(order.product)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={{ color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: '700' }}>
              {order.quantity} бр.
            </Text>
            {hasSecond && (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.6)' }} />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                  + {productTitle(order.secondProduct!.product)} ({order.secondProduct!.quantity} бр.)
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* ── BODY ── */}
      <View style={{ padding: 14, gap: 8 }}>
        {/* Phone */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="call" size={13} color="#6366F1" />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C2E' }}>{order.phone}</Text>
        </View>

        {/* Address */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="location" size={13} color="#D97706" />
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#52527A' }} numberOfLines={1}>
            {order.address || 'Без адрес'}
          </Text>
        </View>

        {/* FOOTER */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
          marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F1F8', gap: 12,
        }}>
          <View style={{ flex: 1 }}>
            {order.assignedTo?.name && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="person-circle" size={15} color="#52527A" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1C1C2E' }} numberOfLines={1}>{order.assignedTo.name}</Text>
              </View>
            )}
            <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600', marginTop: 2 }}>
              {dayjs(order.createdAt).format('DD MMM · HH:mm')}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#A0A0BE', letterSpacing: 1.2 }}>ОБЩО</Text>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#1C1C2E', letterSpacing: -0.8, marginTop: -2 }}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── STATUS SHEET ── */}
      <Modal visible={statusSheet} transparent animationType="slide" onRequestClose={() => setStatusSheet(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={() => setStatusSheet(false)} />
        <View style={{
          backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 20, gap: 10, paddingBottom: 44, ...shadow.lg,
        }}>
          <View style={{ width: 36, height: 4, backgroundColor: '#EBEBF5', borderRadius: 2, alignSelf: 'center', marginBottom: 6 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1C2E', marginBottom: 4 }}>Смени статус</Text>
          {STATUSES.map((st) => {
            const cfg = STATUS_CFG[st];
            const isActive = order.status === st;
            return (
              <TouchableOpacity
                key={st}
                disabled={isLocked}
                onPress={() => {
                  setStatusSheet(false);
                  if (st === 'отказана') onRejection(order._id);
                  else updateStatus(order._id, st);
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  padding: 16, borderRadius: 16,
                  backgroundColor: isActive ? cfg.bg : '#F7F8FC',
                  opacity: isLocked ? 0.4 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.color }} />
                  <Text style={{ color: isActive ? cfg.color : '#1C1C2E', fontWeight: '600', fontSize: 15 }}>
                    {cfg.label}
                  </Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={cfg.color} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </TouchableOpacity>
  );

  if (!isSeller && !isAdmin) {
    return <View style={{ marginHorizontal: 16, marginVertical: 6 }}>{cardContent}</View>;
  }

  return (
    <View style={{ marginHorizontal: 16, marginVertical: 10 }}>
      <SwipeableCard
        canSwipe={!isLocked}
        onSwipeRight={!isLocked ? (isSeller ? () => updateStatus(order._id, 'доставена') : () => setStatusSheet(true)) : undefined}
        onSwipeLeft={isSeller ? (!isLocked ? () => onRejection(order._id) : undefined) : () => handleDelete()}
        rightLabel={isSeller ? 'Доставена' : 'Статус'}
        rightColor={isSeller ? colors.delivered : colors.primary}
        rightIcon={isSeller ? 'checkmark' : 'swap-horizontal'}
        leftLabel={isSeller ? 'Отказана' : 'Изтрий'}
        leftColor={colors.rejected}
        leftIcon={isSeller ? 'close' : 'trash'}
      >
        {cardContent}
      </SwipeableCard>
    </View>
  );
}

interface Props {
  onCreatePress: () => void;
  onRejection: (id: string) => void;
}

export default function OrdersTab({ onCreatePress, onRejection }: Props) {
  const { orders, isLoading, loadOrders, loadMoreOrders, isLoadingMore } = useClientOrderStore();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders(1);
    setRefreshing(false);
  }, [loadOrders]);

  return (
    <FlashList
      data={orders.items}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => <OrderCard order={item} onRejection={onRejection} />}
      contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}
      estimatedItemSize={290}
      ListHeaderComponent={
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, marginBottom: 14,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#16A34A' }}>
              Днес: {isLoading ? '—' : orders.dailyCount ?? 0}
            </Text>
          </View>

          {!!user && (
            <TouchableOpacity
              onPress={onCreatePress}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#6366F1', borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 9,
                ...shadow.lg,
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Добави</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" colors={['#6366F1']} />
      }
      onEndReached={loadMoreOrders}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        isLoading ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <ActivityIndicator color="#6366F1" size="large" />
            <Text style={{ color: colors.textMuted, marginTop: 14, fontSize: 14 }}>Зареждане...</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="receipt-outline" size={32} color="#6366F1" />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>Няма поръчки</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Натисни „Добави" за нова поръчка</Text>
          </View>
        )
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color="#6366F1" size="small" />
          </View>
        ) : null
      }
    />
  );
}

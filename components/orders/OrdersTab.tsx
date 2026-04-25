import { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert, Modal, Image,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
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

function ProductThumb({ imageUrl, size }: { imageUrl?: string; size: number }) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: 10 }}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: 10,
      backgroundColor: '#ECEDF8',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Ionicons name="cube-outline" size={size * 0.44} color="#6366F1" />
    </View>
  );
}

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

  const cardContent = (
    <TouchableOpacity
      activeOpacity={0.96}
      onPress={() => router.push(`/(tabs)/orders/${order._id}`)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 22,
        borderWidth: 1.5,
        borderColor: '#1C1C2E',
        shadowColor: '#1C1C2E',
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 0,
        elevation: 2,
        overflow: 'hidden',
      }}
    >
      {/* ── HERO: image + headline ── */}
      <View style={{ flexDirection: 'row', padding: 14, gap: 14 }}>
        {/* Big product image with second-product peek */}
        <View>
          <View style={{
            width: 96, height: 96, borderRadius: 16, overflow: 'hidden',
            borderWidth: 1.5, borderColor: '#1C1C2E',
            backgroundColor: '#ECEDF8',
          }}>
            <ProductThumb imageUrl={order.product?.image_url} size={96} />
          </View>

          {hasSecond && (
            <View style={{
              position: 'absolute', right: -8, bottom: -8,
              width: 38, height: 38, borderRadius: 12, overflow: 'hidden',
              borderWidth: 1.5, borderColor: '#1C1C2E',
              backgroundColor: '#fff',
            }}>
              <ProductThumb imageUrl={order.secondProduct!.product?.image_url} size={38} />
            </View>
          )}
        </View>

        {/* Right column */}
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          {/* Order id + status */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#A0A0BE', letterSpacing: 1.2 }}>
                ПОРЪЧКА
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#1C1C2E', letterSpacing: -0.8, marginTop: 1 }}>
                {order.orderNumber > 0 ? `#${order.orderNumber}` : order.phone}
              </Text>
            </View>

            {(isAdmin && !isSeller) ? (
              <TouchableOpacity
                onPress={() => setStatusSheet(true)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: s.color, borderRadius: 999,
                  paddingHorizontal: 10, paddingVertical: 5,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.label}</Text>
                <Ionicons name="chevron-down" size={10} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={{
                backgroundColor: s.color, borderRadius: 999,
                paddingHorizontal: 10, paddingVertical: 5,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.label}</Text>
              </View>
            )}
          </View>

          {/* Product name */}
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C2E', marginTop: 4 }} numberOfLines={1}>
            {productTitle(order.product)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#52527A' }}>
              {order.quantity} бр.
            </Text>
            {hasSecond && (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#A0A0BE' }} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#52527A' }} numberOfLines={1}>
                  + {productTitle(order.secondProduct!.product)} ({order.secondProduct!.quantity} бр.)
                </Text>
              </>
            )}
          </View>

          {order.isNewClient && (
            <View style={{ alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#FEF9C3', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#A16207', letterSpacing: 0.4 }}>НОВ КЛИЕНТ</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── DIVIDER ── */}
      <View style={{ height: 1.5, backgroundColor: '#1C1C2E', marginHorizontal: 14 }} />

      {/* ── CONTACT STRIP ── */}
      <View style={{ paddingHorizontal: 14, paddingTop: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="call" size={12} color="#6366F1" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1C1C2E' }}>{order.phone}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="location" size={12} color="#D97706" />
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#52527A' }} numberOfLines={1}>
            {order.address || 'Без адрес'}
          </Text>
        </View>
      </View>

      {/* ── FOOTER ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 12,
      }}>
        <View style={{ flex: 1 }}>
          {order.assignedTo?.name && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="person-circle" size={14} color="#52527A" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1C1C2E' }} numberOfLines={1}>{order.assignedTo.name}</Text>
            </View>
          )}
          <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600', marginTop: 2 }}>
            {dayjs(order.createdAt).format('DD MMM · HH:mm')}
          </Text>
        </View>

        <View style={{
          backgroundColor: '#1C1C2E', borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 8,
        }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#A0A0BE', letterSpacing: 1 }}>ОБЩО</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.3, marginTop: -2 }}>
            {formatCurrency(totalAmount)}
          </Text>
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
    <View style={{ marginHorizontal: 16, marginVertical: 6 }}>
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
      estimatedItemSize={220}
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

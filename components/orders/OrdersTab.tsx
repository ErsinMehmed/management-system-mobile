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
  const totalQty = order.quantity + (order.secondProduct?.product ? order.secondProduct.quantity : 0);
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

  const cardContent = (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => router.push(`/(tabs)/orders/${order._id}`)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        borderTopWidth: 3,
        borderTopColor: s.color,
        ...shadow.sm,
      }}
    >
      {/* ── TOP: Order ID label + date ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 10,
      }}>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#A0A0BE', letterSpacing: 0.3 }}>
              Поръчка
            </Text>
            {order.isNewClient && (
              <View style={{ backgroundColor: '#FEF9C3', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#A16207', letterSpacing: 0.3 }}>НОВ КЛИЕНТ</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1C1C2E', letterSpacing: -0.5 }}>
            {order.orderNumber > 0 ? `#${order.orderNumber}` : order.phone}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {(isAdmin && !isSeller) && (
            <TouchableOpacity
              onPress={() => setStatusSheet(true)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: s.bg, borderRadius: 8,
                paddingHorizontal: 10, paddingVertical: 5,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: s.color }}>{s.label}</Text>
              <Ionicons name="chevron-down" size={10} color={s.color} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── ROUTE ROW: phone → address ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingBottom: 14,
        gap: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="call-outline" size={13} color="#A0A0BE" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#52527A' }}>{order.phone}</Text>
        </View>

        {/* dashed connector */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 1.5, backgroundColor: '#E2E2F0', borderRadius: 1 }} />
          ))}
          <Ionicons name="arrow-forward" size={11} color="#C0C0D8" />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="location-outline" size={13} color="#A0A0BE" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#52527A' }} numberOfLines={1}>
            {order.address ? order.address : 'Без адрес'}
          </Text>
        </View>
      </View>

      {/* ── PRODUCT SECTION ── */}
      <View style={{ marginHorizontal: 18, marginBottom: 14, gap: 8 }}>
        {/* Primary product row */}
        <View style={{
          backgroundColor: '#F7F8FC', borderRadius: 12,
          padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <ProductThumb imageUrl={(order.product as any)?.image_url} size={40} />
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1C1C2E' }} numberOfLines={1}>
            {productTitle(order.product)}
          </Text>
          <Text style={{ fontSize: 12, color: '#52527A', fontWeight: '600', marginRight: 6 }}>
            {order.quantity} бр.
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#6366F1' }}>
            {formatCurrency(order.price)}
          </Text>
        </View>

        {/* Second product row */}
        {order.secondProduct?.product && (
          <View style={{
            backgroundColor: '#F7F8FC', borderRadius: 12,
            padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10,
          }}>
            <ProductThumb imageUrl={(order.secondProduct.product as any)?.image_url} size={40} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#1C1C2E' }} numberOfLines={1}>
              {productTitle(order.secondProduct.product)}
            </Text>
            <Text style={{ fontSize: 12, color: '#52527A', fontWeight: '600', marginRight: 6 }}>
              {order.secondProduct.quantity} бр.
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#6366F1' }}>
              {formatCurrency(order.secondProduct.price)}
            </Text>
          </View>
        )}
      </View>

      {/* ── FOOTER ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingBottom: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {order.assignedTo?.name && (
            <View>
              <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '500', marginBottom: 2 }}>Доставчик</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C2E' }}>{order.assignedTo.name}</Text>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 12, color: '#A0A0BE', fontWeight: '500' }}>
          {dayjs(order.createdAt).format('DD MMM · HH:mm')}
        </Text>
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

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => loadOrders()}
              style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
                ...shadow.sm,
              }}
            >
              <Ionicons name="refresh-outline" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
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

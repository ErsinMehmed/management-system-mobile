import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import api from '@/services/api';

interface NotifItem {
  _id: string;
  type: 'created' | 'updated' | 'deleted';
  orderId: string;
  orderNumber: number;
  changedBy: string;
  change?: string | null;
  status?: string | null;
  readBy: string[];
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  created: { label: 'Нова поръчка',     icon: 'add-circle-outline',  color: '#6366F1' },
  updated: { label: 'Редактирана',       icon: 'pencil-outline',      color: '#F59E0B' },
  deleted: { label: 'Изтрита поръчка',  icon: 'trash-outline',       color: '#DC2626' },
};

function NotifCard({ item, userId, onPress }: { item: NotifItem; userId: string; onPress: () => void }) {
  const isRead = item.readBy.includes(userId);
  const meta = TYPE_LABELS[item.type] ?? TYPE_LABELS.created;

  const description = item.type === 'updated'
    ? item.change === 'status' ? `Статус → ${item.status}` : 'Редактирана'
    : item.type === 'created' ? 'Добавена от ' + item.changedBy
    : 'Изтрита от ' + item.changedBy;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 13,
        borderBottomWidth: 1, borderBottomColor: colors.divider,
        backgroundColor: isRead ? '#fff' : colors.primaryLight,
      }}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: meta.color + '18',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
            {meta.label} #{item.orderNumber}
          </Text>
          {!isRead && (
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary }} />
          )}
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{description}</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
          {dayjs(item.createdAt).format('DD MMM · HH:mm')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onUnreadChange: (count: number) => void;
}

export default function NotificationsDrawer({ visible, onClose, userId, onUnreadChange }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchNotifs = async (p = 1, replace = true) => {
    try {
      const res = await api.get<{ items: NotifItem[]; unreadCount: number; hasMore: boolean }>(
        `/api/notifications?page=${p}`
      );
      setItems((prev) => replace ? res.data.items : [...prev, ...res.data.items]);
      setHasMore(res.data.hasMore);
      setPage(p);
      onUnreadChange(res.data.unreadCount);
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications');
      setItems((prev) => prev.map((n) => ({ ...n, readBy: [...n.readBy, userId] })));
      onUnreadChange(0);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchNotifs(1).finally(() => setLoading(false));
      markAllRead();
    }
  }, [visible]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifs(1);
    setRefreshing(false);
  }, []);

  const handlePress = (item: NotifItem) => {
    if (item.type !== 'deleted') {
      onClose();
      router.push({ pathname: '/(tabs)/orders/[id]', params: { id: item.orderId } } as any);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Dim overlay left side */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
          activeOpacity={1}
          onPress={onClose}
        />
        {/* Panel right side */}
        <View style={{
          width: '82%', backgroundColor: '#fff', paddingTop: insets.top,
          ...shadow.lg,
        }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: colors.divider,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>Нотификации</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => n._id}
            renderItem={({ item }) => (
              <NotifCard item={item} userId={userId} onPress={() => handlePress(item)} />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
            onEndReached={() => { if (hasMore) fetchNotifs(page + 1, false); }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Няма нотификации</Text>
              </View>
            }
            ListFooterComponent={<View style={{ height: 40 }} />}
          />
        )}
        </View>
      </View>
    </Modal>
  );
}

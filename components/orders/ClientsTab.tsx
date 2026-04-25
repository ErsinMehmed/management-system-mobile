import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  TextInput, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';
import type { ClientPhone } from '@/types';
import AddClientModal from './AddClientModal';
import ClientProfileModal from './ClientProfileModal';

function ClientRow({ client, onPress }: { client: ClientPhone; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ backgroundColor: '#fff', borderRadius: 18, marginBottom: 10, padding: 16, ...shadow.sm }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Avatar */}
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>
            {(client.name || client.phone).charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{client.phone}</Text>
          {client.name
            ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{client.name}</Text>
            : <Text style={{ color: '#C0C0D8', fontSize: 13, marginTop: 2, fontStyle: 'italic' }}>Няма име</Text>}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4, marginRight: 8 }}>
          <View style={{ backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{client.orderCount}×</Text>
          </View>
          {client.lastOrder && (
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>{dayjs(client.lastOrder).format('DD.MM.YY')}</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color="#C0C0D8" />
      </View>
    </TouchableOpacity>
  );
}

export default function ClientsTab() {
  const { clients, clientsTotal, clientsHasMore, isClientsLoading, isClientsLoadingMore, loadClients } = useClientOrderStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(1);

  useEffect(() => { loadClients(1, '', true); }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      pageRef.current = 1;
      loadClients(1, text, true);
    }, 300);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    pageRef.current = 1;
    await loadClients(1, search, true);
    setRefreshing(false);
  }, [loadClients, search]);

  const handleLoadMore = useCallback(() => {
    if (!clientsHasMore || isClientsLoading || isClientsLoadingMore) return;
    pageRef.current += 1;
    loadClients(pageRef.current, search, false);
  }, [clientsHasMore, isClientsLoading, isClientsLoadingMore, loadClients, search]);

  return (
    <View style={{ flex: 1 }}>
      {/* Search + Add */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11,
          ...shadow.sm,
        }}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}
            value={search}
            onChangeText={handleSearch}
            placeholder="Търси по телефон или име..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={{
            width: 46, height: 46, borderRadius: 16,
            backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
            ...shadow.lg,
          }}
        >
          <Ionicons name="person-add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlashList
        data={clients}
        keyExtractor={(item) => item.phone}
        renderItem={({ item }: { item: ClientPhone }) => (
          <ClientRow client={item} onPress={() => setProfilePhone(item.phone)} />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 }}
        ListHeaderComponent={
          clients.length > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
              {clients.length} / {clientsTotal} клиента
            </Text>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isClientsLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}><ActivityIndicator color={colors.primary} size="large" /></View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people-outline" size={28} color={colors.primary} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>Няма клиенти</Text>
            </View>
          )
        }
        ListFooterComponent={isClientsLoadingMore ? <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator color={colors.primary} size="small" /></View> : null}
      />

      <AddClientModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => loadClients(1, search, true)}
      />

      <ClientProfileModal
        visible={!!profilePhone}
        phone={profilePhone}
        onClose={() => setProfilePhone(null)}
        onNameChange={() => loadClients(1, search, true)}
      />
    </View>
  );
}

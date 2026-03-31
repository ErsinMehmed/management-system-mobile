import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  TextInput, RefreshControl, Keyboard,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';
import type { ClientPhone } from '@/types';

function ClientRow({ client, onSaveName }: { client: ClientPhone; onSaveName: (phone: string, name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [nameText, setNameText] = useState(client.name ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setNameText(client.name ?? ''); }, [client.name]);

  const handleSave = async () => {
    setSaving(true);
    await onSaveName(client.phone, nameText.trim());
    setSaving(false);
    setEditing(false);
    Keyboard.dismiss();
  };

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 18, marginBottom: 10, padding: 16, ...shadow.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Avatar */}
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>
            {(client.name || client.phone).charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{client.phone}</Text>
          {client.name ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 2 }}>{client.name}</Text> : null}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={{ backgroundColor: colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{client.orderCount}×</Text>
          </View>
          {client.lastOrder && (
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>{dayjs(client.lastOrder).format('DD.MM.YY')}</Text>
          )}
        </View>

        <TouchableOpacity onPress={() => setEditing((v) => !v)} style={{ marginLeft: 10, padding: 6 }}>
          <Ionicons name={editing ? 'close-circle' : 'pencil'} size={18} color={editing ? colors.rejected : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {editing && (
        <View style={{ marginTop: 12, gap: 10 }}>
          <TextInput
            style={{
              backgroundColor: colors.bgInput, borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 11,
              fontSize: 15, color: colors.textPrimary,
              borderWidth: 1.5, borderColor: colors.primary,
            }}
            value={nameText}
            onChangeText={setNameText}
            placeholder="Въведи клиентско име..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            onSubmitEditing={handleSave}
            returnKeyType="done"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => { setNameText(client.name ?? ''); setEditing(false); Keyboard.dismiss(); }}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.bgInput, alignItems: 'center' }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Отмени</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave} disabled={saving}
              style={{ flex: 2, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Запази</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function ClientsTab() {
  const { clients, clientsTotal, clientsHasMore, isClientsLoading, isClientsLoadingMore, loadClients, saveClientName } = useClientOrderStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
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
      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
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
      </View>

      <FlashList
        data={clients}
        keyExtractor={(item) => item.phone}
        renderItem={({ item }: { item: ClientPhone }) => <ClientRow client={item} onSaveName={saveClientName} />}
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
    </View>
  );
}

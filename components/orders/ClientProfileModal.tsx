import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import { formatCurrency, productTitle } from '@/utils/format';
import api from '@/services/api';
import type { ClientProfile, OrderStatus } from '@/types';

const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; label: string }> = {
  нова:      { color: '#6366F1', bg: '#EEF2FF', label: 'Нова' },
  доставена: { color: '#16A34A', bg: '#DCFCE7', label: 'Доставена' },
  отказана:  { color: '#EF4444', bg: '#FEE2E2', label: 'Отказана' },
};

interface Props {
  visible: boolean;
  phone: string | null;
  onClose: () => void;
  onNameChange?: (phone: string, name: string) => void;
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 6, ...shadow.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon as any} size={13} color={color} />
        <Text style={{ fontSize: 9, fontWeight: '800', color, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '900', color, letterSpacing: -0.4 }}>{value}</Text>
    </View>
  );
}

export default function ClientProfileModal({ visible, phone, onClose, onNameChange }: Props) {
  const [data, setData]               = useState<ClientProfile | null>(null);
  const [loading, setLoading]         = useState(false);
  const [tab, setTab]                 = useState<'notes' | 'orders'>('notes');
  const [noteText, setNoteText]       = useState('');
  const [savingNote, setSavingNote]   = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [nameValue, setNameValue]     = useState('');
  const [savingName, setSavingName]   = useState(false);

  const fetchProfile = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const res = await api.get<ClientProfile>(`/api/client-phones/${encodeURIComponent(phone)}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && phone) {
      fetchProfile();
      setNoteText('');
      setNameModalOpen(false);
      setTab('notes');
    }
  }, [visible, phone]);

  const openNameEdit = () => {
    setNameValue(data?.name ?? '');
    setNameModalOpen(true);
  };

  const saveName = async () => {
    if (!phone) return;
    const trimmed = nameValue.trim();
    setSavingName(true);
    try {
      await api.put('/api/client-phones', { phone, name: trimmed });
      setData((prev) => (prev ? { ...prev, name: trimmed } : prev));
      onNameChange?.(phone, trimmed);
      setNameModalOpen(false);
    } catch (e: any) {
      Alert.alert('Грешка', e?.response?.data?.message ?? 'Неуспешно запазване.');
    } finally {
      setSavingName(false);
    }
  };

  const addNote = async () => {
    if (!phone || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/api/client-phones/${encodeURIComponent(phone)}/notes`, { text: noteText.trim() });
      setNoteText('');
      fetchProfile();
    } catch (e: any) {
      Alert.alert('Грешка', e?.response?.data?.message ?? 'Неуспешно запазване.');
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = (id: string) => {
    Alert.alert('Изтрий бележка', 'Сигурен ли си?', [
      { text: 'Отмени', style: 'cancel' },
      {
        text: 'Изтрий',
        style: 'destructive',
        onPress: async () => {
          if (!phone) return;
          try {
            await api.delete(`/api/client-phones/${encodeURIComponent(phone)}/notes?id=${id}`);
            fetchProfile();
          } catch {
            Alert.alert('Грешка', 'Неуспешно изтриване.');
          }
        },
      },
    ]);
  };

  const openOrder = (id: string) => {
    onClose();
    setTimeout(() => router.push(`/(tabs)/orders/${id}` as any), 150);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />
        <View style={{
          backgroundColor: '#F5F6FA', borderTopLeftRadius: 28, borderTopRightRadius: 28,
          maxHeight: '90%', ...shadow.lg, overflow: 'hidden',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
            borderBottomWidth: 1, borderBottomColor: '#EBEBF5', backgroundColor: '#fff',
          }}>
            <View style={{ position: 'absolute', top: 6, left: '50%', marginLeft: -18, width: 36, height: 4, backgroundColor: '#E0E0EE', borderRadius: 2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, marginTop: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: data?.name ? '#1C1C2E' : '#A0A0BE', fontStyle: data?.name ? 'normal' : 'italic' }} numberOfLines={1}>
                    {data?.name || 'Без име'}
                  </Text>
                  <TouchableOpacity onPress={openNameEdit} style={{ padding: 3 }}>
                    <Ionicons name="pencil" size={13} color="#A0A0BE" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="call" size={11} color="#A0A0BE" />
                  <Text style={{ fontSize: 12, color: '#A0A0BE', fontWeight: '600' }}>{phone}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
              <Ionicons name="close" size={16} color="#52527A" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : !data ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ color: '#A0A0BE' }}>Няма данни за клиента.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
              {/* Stats */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatBox icon="bag-outline" label="Поръчки" value={String(data.summary.totalOrders)} color="#6366F1" />
                <StatBox icon="cash-outline" label="Общо" value={formatCurrency(data.summary.totalRevenue)} color="#16A34A" />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatBox icon="checkmark-circle-outline" label="Доставени" value={String(data.summary.delivered)} color="#0EA5E9" />
                <StatBox icon="close-circle-outline" label="Отказани" value={String(data.summary.rejected)} color="#EF4444" />
              </View>

              {/* Favorite product */}
              {data.favoriteProduct && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: '#FFFBEB', borderRadius: 14, padding: 12,
                  borderWidth: 1, borderColor: '#FDE68A',
                }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="star" size={16} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#D97706', letterSpacing: 0.5, textTransform: 'uppercase' }}>Любим продукт</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C2E' }} numberOfLines={1}>
                      {productTitle({ name: data.favoriteProduct.name, weight: data.favoriteProduct.weight } as any)}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600' }}>
                      {data.favoriteProduct.quantity} бр. в {data.favoriteProduct.orders} поръчки
                    </Text>
                  </View>
                </View>
              )}

              {/* Tab switcher */}
              <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, ...shadow.sm }}>
                {(['notes', 'orders'] as const).map((t) => {
                  const active = tab === t;
                  const count = t === 'notes' ? data.notes.length : data.orders.length;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setTab(t)}
                      style={{
                        flex: 1, paddingVertical: 9, borderRadius: 8,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        backgroundColor: active ? '#EEF2FF' : 'transparent',
                      }}
                    >
                      <Ionicons name={t === 'notes' ? 'document-text-outline' : 'bag-outline'} size={14} color={active ? '#6366F1' : '#A0A0BE'} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#6366F1' : '#A0A0BE' }}>
                        {t === 'notes' ? 'Бележки' : 'Поръчки'}
                      </Text>
                      {count > 0 && (
                        <View style={{ backgroundColor: active ? '#6366F1' : '#E2E2F0', borderRadius: 999, paddingHorizontal: 6, minWidth: 18, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: active ? '#fff' : '#52527A' }}>{count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Notes tab */}
              {tab === 'notes' && (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={{
                        flex: 1, backgroundColor: '#fff', borderRadius: 12,
                        paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
                        color: '#1C1C2E', minHeight: 44, textAlignVertical: 'top',
                        ...shadow.sm,
                      }}
                      value={noteText}
                      onChangeText={setNoteText}
                      placeholder="Напр. Иска винаги Fresh Whip"
                      placeholderTextColor="#A0A0BE"
                      multiline
                    />
                    <TouchableOpacity
                      onPress={addNote}
                      disabled={!noteText.trim() || savingNote}
                      style={{
                        width: 44, alignItems: 'center', justifyContent: 'center',
                        borderRadius: 12,
                        backgroundColor: !noteText.trim() ? colors.bgElevated : colors.primary,
                      }}
                    >
                      {savingNote ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={20} color="#fff" />}
                    </TouchableOpacity>
                  </View>

                  {data.notes.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
                      <Ionicons name="document-text-outline" size={32} color="#E2E2F0" />
                      <Text style={{ color: '#A0A0BE', fontSize: 13, fontWeight: '600' }}>Няма бележки</Text>
                    </View>
                  ) : (
                    data.notes.map((note) => (
                      <View
                        key={note._id}
                        style={{
                          flexDirection: 'row', gap: 10,
                          backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12,
                          borderWidth: 1, borderColor: '#FDE68A',
                        }}
                      >
                        <Ionicons name="document-text" size={14} color="#D97706" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={{ fontSize: 13, color: '#1C1C2E', lineHeight: 19 }}>{note.text}</Text>
                          <Text style={{ fontSize: 10, color: '#A0A0BE', fontWeight: '600' }}>
                            {note.createdBy?.name ? `${note.createdBy.name} · ` : ''}{dayjs(note.createdAt).format('DD.MM.YYYY HH:mm')}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteNote(note._id)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={14} color="#A0A0BE" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* Orders tab */}
              {tab === 'orders' && (
                <View style={{ gap: 8 }}>
                  {data.orders.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
                      <Ionicons name="bag-outline" size={32} color="#E2E2F0" />
                      <Text style={{ color: '#A0A0BE', fontSize: 13, fontWeight: '600' }}>Няма поръчки</Text>
                    </View>
                  ) : (
                    data.orders.map((o) => {
                      const cfg = STATUS_CFG[o.status] ?? STATUS_CFG['нова'];
                      return (
                        <TouchableOpacity
                          key={o._id}
                          onPress={() => openOrder(o._id)}
                          activeOpacity={0.85}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                            backgroundColor: '#fff', borderRadius: 12, padding: 12,
                            ...shadow.sm,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0A0BE' }}>#{o.orderNumber}</Text>
                              <View style={{ backgroundColor: cfg.bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1C1C2E' }} numberOfLines={1}>
                              {productTitle(o.product as any)} · {o.quantity} бр.
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                              <Ionicons name="time-outline" size={11} color="#A0A0BE" />
                              <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600' }}>
                                {dayjs(o.createdAt).format('DD.MM.YYYY')}
                                {o.assignedTo?.name ? ` · ${o.assignedTo.name}` : ''}
                              </Text>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#6366F1' }}>
                              {formatCurrency(o.quantity * o.price)}
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color="#C0C0D8" />
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              <View style={{ height: 8 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Edit name modal */}
      <Modal visible={nameModalOpen} transparent animationType="fade" onRequestClose={() => setNameModalOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
            activeOpacity={1}
            onPress={() => setNameModalOpen(false)}
          />
          <View style={{
            position: 'absolute', left: 16, right: 16, top: '28%',
            backgroundColor: '#fff', borderRadius: 22, ...shadow.lg, overflow: 'hidden',
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="pencil" size={15} color="#fff" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1C1C2E' }}>Промени име</Text>
              </View>
              <TouchableOpacity onPress={() => setNameModalOpen(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#A0A0BE" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18, gap: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#A0A0BE', letterSpacing: 0.4 }}>ИМЕ НА КЛИЕНТА</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.bgInput, borderRadius: 12,
                paddingHorizontal: 12, paddingVertical: 11,
                borderWidth: 1.5, borderColor: 'transparent',
              }}>
                <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: '#1C1C2E' }}
                  value={nameValue}
                  onChangeText={setNameValue}
                  placeholder="Напр. Иван Петров"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                />
              </View>
              <Text style={{ fontSize: 11, color: '#A0A0BE' }}>
                Остави празно за да премахнеш името.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 18 }}>
              <TouchableOpacity
                onPress={() => setNameModalOpen(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.bgInput, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>Отказ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveName}
                disabled={savingName}
                style={{ flex: 2, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' }}
              >
                {savingName
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Запази</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}

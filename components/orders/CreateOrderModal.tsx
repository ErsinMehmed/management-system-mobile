import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';
import { productTitle } from '@/utils/format';
import api from '@/services/api';
import type { Product, UserListItem } from '@/types';

interface Props { visible: boolean; onClose: () => void; onSuccess?: () => void }

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: colors.bgInput, borderRadius: 14,
          paddingHorizontal: 14, paddingVertical: 12,
          fontSize: 15, color: colors.textPrimary,
          borderWidth: 1.5, borderColor: 'transparent',
          minHeight: multiline ? 72 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

function ProductPicker({ label, products, value, onSelect }: {
  label: string; products: Product[]; value: string; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p._id === value);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.bgInput, borderRadius: 14,
          paddingHorizontal: 14, paddingVertical: 13,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1.5, borderColor: value ? colors.primary : 'transparent',
        }}
      >
        <Text style={{ color: selected ? colors.textPrimary : colors.textMuted, fontSize: 15, flex: 1 }}>
          {selected ? productTitle(selected) : 'Избери продукт...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '70%', ...shadow.lg }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Избери продукт</Text>
          </View>
          <ScrollView>
            {value && (
              <TouchableOpacity
                onPress={() => { onSelect(''); setOpen(false); }}
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>— Без продукт —</Text>
              </TouchableOpacity>
            )}
            {products.filter((p) => !p.hidden).map((p) => (
              <TouchableOpacity
                key={p._id}
                onPress={() => { onSelect(p._id); setOpen(false); }}
                style={{
                  padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: value === p._id ? colors.primaryLight : 'transparent',
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>{productTitle(p)}</Text>
                {value === p._id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function UserPicker({ label, users, value, onSelect }: {
  label: string; users: UserListItem[]; value: string; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = users?.find((u) => u._id === value);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.bgInput, borderRadius: 14,
          paddingHorizontal: 14, paddingVertical: 13,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          borderWidth: 1.5, borderColor: value ? colors.primary : 'transparent',
        }}
      >
        <Text style={{ color: selected ? colors.textPrimary : colors.textMuted, fontSize: 15, flex: 1 }}>
          {selected ? selected.name : 'Избери дистрибутор...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '70%', ...shadow.lg }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Избери дистрибутор</Text>
          </View>
          <ScrollView>
            <TouchableOpacity
              onPress={() => { onSelect(''); setOpen(false); }}
              style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>— Без дистрибутор —</Text>
            </TouchableOpacity>
            {users?.map((u) => (
              <TouchableOpacity
                key={u._id}
                onPress={() => { onSelect(u._id); setOpen(false); }}
                style={{
                  padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: value === u._id ? colors.primaryLight : 'transparent',
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>{u.name}</Text>
                {value === u._id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export default function CreateOrderModal({ visible, onClose, onSuccess }: Props) {
  const { orderData, setOrderData, clearOrderData, createOrder, isCreating } = useClientOrderStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';
  const isSuperAdmin = user?.role === 'Super Admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);

  useEffect(() => {
    if (!visible) return;
    api.get<Product[]>('/api/products').then((r) => setProducts(r.data || [])).catch(() => setProducts([]));
    if (isAdmin) {
      api.get<{ users: UserListItem[] }>('/api/users/list').then((r) => setUsers(r.data.users || [])).catch(() => setUsers([]));
    }
  }, [visible, isAdmin]);

  useEffect(() => {
    if (!orderData.product || !orderData.quantity) return;
    const p = products.find((x) => x._id === orderData.product);
    if (!p) return;
    const qty = parseInt(orderData.quantity) || 1;
    const price = p.sell_prices?.[qty - 1] ?? p.price ?? 0;
    if (price) setOrderData({ price: String(price) });
  }, [orderData.product, orderData.quantity]);

  useEffect(() => {
    if (!orderData.product2 || !orderData.quantity2) return;
    const p = products.find((x) => x._id === orderData.product2);
    if (!p) return;
    const qty = parseInt(orderData.quantity2) || 1;
    const price = p.sell_prices?.[qty - 1] ?? p.price ?? 0;
    if (price) setOrderData({ price2: String(price) });
  }, [orderData.product2, orderData.quantity2]);

  const handleSubmit = async () => {
    if (!orderData.phone || !orderData.product || !orderData.quantity || !orderData.price) {
      Alert.alert('Непълни данни', 'Попълни: телефон, продукт, бройки, цена.');
      return;
    }
    const ok = await createOrder();
    if (ok) { onClose(); onSuccess?.(); }
    else Alert.alert('Грешка', 'Неуспешно създаване.');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', ...shadow.lg }}>
          {/* Header */}
          <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ position: 'absolute', top: 8, left: '50%', marginLeft: -18, width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 8 }}>Нова поръчка</Text>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
            <Field label="ТЕЛЕФОН *" value={orderData.phone} onChangeText={(v) => setOrderData({ phone: v.replace(/\s+/g, '') })} placeholder="0888123456" keyboardType="phone-pad" />

            <ProductPicker label="ПРОДУКТ *" products={products} value={orderData.product} onSelect={(id) => setOrderData({ product: id })} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="БРОЙКИ *" value={orderData.quantity} onChangeText={(v) => setOrderData({ quantity: v })} placeholder="1" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="ЦЕНА (€) *" value={orderData.price} onChangeText={(v) => setOrderData({ price: v })} placeholder="0.00" keyboardType="numeric" />
              </View>
            </View>

            <ProductPicker label="ВТОРИ ПРОДУКТ" products={products} value={orderData.product2} onSelect={(id) => setOrderData({ product2: id, quantity2: id ? '1' : '', price2: '' })} />

            {orderData.product2 ? (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="БРОЙКИ 2" value={orderData.quantity2} onChangeText={(v) => setOrderData({ quantity2: v })} placeholder="1" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="ЦЕНА 2 (€)" value={orderData.price2} onChangeText={(v) => setOrderData({ price2: v })} placeholder="0.00" keyboardType="numeric" />
                </View>
              </View>
            ) : null}

            <Field label="АДРЕС" value={orderData.address} onChangeText={(v) => setOrderData({ address: v })} placeholder="гр. София, ул. ..." />

            <Field label="БЕЛЕЖКА" value={orderData.note} onChangeText={(v) => setOrderData({ note: v })} placeholder="Обаждане преди доставка..." multiline />

               {/* Contact method toggles */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>КОНТАКТ</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([
                  { value: 'viber', label: 'Viber', icon: 'viber', color: '#7360F2' },
                  { value: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', color: '#25D366' },
                ] as const).map((opt) => {
                  const active = orderData.contactMethod === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setOrderData({ contactMethod: active ? '' : opt.value })}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        paddingVertical: 12, borderRadius: 14,
                        backgroundColor: active ? opt.color + '18' : colors.bgInput,
                        borderWidth: 1.5,
                        borderColor: active ? opt.color : 'transparent',
                      }}
                    >
                      <FontAwesome5 name={opt.icon} size={17} color={active ? opt.color : colors.textMuted} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: active ? opt.color : colors.textMuted }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field label="ЦЕНА ДОСТАВКА (€)" value={orderData.deliveryCost} onChangeText={(v) => setOrderData({ deliveryCost: v })} placeholder="0.00" keyboardType="numeric" />

            {isSuperAdmin && (
              <Field label="ХОНОРАР ДИСТРИБУТОР" value={orderData.distributorPayout} onChangeText={(v) => setOrderData({ distributorPayout: v })} placeholder="0.00" keyboardType="numeric" />
            )}

            {isAdmin && (
              <UserPicker label="ДИСТРИБУТОР" users={(users || []).filter((u) => u._id !== user?.id)} value={orderData.assignedTo} onSelect={(id) => setOrderData({ assignedTo: id })} />
            )}

            <View style={{ height: 1 }} />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isCreating}
              style={{
                backgroundColor: isCreating ? colors.bgElevated : colors.primary,
                borderRadius: 16, paddingVertical: 15, alignItems: 'center',
                ...(!isCreating ? shadow.lg : {}),
              }}
            >
              {isCreating
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Добави поръчка</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

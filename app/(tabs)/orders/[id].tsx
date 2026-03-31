import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  Alert, Modal, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { useClientOrderStore } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';
import { productTitle, formatCurrency } from '@/utils/format';
import api from '@/services/api';
import type { Order, OrderStatus, Product } from '@/types';

const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; label: string; icon: string }> = {
  нова:      { color: '#6366F1', bg: '#EEF2FF', label: 'Нова',      icon: 'time-outline' },
  доставена: { color: '#16A34A', bg: '#DCFCE7', label: 'Доставена', icon: 'checkmark-circle-outline' },
  отказана:  { color: '#EF4444', bg: '#FEE2E2', label: 'Отказана',  icon: 'close-circle-outline' },
};

const ALL_STATUSES: OrderStatus[] = ['нова', 'доставена', 'отказана'];

// ─── Row helper ───────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={icon as any} size={17} color="#7878A0" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 }}>
          {label.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: valueColor ?? '#1C1C2E' }} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F0F0F8' }} />;
}

// ─── Product thumb ────────────────────────────────────────────────────────────

function ProductThumb({ imageUrl, size = 52 }: { imageUrl?: string; name?: string; size?: number }) {
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={{ width: size, height: size, borderRadius: 12 }} resizeMode="cover" />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: 12,
      backgroundColor: '#ECEDF8', alignItems: 'center', justifyContent: 'center',
    }}>
      <Ionicons name="cube-outline" size={size * 0.44} color="#6366F1" />
    </View>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditOrderModal({ visible, order, products, isSuperAdmin, onClose, onSuccess }: {
  visible: boolean; order: Order; products: Product[];
  isSuperAdmin: boolean; onClose: () => void; onSuccess: (fields: any) => void;
}) {
  const { updateProductPrice } = useClientOrderStore();
  const [productId, setProductId]   = useState(order.product?._id ?? '');
  const [qty, setQty]               = useState(String(order.quantity ?? 1));
  const [price, setPrice]           = useState(String(order.price ?? ''));
  const [payout, setPayout]         = useState(String(order.payout ?? 0));
  const [distributorPayout, setDistributorPayout] = useState(String(order.distributorPayout ?? 0));
  const [product2Id, setProduct2Id] = useState(order.secondProduct?.product?._id ?? '');
  const [qty2, setQty2]             = useState(String(order.secondProduct?.quantity ?? ''));
  const [price2, setPrice2]         = useState(String(order.secondProduct?.price ?? ''));
  const [showSecond, setShowSecond] = useState(!!order.secondProduct?.product);
  const [saving, setSaving]         = useState(false);
  const [productPickerOpen, setProductPickerOpen]   = useState(false);
  const [product2PickerOpen, setProduct2PickerOpen] = useState(false);

  const selectedProduct  = products.find((p) => p._id === productId);
  const selectedProduct2 = products.find((p) => p._id === product2Id);

  const handleProductSelect = (id: string) => {
    const p = products.find((x) => x._id === id);
    const q = parseInt(qty) || 1;
    setProductId(id); setProductPickerOpen(false);
    if (p?.sell_prices?.[q - 1] !== undefined) setPrice(String(p.sell_prices[q - 1]));
    if (isSuperAdmin && (p as any)?.seller_prices?.[q - 1] !== undefined) setPayout(String((p as any).seller_prices[q - 1]));
  };

  const handleQtyChange = (v: string) => {
    setQty(v);
    const q = parseInt(v) || 1;
    if (selectedProduct?.sell_prices?.[q - 1] !== undefined) setPrice(String(selectedProduct.sell_prices[q - 1]));
    if (isSuperAdmin && (selectedProduct as any)?.seller_prices?.[q - 1] !== undefined) setPayout(String((selectedProduct as any).seller_prices[q - 1]));
  };

  const handleProduct2Select = (id: string) => {
    const p = products.find((x) => x._id === id);
    const q = parseInt(qty2) || 1;
    setProduct2Id(id); setProduct2PickerOpen(false);
    if (p?.sell_prices?.[q - 1] !== undefined) setPrice2(String(p.sell_prices[q - 1]));
  };

  const handleSave = async () => {
    setSaving(true);
    const secondProductPayload = showSecond && product2Id
      ? { product: product2Id, quantity: parseInt(qty2) || 1, price: parseFloat(price2) || 0 }
      : null;
    const ok = await updateProductPrice(order._id, {
      product: productId,
      quantity: parseInt(qty) || 1,
      price: parseFloat(price) || 0,
      payout: isSuperAdmin ? parseFloat(payout) || 0 : undefined,
      secondProduct: secondProductPayload,
      distributorPayout: isSuperAdmin ? parseFloat(distributorPayout) || 0 : undefined,
    });
    setSaving(false);
    if (ok) {
      onSuccess({
        product: products.find((p) => p._id === productId) ?? order.product,
        quantity: parseInt(qty) || 1,
        price: parseFloat(price) || 0,
        payout: isSuperAdmin ? parseFloat(payout) || 0 : order.payout,
        secondProduct: showSecond && product2Id ? {
          product: products.find((p) => p._id === product2Id) ?? null,
          quantity: parseInt(qty2) || 1,
          price: parseFloat(price2) || 0,
          payout: 0,
        } : null,
        distributorPayout: isSuperAdmin ? parseFloat(distributorPayout) || 0 : order.distributorPayout,
      });
      onClose();
    } else {
      Alert.alert('Грешка', 'Неуспешно редактиране.');
    }
  };

  const Field = ({ label, value, onChange, accent = false }: any) => (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: accent ? '#F59E0B' : '#7878A0', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: '#F7F8FC', borderRadius: 12, padding: 13,
          color: '#1C1C2E', fontSize: 15,
          borderWidth: 1.5, borderColor: accent ? 'rgba(245,158,11,0.3)' : '#EBEBF5',
        }}
        value={value} onChangeText={onChange}
        keyboardType="numeric" placeholderTextColor="#A0A0BE"
      />
    </View>
  );

  const Picker = ({ label, selected, onPress }: { label: string; selected: Product | undefined; onPress: () => void }) => (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#7878A0', letterSpacing: 0.4 }}>{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: '#F7F8FC', borderRadius: 12, borderWidth: 1.5,
          borderColor: selected ? '#6366F1' : '#EBEBF5',
          padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: selected ? '#1C1C2E' : '#A0A0BE', fontSize: 14, flex: 1 }}>
          {selected ? productTitle(selected) : 'Избери продукт...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#A0A0BE" />
      </TouchableOpacity>
    </View>
  );

  const ProductPickerSheet = ({ open, onClose: close, onSelect, excludeId }: any) => (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={close} />
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F8' }}>
          <View style={{ width: 36, height: 4, backgroundColor: '#E0E0EE', borderRadius: 2, alignSelf: 'center', marginBottom: 10 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1C2E' }}>Избери продукт</Text>
        </View>
        <ScrollView>
          {products.filter((p) => !p.hidden && p._id !== excludeId).map((p) => (
            <TouchableOpacity
              key={p._id}
              onPress={() => onSelect(p._id)}
              style={{
                padding: 16, borderBottomWidth: 1, borderBottomColor: '#F4F4F8',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: [productId, product2Id].includes(p._id) ? '#EEF2FF' : 'transparent',
              }}
            >
              <Text style={{ color: '#1C1C2E', fontSize: 14, flex: 1 }}>{productTitle(p)}</Text>
              {[productId, product2Id].includes(p._id) && <Ionicons name="checkmark" size={16} color="#6366F1" />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />
      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ position: 'absolute', top: 8, left: '50%', marginLeft: -18, width: 36, height: 4, backgroundColor: '#E0E0EE', borderRadius: 2 }} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#1C1C2E', marginTop: 8 }}>Редактирай поръчка</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
            <Ionicons name="close" size={17} color="#7878A0" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Picker label="ПРОДУКТ" selected={selectedProduct} onPress={() => setProductPickerOpen(true)} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Field label="БРОЙКИ" value={qty} onChange={handleQtyChange} /></View>
            <View style={{ flex: 1 }}><Field label="ЦЕНА (€)" value={price} onChange={setPrice} /></View>
          </View>
          {isSuperAdmin && <Field label="ЗА ИЗПЛАЩАНЕ (€)" value={payout} onChange={setPayout} accent />}
          {isSuperAdmin && <Field label="ХОНОРАР ДИСТРИБУТОР" value={distributorPayout} onChange={setDistributorPayout} accent />}

          {showSecond ? (
            <View style={{ gap: 12, backgroundColor: '#F7F8FC', borderRadius: 16, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366F1' }}>Втори продукт</Text>
                <TouchableOpacity onPress={() => { setShowSecond(false); setProduct2Id(''); setQty2(''); setPrice2(''); }}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
              <Picker label="ПРОДУКТ 2" selected={selectedProduct2} onPress={() => setProduct2PickerOpen(true)} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><Field label="БРОЙКИ 2" value={qty2} onChange={setQty2} /></View>
                <View style={{ flex: 1 }}><Field label="ЦЕНА 2 (€)" value={price2} onChange={setPrice2} /></View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowSecond(true)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                paddingVertical: 14, borderRadius: 14,
                borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#DDDDF0',
              }}
            >
              <Ionicons name="add-circle-outline" size={16} color="#A0A0BE" />
              <Text style={{ color: '#A0A0BE', fontSize: 13, fontWeight: '600' }}>Добави втори продукт</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saving ? '#E0E0EE' : '#6366F1',
              borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4,
            }}
          >
            {saving
              ? <ActivityIndicator color="#6366F1" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Запази промените</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 8 }} />
        </ScrollView>
      </View>

      <ProductPickerSheet open={productPickerOpen} onClose={() => setProductPickerOpen(false)} onSelect={handleProductSelect} excludeId={product2Id} />
      <ProductPickerSheet open={product2PickerOpen} onClose={() => setProduct2PickerOpen(false)} onSelect={handleProduct2Select} excludeId={productId} />
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { updateStatus, markAsViewed } = useClientOrderStore();

  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin      = user?.role === 'Admin' || isSuperAdmin;
  const isSeller     = user?.role === 'Seller';

  const [order, setOrder]                   = useState<Order | null>(null);
  const [loading, setLoading]               = useState(true);
  const [products, setProducts]             = useState<Product[]>([]);
  const [statusSheet, setStatusSheet]       = useState(false);
  const [editVisible, setEditVisible]       = useState(false);
  const [rejectionVisible, setRejectionVisible] = useState(false);
  const [rejectionReason, setRejectionReason]   = useState('');
  const [rejectionLoading, setRejectionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<Order>(`/api/client-orders/${id}`);
        setOrder(data);
        if (user?.role === 'Seller' && (data as any).assignedTo?._id === user.id && !data.viewedBySeller) {
          await markAsViewed(id);
        }
      } finally {
        setLoading(false);
      }
    })();
    api.get<Product[]>('/api/products').then((r) => setProducts(r.data));
  }, [id]);

  const handleStatusChange = async (st: OrderStatus) => {
    if (!order) return;
    setStatusSheet(false);
    if (st === 'отказана') {
      setRejectionVisible(true);
    } else {
      await updateStatus(order._id, st);
      setOrder((prev) => prev ? { ...prev, status: st, rejectionReason: '' } : prev);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!order) return;
    setRejectionLoading(true);
    await updateStatus(order._id, 'отказана', rejectionReason);
    setOrder((prev) => prev ? { ...prev, status: 'отказана', rejectionReason } : prev);
    setRejectionLoading(false);
    setRejectionVisible(false);
    setRejectionReason('');
  };

  const handleEditSuccess = (fields: any) => {
    setOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        product: fields.product ?? prev.product,
        quantity: fields.quantity,
        price: fields.price,
        payout: fields.payout ?? prev.payout,
        secondProduct: fields.secondProduct ?? prev.secondProduct,
        distributorPayout: fields.distributorPayout ?? prev.distributorPayout,
      };
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F6FA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6366F1" size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6FA', alignItems: 'center', justifyContent: 'center', gap: 12 }} edges={['top']}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
        </View>
        <Text style={{ color: '#1C1C2E', fontSize: 17, fontWeight: '700' }}>Поръчката не е намерена</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 4, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#EEF2FF', borderRadius: 12 }}>
          <Text style={{ color: '#6366F1', fontWeight: '700' }}>← Назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const s = STATUS_CFG[order.status] ?? STATUS_CFG['нова'];
  const isLocked = ['отказана', 'доставена'].includes(order.status) && !isSuperAdmin;
  const canEdit  = order.status === 'нова' || isSuperAdmin;
  const totalPrice = order.price + (order.secondProduct?.price ?? 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F6FA' }} edges={['top']}>

      {/* ── HEADER ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#F5F6FA',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color="#1C1C2E" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600', letterSpacing: 0.4 }}>ПОРЪЧКА</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1C1C2E', letterSpacing: -0.3 }}>
            {order.orderNumber > 0 ? `#${order.orderNumber}` : order.phone}
          </Text>
        </View>
        {canEdit && (
          <TouchableOpacity
            onPress={() => setEditVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366F1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 }}
          >
            <Ionicons name="pencil-outline" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Редактирай</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── HERO CARD ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }}>
          {/* Colored top stripe */}
          <View style={{ height: 4, backgroundColor: s.color }} />

          <View style={{ padding: 20, gap: 16 }}>
            {/* Phone + badges */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="call-outline" size={16} color="#A0A0BE" />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#1C1C2E', flex: 1 }}>
                {order.phone}
              </Text>
              {order.isNewClient && (
                <View style={{ backgroundColor: '#FEF9C3', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#A16207' }}>НОВ КЛИЕНТ</Text>
                </View>
              )}
            </View>

            {/* Status row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: s.bg, borderRadius: 12, padding: 12,
              }}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: s.color }}>{s.label}</Text>
              </View>
              {(isAdmin || isSeller) && !isLocked && (
                <TouchableOpacity
                  onPress={() => setStatusSheet(true)}
                  style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="swap-vertical-outline" size={20} color="#7878A0" />
                </TouchableOpacity>
              )}
            </View>

            {/* Rejection reason */}
            {order.status === 'отказана' && order.rejectionReason && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12 }}>
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 1 }} />
                <Text style={{ color: '#EF4444', fontSize: 13, flex: 1, lineHeight: 18, fontWeight: '500' }}>
                  {order.rejectionReason}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── PRICE STRIP ── */}
        <View style={{
          backgroundColor: '#6366F1', borderRadius: 22,
          padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 0.4, marginBottom: 4 }}>
              ОБЩА СТОЙНОСТ
            </Text>
            <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -1 }}>
              {formatCurrency(totalPrice)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                {order.quantity}{order.secondProduct?.product ? ` + ${order.secondProduct.quantity}` : ''} бр.
              </Text>
            </View>
            {isSuperAdmin && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: '#FDE68A', fontSize: 12, fontWeight: '700' }}>
                  Хонорар: {formatCurrency(order.payout)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── PRODUCTS ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 22, padding: 6, gap: 0 }}>
          <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#A0A0BE', letterSpacing: 0.5 }}>ПРОДУКТИ</Text>
          </View>

          {/* Primary */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingBottom: 14 }}>
            <ProductThumb imageUrl={(order.product as any)?.image_url} name={order.product?.name} size={54} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C2E', lineHeight: 20 }} numberOfLines={2}>
                {productTitle(order.product)}
              </Text>
              <Text style={{ fontSize: 13, color: '#A0A0BE', fontWeight: '500', marginTop: 2 }}>
                {order.quantity} бр.
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#6366F1' }}>
              {formatCurrency(order.price)}
            </Text>
          </View>

          {/* Second product */}
          {order.secondProduct?.product && (
            <>
              <View style={{ height: 1, backgroundColor: '#F4F4F8', marginHorizontal: 14 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 14 }}>
                <ProductThumb imageUrl={(order.secondProduct.product as any)?.image_url} name={order.secondProduct.product?.name} size={54} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C2E', lineHeight: 20 }} numberOfLines={2}>
                    {productTitle(order.secondProduct.product)}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#A0A0BE', fontWeight: '500', marginTop: 2 }}>
                    {order.secondProduct.quantity} бр.
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#6366F1' }}>
                  {formatCurrency(order.secondProduct.price)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── DETAILS ── */}
        {(order.address || order.note || order.assignedTo?.name || (isSuperAdmin && order.deliveryCost) || (isSuperAdmin && order.distributorPayout)) && (
          <View style={{ backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#A0A0BE', letterSpacing: 0.5, marginBottom: 4 }}>ДЕТАЙЛИ</Text>

            {order.address && (
              <>
                <Divider />
                <InfoRow icon="location-outline" label="Адрес" value={order.address} />
              </>
            )}
            {order.note && (
              <>
                <Divider />
                <InfoRow icon="chatbubble-ellipses-outline" label="Бележка" value={order.note} />
              </>
            )}
            {order.assignedTo?.name && (
              <>
                <Divider />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-outline" size={17} color="#7878A0" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 }}>ДОСТАВЧИК</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C2E' }}>{order.assignedTo.name}</Text>
                  </View>
                  {isSuperAdmin && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      backgroundColor: order.viewedBySeller ? '#DCFCE7' : '#F4F4F8',
                      borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
                    }}>
                      <Ionicons name="eye-outline" size={13} color={order.viewedBySeller ? '#16A34A' : '#A0A0BE'} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: order.viewedBySeller ? '#16A34A' : '#A0A0BE' }}>
                        {order.viewedBySeller ? 'Видяна' : 'Не видяна'}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
            {isSuperAdmin && order.deliveryCost != null && order.deliveryCost > 0 && (
              <>
                <Divider />
                <InfoRow icon="car-outline" label="Доставка" value={formatCurrency(order.deliveryCost)} />
              </>
            )}
            {isSuperAdmin && order.distributorPayout != null && order.distributorPayout > 0 && (
              <>
                <Divider />
                <InfoRow icon="cash-outline" label="Хонорар дистрибутор" value={formatCurrency(order.distributorPayout)} valueColor="#F59E0B" />
              </>
            )}
            <View style={{ height: 8 }} />
          </View>
        )}

        {/* ── DATE ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="calendar-outline" size={17} color="#7878A0" />
            </View>
            <View>
              <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 }}>ДАТА НА ПОРЪЧКАТА</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C2E' }}>
                {dayjs(order.createdAt).format('DD MMM YYYY · HH:mm')}
              </Text>
            </View>
          </View>

          {order.statusChangedAt && (
            <>
              <Divider />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={s.icon as any} size={17} color={s.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 }}>
                    {order.status === 'доставена' ? 'ДОСТАВЕНА НА' : order.status === 'отказана' ? 'ОТКАЗАНА НА' : 'СТАТУС СМЕНЕН НА'}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C2E' }}>
                    {dayjs(order.statusChangedAt).format('DD MMM YYYY · HH:mm')}
                  </Text>
                </View>
                <View style={{ backgroundColor: s.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: s.color }}>{s.label}</Text>
                </View>
              </View>
            </>
          )}
        </View>

      </ScrollView>

      {/* ── STATUS SHEET ── */}
      <Modal visible={statusSheet} transparent animationType="slide" onRequestClose={() => setStatusSheet(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setStatusSheet(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 10, paddingBottom: 44 }}>
          <View style={{ width: 36, height: 4, backgroundColor: '#E0E0EE', borderRadius: 2, alignSelf: 'center', marginBottom: 6 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1C2E', marginBottom: 4 }}>Смени статус</Text>
          {ALL_STATUSES.map((st) => {
            const cfg = STATUS_CFG[st];
            const isActive = order.status === st;
            return (
              <TouchableOpacity
                key={st}
                disabled={isLocked}
                onPress={() => handleStatusChange(st)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  padding: 16, borderRadius: 16,
                  backgroundColor: isActive ? cfg.bg : '#F7F8FC',
                  opacity: isLocked ? 0.4 : 1,
                }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.color }} />
                <Text style={{ flex: 1, color: isActive ? cfg.color : '#1C1C2E', fontWeight: '600', fontSize: 15 }}>
                  {cfg.label}
                </Text>
                {isActive && <Ionicons name="checkmark-circle" size={20} color={cfg.color} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* ── REJECTION MODAL ── */}
      <Modal visible={rejectionVisible} transparent animationType="slide" onRequestClose={() => setRejectionVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setRejectionVisible(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16, paddingBottom: 36 }}>
          <View style={{ width: 36, height: 4, backgroundColor: '#E0E0EE', borderRadius: 2, alignSelf: 'center', marginBottom: 4 }} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#1C1C2E' }}>Причина за отказ</Text>
          <TextInput
            style={{
              backgroundColor: '#F7F8FC', borderRadius: 14, padding: 14,
              color: '#1C1C2E', fontSize: 15,
              borderWidth: 1.5, borderColor: '#EBEBF5',
              minHeight: 90, textAlignVertical: 'top',
            }}
            placeholder="Въведи причина..."
            placeholderTextColor="#A0A0BE"
            multiline value={rejectionReason}
            onChangeText={setRejectionReason}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => setRejectionVisible(false)}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F4F4F8', alignItems: 'center' }}
            >
              <Text style={{ color: '#7878A0', fontWeight: '700' }}>Отмени</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRejectionSubmit}
              disabled={rejectionLoading}
              style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center' }}
            >
              {rejectionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800' }}>Откажи поръчката</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── EDIT MODAL ── */}
      {editVisible && (
        <EditOrderModal
          visible={editVisible}
          order={order}
          products={products}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditVisible(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </SafeAreaView>
  );
}

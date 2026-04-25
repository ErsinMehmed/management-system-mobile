import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '@/constants/theme';
import api from '@/services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded?: (phone: string, name: string) => void;
}

export default function AddClientModal({ visible, onClose, onAdded }: Props) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) { setPhone(''); setName(''); setError(''); }
  }, [visible]);

  const handlePhoneChange = (val: string) => {
    // Keep only digits and a leading +
    const cleaned = val.replace(/[^\d+]/g, '').replace(/(?<=.)\+/g, '');
    setPhone(cleaned);
    setError('');
  };

  const save = async () => {
    const trimmed = phone.trim();
    if (!/^\+?[0-9]{7,15}$/.test(trimmed)) {
      setError('Невалиден телефонен номер');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/client-phones', { phone: trimmed, name: name.trim() });
      onAdded?.(trimmed, name.trim());
      onClose();
    } catch (e: any) {
      Alert.alert('Грешка', e?.response?.data?.message ?? 'Възникна грешка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />
        <View style={{
          position: 'absolute', left: 16, right: 16, top: '25%',
          backgroundColor: '#fff', borderRadius: 22, ...shadow.lg, overflow: 'hidden',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F8',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person-add" size={17} color="#fff" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1C1C2E' }}>Нов клиент</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color="#A0A0BE" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={{ padding: 18, gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#A0A0BE', letterSpacing: 0.4 }}>ТЕЛЕФОН *</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.bgInput, borderRadius: 12,
                paddingHorizontal: 12, paddingVertical: 11,
                borderWidth: 1.5, borderColor: error ? colors.rejected : 'transparent',
              }}>
                <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: '#1C1C2E' }}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="0899..."
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  autoFocus
                />
              </View>
              {!!error && <Text style={{ fontSize: 12, color: colors.rejected }}>{error}</Text>}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#A0A0BE', letterSpacing: 0.4 }}>ИМЕ (по избор)</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.bgInput, borderRadius: 12,
                paddingHorizontal: 12, paddingVertical: 11,
                borderWidth: 1.5, borderColor: 'transparent',
              }}>
                <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: '#1C1C2E' }}
                  value={name}
                  onChangeText={setName}
                  placeholder="Напр. Иван Петров"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 18 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.bgInput, alignItems: 'center' }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 14 }}>Отказ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              disabled={!phone.trim() || saving}
              style={{
                flex: 2, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
                backgroundColor: !phone.trim() ? colors.bgElevated : colors.primary,
              }}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Добави</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';

interface Props {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onSuccess?: (reason: string) => void;
}

export default function RejectionModal({ visible, orderId, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateStatus } = useClientOrderStore();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateStatus(orderId, 'отказана', reason);
      onSuccess?.(reason);
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={onClose} />
        <View style={{
          backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: 24, gap: 16, paddingBottom: 36, ...shadow.lg,
        }}>
          <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center' }} />

          {/* Icon + title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.rejectedBg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>⚠️</Text>
            </View>
            <View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textPrimary }}>Откажи поръчка</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>Въведи причина за отказ</Text>
            </View>
          </View>

          <TextInput
            style={{
              backgroundColor: colors.bgInput, borderRadius: 16,
              padding: 14, color: colors.textPrimary, fontSize: 15,
              borderWidth: 1.5, borderColor: colors.border,
              minHeight: 90, textAlignVertical: 'top',
            }}
            placeholder="Причина за отказ..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={reason}
            onChangeText={setReason}
            autoFocus
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1, paddingVertical: 15, borderRadius: 16,
                backgroundColor: colors.bgInput, alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 15 }}>Отмени</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={{
                flex: 2, paddingVertical: 15, borderRadius: 16,
                backgroundColor: colors.rejected, alignItems: 'center',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Откажи поръчката</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadow } from '@/constants/theme';

interface Props {
  visible: boolean;
  message: string;
  type?: 'success' | 'error';
  onHide: () => void;
  duration?: number;
}

export default function Toast({ visible, message, type = 'success', onHide, duration = 3000 }: Props) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => onHide());
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  const isSuccess = type === 'success';
  const bg = isSuccess ? '#16A34A' : '#EF4444';
  const icon = isSuccess ? 'checkmark-circle' : 'close-circle';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <View style={{
        backgroundColor: bg,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        ...shadow.lg,
      }}>
        <Ionicons name={icon} size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 }}>{message}</Text>
      </View>
    </Animated.View>
  );
}

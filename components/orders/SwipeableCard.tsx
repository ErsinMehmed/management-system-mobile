import { useRef, useState } from 'react';
import { Animated, PanResponder, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

const THRESHOLD = 72;

interface Props {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  canSwipe?: boolean;
  // right bg label
  rightLabel?: string;
  rightColor?: string;
  rightIcon?: string;
  // left bg label
  leftLabel?: string;
  leftColor?: string;
  leftIcon?: string;
}

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  canSwipe = true,
  rightLabel = 'Доставена',
  rightColor = colors.delivered,
  rightIcon = 'checkmark',
  leftLabel = 'Отказана',
  leftColor = colors.rejected,
  leftIcon = 'close',
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [dx, setDx] = useState(0);
  const directionRef = useRef<'h' | 'v' | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        if (!canSwipe) return false;
        return Math.abs(g.dx) > Math.abs(g.dy) + 4;
      },
      onPanResponderGrant: (_, g) => {
        startXRef.current = g.x0;
        startYRef.current = g.y0;
        directionRef.current = null;
      },
      onPanResponderMove: (_, g) => {
        if (!canSwipe) return;
        const deltaX = g.dx;
        const deltaY = g.dy;

        if (directionRef.current === null) {
          if (Math.abs(deltaX) > Math.abs(deltaY) + 4) directionRef.current = 'h';
          else if (Math.abs(deltaY) > Math.abs(deltaX) + 4) directionRef.current = 'v';
          else return;
        }
        if (directionRef.current !== 'h') return;

        const clamped =
          deltaX > 0
            ? Math.min(deltaX, THRESHOLD * 1.2)
            : Math.max(deltaX, -THRESHOLD * 1.8);

        translateX.setValue(clamped);
        setDx(clamped);
      },
      onPanResponderRelease: (_, g) => {
        if (directionRef.current !== 'h') return;
        const finalDx = g.dx;

        if (finalDx < -THRESHOLD && onSwipeLeft) {
          Animated.timing(translateX, { toValue: -THRESHOLD * 1.5, duration: 150, useNativeDriver: true }).start(() => {
            onSwipeLeft();
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            setDx(0);
          });
        } else if (finalDx > THRESHOLD && onSwipeRight) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setDx(0);
          onSwipeRight();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setDx(0);
        }
      },
    })
  ).current;

  const leftReady = dx >= THRESHOLD;
  const rightReady = dx <= -THRESHOLD;

  return (
    <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 20 }}>
      {/* Swipe right bg (shows on left side) */}
      {onSwipeRight && (
        <View style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          backgroundColor: leftReady ? rightColor : `${rightColor}BB`,
          justifyContent: 'center', paddingLeft: 16,
        }}>
          <Ionicons name={rightIcon as any} size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2 }}>{rightLabel}</Text>
        </View>
      )}

      {/* Swipe left bg (shows on right side) */}
      {onSwipeLeft && (
        <View style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          backgroundColor: rightReady ? leftColor : `${leftColor}BB`,
          alignItems: 'flex-end', justifyContent: 'center', paddingRight: 16,
        }}>
          <Ionicons name={leftIcon as any} size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2 }}>{leftLabel}</Text>
        </View>
      )}

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

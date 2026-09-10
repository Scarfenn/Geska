import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Text, View } from "react-native";
import { ITEM_HEIGHT, WHEEL_HEIGHT, CENTER_PADDING, createLoopData, getMiddleIndex, getIndexFromOffset, getSettledIndex } from "../../domain/hourPickerModel";

// Native snapping can finish with a small fractional offset.
const SNAP_TOLERANCE = 2;
const IDLE_SETTLE_DELAY = 300;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const WheelItem = memo(function WheelItem({
  value,
  index,
  scrollY,
  textColor,
}) {
  const inputRange = [
    (index - 2) * ITEM_HEIGHT,
    (index - 1) * ITEM_HEIGHT,
    index * ITEM_HEIGHT,
    (index + 1) * ITEM_HEIGHT,
    (index + 2) * ITEM_HEIGHT,
  ];

  const scale = scrollY.interpolate({
    inputRange,
    outputRange: [0.82, 0.92, 1.12, 0.92, 0.82],
    extrapolate: "clamp",
  });

  const opacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.25, 0.55, 1, 0.55, 0.25],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={{
        height: ITEM_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
        opacity,
        transform: [{ scale }],
      }}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: "600",
          color: textColor,
        }}
      >
        {value}
      </Text>
    </Animated.View>
  );
});


export default function TimeWheel({ values, initialValue, valueRef, textColor, label, onMovingChange }) {
  const data = useMemo(() => createLoopData(values), [values]);
  const initialIndex = getMiddleIndex(values, initialValue);
  const list = useRef(null);
  const scrollY = useRef(new Animated.Value(initialIndex * ITEM_HEIGHT)).current;
  const offset = useRef(initialIndex * ITEM_HEIGHT);
  const timer = useRef(null);
  const dragging = useRef(false);
  const touching = useRef(false);
  const momentum = useRef(false);
  const snapTarget = useRef(null);
  const [accessibleValue, setAccessibleValue] = useState(initialValue);
  const callbacks = useRef({ onMovingChange });
  callbacks.current = { onMovingChange };
  useEffect(() => () => clearTimeout(timer.current), []);

  const moveTo = (index) => {
    const target = index * ITEM_HEIGHT;
    const needsPosition = Math.abs(offset.current - target) > 0.01;
    offset.current = target;
    scrollY.setValue(target);
    if (needsPosition) list.current?.scrollToOffset({ offset: target, animated: false });
    valueRef.current = data[index];
    setAccessibleValue(data[index]);
  };
  const settle = () => {
    clearTimeout(timer.current);
    if (touching.current || dragging.current || momentum.current) return;
    const index = getIndexFromOffset(offset.current, data.length);
    const target = index * ITEM_HEIGHT;
    if (Math.abs(offset.current - target) > SNAP_TOLERANCE && snapTarget.current !== target) {
      // Let native scrolling drive scale/opacity until the row reaches center.
      // Updating scrollY here would jump directly to the final visual state.
      snapTarget.current = target;
      callbacks.current.onMovingChange(true);
      list.current?.scrollToOffset({ offset: target, animated: true });
      timer.current = setTimeout(settle, IDLE_SETTLE_DELAY);
      return;
    }
    // Accept the native resting position without another scroll or setValue:
    // even an unanimated subpixel correction changes the item's scale/opacity.
    const settledIndex = getSettledIndex(index, values.length);
    if (settledIndex !== index) {
      // Preserve the fractional offset when relocating the circular list.
      const relocatedOffset = offset.current + (settledIndex - index) * ITEM_HEIGHT;
      offset.current = relocatedOffset;
      scrollY.setValue(relocatedOffset);
      list.current?.scrollToOffset({ offset: relocatedOffset, animated: false });
    }
    valueRef.current = data[index];
    setAccessibleValue(data[index]);
    callbacks.current.onMovingChange(false);
  };
  const scheduleSettle = () => {
    clearTimeout(timer.current);
    // This fallback is only for a release without native momentum. Sparse
    // events during a slow native snap must not trigger a competing animation.
    if (!touching.current && !dragging.current && !momentum.current) {
      timer.current = setTimeout(settle, IDLE_SETTLE_DELAY);
    }
  };
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true, listener: (event) => {
      offset.current = event.nativeEvent.contentOffset.y;
      valueRef.current = data[getIndexFromOffset(offset.current, data.length)];
      scheduleSettle();
    } },
  );
  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{ text: accessibleValue }}
      accessibilityActions={[{ name: "increment", label: "Aumentar" }, { name: "decrement", label: "Disminuir" }]}
      onAccessibilityAction={({ nativeEvent }) => {
        const step = nativeEvent.actionName === "increment" ? 1 : nativeEvent.actionName === "decrement" ? -1 : 0;
        if (!step) return;
        clearTimeout(timer.current);
        const current = values.indexOf(valueRef.current);
        const value = values[(current + step + values.length) % values.length];
        moveTo(getMiddleIndex(values, value));
        callbacks.current.onMovingChange(false);
      }}
      style={{ width: 100, height: WHEEL_HEIGHT }}>
      <AnimatedFlatList ref={list} data={data}
        accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden
        keyExtractor={(_, index) => String(index)}
        showsVerticalScrollIndicator={false} snapToInterval={ITEM_HEIGHT}
        decelerationRate={0.96} bounces={false} nestedScrollEnabled scrollEventThrottle={16}
        initialScrollIndex={initialIndex} initialNumToRender={9} maxToRenderPerBatch={15}
        windowSize={7} removeClippedSubviews={false}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        contentContainerStyle={{ paddingVertical: CENTER_PADDING }}
        onLayout={() => list.current?.scrollToOffset({ offset: offset.current, animated: false })}
        renderItem={({ item, index }) => <WheelItem value={item} index={index} scrollY={scrollY} textColor={textColor} />}
        onScroll={onScroll}
        onTouchStart={() => {
          touching.current = true;
          clearTimeout(timer.current);
        }}
        onTouchEnd={() => {
          touching.current = false;
          scheduleSettle();
        }}
        onTouchCancel={() => {
          touching.current = false;
          dragging.current = false;
          scheduleSettle();
        }}
        onScrollBeginDrag={() => {
          clearTimeout(timer.current);
          dragging.current = true;
          momentum.current = false;
          snapTarget.current = null;
          callbacks.current.onMovingChange(true);
        }}
        onScrollEndDrag={(event) => {
          dragging.current = false;
          offset.current = event.nativeEvent.contentOffset.y;
          scheduleSettle();
        }}
        onMomentumScrollBegin={() => {
          momentum.current = true;
          clearTimeout(timer.current);
          callbacks.current.onMovingChange(true);
        }}
        onMomentumScrollEnd={(event) => {
          momentum.current = false;
          if (touching.current || dragging.current) return;
          offset.current = event.nativeEvent.contentOffset.y;
          settle();
        }}
      />
    </View>
  );
}

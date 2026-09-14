import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  FlatList,
  Text,
  View,
} from "react-native";

import {
  ITEM_HEIGHT,
  WHEEL_HEIGHT,
  CENTER_PADDING,
  createLoopData,
  getMiddleIndex,
  getIndexFromOffset,
  getSettledIndex,
} from "@/features/tasks/domain/hourPickerModel";

const DRAG_SETTLE_DELAY = 80;
const SNAP_FINISH_DELAY = 220;

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

export default function TimeWheel({
  values,
  initialValue,
  valueRef,
  textColor,
  label,
  onMovingChange,
}) {
  const data = useMemo(
    () => createLoopData(values),
    [values],
  );

  const initialIndex = getMiddleIndex(
    values,
    initialValue,
  );

  const initialOffset = initialIndex * ITEM_HEIGHT;

  const listRef = useRef(null);

  const scrollY = useRef(
    new Animated.Value(initialOffset),
  ).current;

  const offsetRef = useRef(initialOffset);

  const touchingRef = useRef(false);
  const draggingRef = useRef(false);
  const momentumRef = useRef(false);
  const snappingRef = useRef(false);

  const movingRef = useRef(false);

  const dragTimerRef = useRef(null);
  const snapTimerRef = useRef(null);

  const callbacksRef = useRef({
    onMovingChange,
  });

  callbacksRef.current = {
    onMovingChange,
  };

  const [accessibleValue, setAccessibleValue] =
    useState(initialValue);

  const setMoving = (moving) => {
    if (movingRef.current === moving) {
      return;
    }

    movingRef.current = moving;

    callbacksRef.current.onMovingChange?.(
      moving,
    );
  };

  const clearDragTimer = () => {
    if (dragTimerRef.current === null) {
      return;
    }

    clearTimeout(dragTimerRef.current);
    dragTimerRef.current = null;
  };

  const clearSnapTimer = () => {
    if (snapTimerRef.current === null) {
      return;
    }

    clearTimeout(snapTimerRef.current);
    snapTimerRef.current = null;
  };

  const clearTimers = () => {
    clearDragTimer();
    clearSnapTimer();
  };

  const updateProvisionalValue = (index) => {
    const value = data[index];

    if (value !== undefined) {
      valueRef.current = value;
    }
  };

  const commitValue = (index) => {
    const value = data[index];

    if (value === undefined) {
      return;
    }

    valueRef.current = value;
    setAccessibleValue(value);
  };

  const recenterIfNeeded = (index) => {
    const settledIndex = getSettledIndex(
      index,
      values.length,
    );

    if (settledIndex === index) {
      return;
    }

    const relocatedOffset =
      settledIndex * ITEM_HEIGHT;

    offsetRef.current = relocatedOffset;

    scrollY.setValue(relocatedOffset);

    listRef.current?.scrollToOffset({
      offset: relocatedOffset,
      animated: false,
    });
  };

  const finalizeSnap = (index) => {
    clearSnapTimer();

    snappingRef.current = false;

    offsetRef.current =
      index * ITEM_HEIGHT;

    commitValue(index);

    recenterIfNeeded(index);

    setMoving(false);
  };

  const snapToNearest = () => {
    clearTimers();

    if (
      touchingRef.current ||
      draggingRef.current ||
      momentumRef.current ||
      snappingRef.current
    ) {
      return;
    }

    const index = getIndexFromOffset(
      offsetRef.current,
      data.length,
    );

    const target =
      index * ITEM_HEIGHT;

    const distance =
      Math.abs(offsetRef.current - target);

    commitValue(index);

    /*
     * Si ya quedó esencialmente centrado,
     * no hacemos una animación innecesaria.
     */
    if (distance < 0.5) {
      finalizeSnap(index);
      return;
    }

    snappingRef.current = true;

    setMoving(true);

    listRef.current?.scrollToOffset({
      offset: target,
      animated: true,
    });

    /*
     * Android no expone un callback fiable específico
     * para scrollToOffset(animated: true).
     *
     * onScroll seguirá actualizando offsetRef mientras
     * ocurre el snap. Este timer solo certifica el final.
     */
    snapTimerRef.current = setTimeout(() => {
      if (
        touchingRef.current ||
        draggingRef.current ||
        momentumRef.current
      ) {
        snappingRef.current = false;
        return;
      }

      finalizeSnap(index);
    }, SNAP_FINISH_DELAY);
  };

  const scheduleSnapAfterDrag = () => {
    clearDragTimer();

    /*
     * Damos un margen pequeño porque después de
     * onScrollEndDrag todavía puede comenzar momentum.
     */
    dragTimerRef.current = setTimeout(() => {
      if (
        !touchingRef.current &&
        !draggingRef.current &&
        !momentumRef.current
      ) {
        snapToNearest();
      }
    }, DRAG_SETTLE_DELAY);
  };

  const onScroll = Animated.event(
    [
      {
        nativeEvent: {
          contentOffset: {
            y: scrollY,
          },
        },
      },
    ],
    {
      useNativeDriver: true,

      listener: (event) => {
        const nextOffset =
          event.nativeEvent.contentOffset.y;

        offsetRef.current = nextOffset;

        const index = getIndexFromOffset(
          nextOffset,
          data.length,
        );

        updateProvisionalValue(index);
      },
    },
  );

  useEffect(() => {
    if (
      touchingRef.current ||
      draggingRef.current ||
      momentumRef.current ||
      snappingRef.current
    ) {
      return;
    }

    const index = getMiddleIndex(
      values,
      initialValue,
    );

    const target =
      index * ITEM_HEIGHT;

    clearTimers();

    offsetRef.current = target;

    scrollY.setValue(target);

    valueRef.current = data[index];
    setAccessibleValue(data[index]);

    listRef.current?.scrollToOffset({
      offset: target,
      animated: false,
    });
  }, [
    initialValue,
    values,
    data,
    scrollY,
    valueRef,
  ]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const moveAccessibilitySelection = (
    step,
  ) => {
    clearTimers();

    snappingRef.current = false;

    const current =
      values.indexOf(valueRef.current);

    const safeCurrent =
      current >= 0 ? current : 0;

    const nextValue =
      values[
        (
          safeCurrent +
          step +
          values.length
        ) % values.length
      ];

    const index = getMiddleIndex(
      values,
      nextValue,
    );

    const target =
      index * ITEM_HEIGHT;

    offsetRef.current = target;

    scrollY.setValue(target);

    listRef.current?.scrollToOffset({
      offset: target,
      animated: false,
    });

    valueRef.current = nextValue;
    setAccessibleValue(nextValue);

    setMoving(false);
  };

  const handleAccessibilityAction = ({
    nativeEvent,
  }) => {
    switch (nativeEvent.actionName) {
      case "increment":
        moveAccessibilitySelection(1);
        break;

      case "decrement":
        moveAccessibilitySelection(-1);
        break;

      default:
        break;
    }
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        text: String(accessibleValue),
      }}
      accessibilityActions={[
        {
          name: "increment",
          label: "Aumentar",
        },
        {
          name: "decrement",
          label: "Disminuir",
        },
      ]}
      onAccessibilityAction={
        handleAccessibilityAction
      }
      style={{
        width: 100,
        height: WHEEL_HEIGHT,
      }}
    >
      <AnimatedFlatList
        ref={listRef}
        data={data}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        keyExtractor={(_, index) =>
          String(index)
        }
        showsVerticalScrollIndicator={false}

        /*
         * Sin snapToInterval.
         *
         * Dejamos que la lista tenga física normal y
         * alineamos manualmente una sola vez al terminar.
         */
        decelerationRate="fast"

        bounces={false}
        nestedScrollEnabled
        scrollEventThrottle={16}
        initialScrollIndex={initialIndex}
        initialNumToRender={9}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={false}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{
          paddingVertical: CENTER_PADDING,
        }}
        onLayout={() => {
          listRef.current?.scrollToOffset({
            offset: offsetRef.current,
            animated: false,
          });
        }}
        renderItem={({ item, index }) => (
          <WheelItem
            value={item}
            index={index}
            scrollY={scrollY}
            textColor={textColor}
          />
        )}
        onScroll={onScroll}
        onTouchStart={() => {
          clearTimers();

          touchingRef.current = true;

          /*
           * Si el usuario agarra la rueda durante
           * un snap nuestro, la interacción manual
           * vuelve a tener prioridad.
           */
          snappingRef.current = false;

          setMoving(true);
        }}
        onTouchEnd={() => {
          touchingRef.current = false;

          /*
           * No hacemos snap inmediatamente.
           * onScrollEndDrag decide qué viene después.
           */
        }}
        onTouchCancel={() => {
          touchingRef.current = false;
          draggingRef.current = false;

          scheduleSnapAfterDrag();
        }}
        onScrollBeginDrag={() => {
          clearTimers();

          draggingRef.current = true;
          momentumRef.current = false;
          snappingRef.current = false;

          setMoving(true);
        }}
        onScrollEndDrag={(event) => {
          draggingRef.current = false;

          offsetRef.current =
            event.nativeEvent.contentOffset.y;

          scheduleSnapAfterDrag();
        }}
        onMomentumScrollBegin={() => {
          clearDragTimer();

          momentumRef.current = true;

          setMoving(true);
        }}
        onMomentumScrollEnd={(event) => {
          momentumRef.current = false;

          offsetRef.current =
            event.nativeEvent.contentOffset.y;

          snapToNearest();
        }}
      />
    </View>
  );
}
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  FlatList,
  StyleSheet,
} from "react-native";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

const HOUR_WIDTH = 68;
const MINUTE_WIDTH = 68;

// No necesitamos 100 repeticiones.
// Si nos acercamos a un extremo, reciclamos la posición.
const LOOP_COUNT = 21;
const MIDDLE_BLOCK = Math.floor(LOOP_COUNT / 2);

const AnimatedFlatList =
  Animated.createAnimatedComponent(FlatList);

const BASE_HOURS = Array.from(
  { length: 12 },
  (_, index) => String(index + 1)
);

const BASE_MINUTES = Array.from(
  { length: 60 },
  (_, index) => String(index).padStart(2, "0")
);

function createLoopData(baseData) {
  return Array.from(
    { length: baseData.length * LOOP_COUNT },
    (_, index) => baseData[index % baseData.length]
  );
}

function getMiddleIndex(baseData, value) {
  const valueIndex = Math.max(
    0,
    baseData.indexOf(value)
  );

  return (
    MIDDLE_BLOCK * baseData.length +
    valueIndex
  );
}

function to12Hour(hour24) {
  return String(hour24 % 12 || 12);
}

function to24Hour(hour12, period) {
  const hour = Number(hour12);

  if (period === "AM") {
    return hour === 12 ? 0 : hour;
  }

  return hour === 12 ? 12 : hour + 12;
}

/*
 * Cada item se anima según su distancia física
 * respecto al centro de la rueda.
 *
 * Esto NO usa setState durante el scroll.
 */
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

export default function HourModal({
  visible,
  themeName,
  mode,
  selectedTime,
  setSelectedTime,
  closeModal,
}) {
  const styles = createStyles(themeName, mode);
  const theme = themes[themeName][mode];

  const hours = useMemo(
    () => createLoopData(BASE_HOURS),
    []
  );

  const minutes = useMemo(
    () => createLoopData(BASE_MINUTES),
    []
  );

  const initialHour = selectedTime
    ? to12Hour(selectedTime.getHours())
    : "12";

  const initialMinute = selectedTime
    ? String(selectedTime.getMinutes()).padStart(2, "0")
    : "00";

  const initialPeriod = selectedTime
    ? selectedTime.getHours() >= 12
      ? "PM"
      : "AM"
    : "PM";

  /*
   * Hora y minuto viven en refs.
   *
   * No necesitamos provocar un render cada vez
   * que el usuario pasa de 32 → 33 → 34...
   */
  const hourRef = useRef(initialHour);
  const minuteRef = useRef(initialMinute);

  // AM / PM sí es UI interactiva normal.
  const [period, setPeriod] = useState(initialPeriod);

  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  /*
   * Estos Animated.Value reciben directamente
   * la posición del scroll.
   */
  const hourScrollY = useRef(
    new Animated.Value(0)
  ).current;

  const minuteScrollY = useRef(
    new Animated.Value(0)
  ).current;

  // Animación del modal
  const opacityAnim = useRef(
    new Animated.Value(0)
  ).current;

  const slideAnim = useRef(
    new Animated.Value(20)
  ).current;

  const scaleAnim = useRef(
    new Animated.Value(0.95)
  ).current;

  useEffect(() => {
    if (!visible) return;

    hourRef.current = initialHour;
    minuteRef.current = initialMinute;
    setPeriod(initialPeriod);
  }, [
    visible,
    initialHour,
    initialMinute,
    initialPeriod,
  ]);

  const positionWheels = () => {
    const hourIndex = getMiddleIndex(
      BASE_HOURS,
      initialHour
    );

    const minuteIndex = getMiddleIndex(
      BASE_MINUTES,
      initialMinute
    );

    hourListRef.current?.scrollToOffset({
      offset: hourIndex * ITEM_HEIGHT,
      animated: false,
    });

    minuteListRef.current?.scrollToOffset({
      offset: minuteIndex * ITEM_HEIGHT,
      animated: false,
    });
  };

  const handleShow = () => {
    positionWheels();

    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    scaleAnim.setValue(0.95);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(closeModal);
  };

  const applyTime = () => {
    const date = selectedTime
      ? new Date(selectedTime)
      : new Date();

    date.setHours(
      to24Hour(
        hourRef.current,
        period
      )
    );

    date.setMinutes(
      Number(minuteRef.current)
    );

    date.setSeconds(0);
    date.setMilliseconds(0);

    setSelectedTime(date);
    animateClose();
  };

  const clearTime = () => {
    setSelectedTime(null);
    animateClose();
  };

  const getIndexFromOffset = (
    offsetY,
    dataLength
  ) => {
    const index = Math.round(
      offsetY / ITEM_HEIGHT
    );

    return Math.min(
      Math.max(index, 0),
      dataLength - 1
    );
  };

  /*
   * Actualizamos únicamente la ref del valor.
   *
   * Esto puede ejecutarse durante el scroll
   * sin provocar renders.
   */
  const updateValueFromOffset = (
    offsetY,
    baseData,
    loopData,
    valueRef
  ) => {
    const index = getIndexFromOffset(
      offsetY,
      loopData.length
    );

    const baseIndex =
      index % baseData.length;

    valueRef.current =
      baseData[baseIndex];

    return index;
  };

  /*
   * Cuando termina el movimiento:
   *
   * 1. determinamos el elemento más cercano;
   * 2. hacemos snap exacto;
   * 3. reciclamos al centro si estamos
   *    cerca de un extremo.
   */
  const settleWheel = (
    event,
    baseData,
    loopData,
    valueRef,
    listRef
  ) => {
    const offsetY =
      event.nativeEvent.contentOffset.y;

    const index = updateValueFromOffset(
      offsetY,
      baseData,
      loopData,
      valueRef
    );

    const baseIndex =
      index % baseData.length;

    const edgeThreshold =
      baseData.length * 3;

    const nearStart =
      index < edgeThreshold;

    const nearEnd =
      index >
      loopData.length - edgeThreshold;

    if (nearStart || nearEnd) {
      const middleIndex =
        MIDDLE_BLOCK * baseData.length +
        baseIndex;

      listRef.current?.scrollToOffset({
        offset:
          middleIndex * ITEM_HEIGHT,
        animated: false,
      });

      return;
    }

    /*
     * Corrige cualquier pequeño desfase
     * producido por un fling fuerte.
     */
    listRef.current?.scrollToOffset({
      offset: index * ITEM_HEIGHT,
      animated: true,
    });
  };

  const createWheelScrollHandler = (
    scrollY,
    baseData,
    loopData,
    valueRef
  ) =>
    Animated.event(
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

        /*
         * La animación ocurre nativamente.
         *
         * El listener JS solo cambia una ref,
         * NO hace setState.
         */
        listener: (event) => {
          updateValueFromOffset(
            event.nativeEvent.contentOffset.y,
            baseData,
            loopData,
            valueRef
          );
        },
      }
    );

  const makeWheelProps = ({
    baseData,
    loopData,
    scrollY,
    valueRef,
    listRef,
    width,
    keyPrefix,
  }) => ({
    data: loopData,

    keyExtractor: (_, index) =>
      `${keyPrefix}-${index}`,

    showsVerticalScrollIndicator: false,

    snapToInterval: ITEM_HEIGHT,
    decelerationRate: "fast",

    bounces: false,

    nestedScrollEnabled: true,

    scrollEventThrottle: 16,

    initialNumToRender: 7,
    maxToRenderPerBatch: 7,
    windowSize: 5,

    getItemLayout: (_, index) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),

    contentContainerStyle: {
      paddingVertical: CENTER_PADDING,
    },

    style: {
      width,
      height: WHEEL_HEIGHT,
    },

    renderItem: ({
      item,
      index,
    }) => (
      <WheelItem
        value={item}
        index={index}
        scrollY={scrollY}
        textColor={theme.text}
      />
    ),

    onScroll: createWheelScrollHandler(
      scrollY,
      baseData,
      loopData,
      valueRef
    ),

    onMomentumScrollEnd: (event) => {
      settleWheel(
        event,
        baseData,
        loopData,
        valueRef,
        listRef
      );
    },

    onScrollEndDrag: (event) => {
      const velocity =
        event.nativeEvent.velocity?.y ?? 0;

      /*
       * Un movimiento pequeño puede no generar
       * momentum; en ese caso hacemos el snap acá.
       */
      if (Math.abs(velocity) < 0.1) {
        settleWheel(
          event,
          baseData,
          loopData,
          valueRef,
          listRef
        );
      }
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={handleShow}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback
          onPress={animateClose}
        >
          <View
            style={
              StyleSheet.absoluteFillObject
            }
          />
        </TouchableWithoutFeedback>

        {/* Caja */}
        <Animated.View
          style={[
            styles.modalBox,
            {
              transform: [
                {
                  translateY:
                    slideAnim,
                },
                {
                  scale:
                    scaleAnim,
                },
              ],

              width: "85%",
              borderRadius: 14,
              paddingVertical: 18,
              paddingHorizontal: 18,
            },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              {
                marginBottom: 10,
              },
            ]}
          >
            Hora
          </Text>

          {/* Picker */}
          <View
            style={{
              backgroundColor:
                theme.card,

              borderWidth: 1,
              borderColor:
                theme.border,

              borderRadius: 12,

              paddingVertical: 10,
              paddingHorizontal: 32,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  position: "relative",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* Fondo de la fila seleccionada */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",

                    top:
                      CENTER_PADDING,

                    left: 16,
                    right: 10,

                    height: ITEM_HEIGHT,

                    borderRadius: 10,

                    backgroundColor:
                      theme.primary,

                    opacity: 0.08,
                  }}
                />

                {/* Hora */}
                <AnimatedFlatList
                  ref={hourListRef}
                  {...makeWheelProps({
                    baseData:
                      BASE_HOURS,

                    loopData:
                      hours,

                    scrollY:
                      hourScrollY,

                    valueRef:
                      hourRef,

                    listRef:
                      hourListRef,

                    width:
                      HOUR_WIDTH,

                    keyPrefix:
                      "hour",
                  })}
                />

                <Text
                  pointerEvents="none"
                  style={{
                    fontSize: 22,
                    fontWeight: "600",
                    marginHorizontal: 4,
                    color: theme.text,
                  }}
                >
                  :
                </Text>

                {/* Minuto */}
                <AnimatedFlatList
                  ref={minuteListRef}
                  {...makeWheelProps({
                    baseData:
                      BASE_MINUTES,

                    loopData:
                      minutes,

                    scrollY:
                      minuteScrollY,

                    valueRef:
                      minuteRef,

                    listRef:
                      minuteListRef,

                    width:
                      MINUTE_WIDTH,

                    keyPrefix:
                      "minute",
                  })}
                />
              </View>

              {/* AM / PM */}
              <View
                style={{
                  marginHorizontal: 6,

                  borderRadius: 9,

                  borderWidth: 1,
                  borderColor:
                    theme.border,

                  overflow: "hidden",
                }}
              >
                {["AM", "PM"].map(
                  (value) => {
                    const active =
                      period === value;

                    return (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.75}
                        onPress={() =>
                          setPeriod(value)
                        }
                        style={{
                          width: 44,
                          height: 38,

                          justifyContent:
                            "center",

                          alignItems:
                            "center",

                          backgroundColor:
                            active
                              ? theme.primary
                              : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,

                            fontWeight:
                              active
                                ? "700"
                                : "500",

                            color:
                              active
                                ? theme.card
                                : theme.inactiveCategoryText,
                          }}
                        >
                          {value}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>
          </View>

          {/* Sin hora */}
          <TouchableOpacity
            onPress={clearTime}
            style={{
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color:
                  theme.inactiveCategoryText,

                textAlign: "center",
              }}
            >
              En cualquier momento
            </Text>
          </TouchableOpacity>

          {/* Aplicar */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                marginTop: 16,
              },
            ]}
            onPress={applyTime}
          >
            <Text
              style={
                styles.saveButtonText
              }
            >
              Aplicar
            </Text>
          </TouchableOpacity>

          {/* Cancelar */}
          <TouchableOpacity
            onPress={animateClose}
            style={{
              marginTop: 10,
            }}
          >
            <Text
              style={{
                color:
                  theme.inactiveCategoryText,

                textAlign: "center",
              }}
            >
              Cancelar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
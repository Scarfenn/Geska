import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  FlatList,
} from "react-native";
import createStyles from "../../styles/styles";
import { themes } from "../../styles/themes";

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

function pad2(n) {
  return n.toString().padStart(2, "0");
}

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
    () => Array.from({ length: 24 }, (_, i) => pad2(i)),
    []
  );
  const minutes = useMemo(
    () => ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"],
    []
  );

  const initialHour = selectedTime ? pad2(selectedTime.getHours()) : "12";
  const roundedMin = selectedTime
    ? pad2(Math.round(selectedTime.getMinutes() / 5) * 5 % 60)
    : "00";
  const initialMinute = minutes.includes(roundedMin) ? roundedMin : "00";

  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);

  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  // Animaciones
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (!visible) return;

    // sync state
    setHour(initialHour);
    setMinute(initialMinute);

    // anim
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

    const hIndex = Math.max(0, hours.indexOf(initialHour));
    const mIndex = Math.max(0, minutes.indexOf(initialMinute));

    setTimeout(() => {
      hourListRef.current?.scrollToOffset({
        offset: hIndex * ITEM_HEIGHT,
        animated: false,
      });
      minuteListRef.current?.scrollToOffset({
        offset: mIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 0);
  }, [visible]);

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
    const date = new Date();
    date.setHours(parseInt(hour, 10));
    date.setMinutes(parseInt(minute, 10));
    setSelectedTime(date);
    animateClose();
  };

  const clearTime = () => {
    setSelectedTime(null);
    animateClose();
  };

    const renderWheelItem = (value, active) => (
    <View
        style={{
        height: ITEM_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
        }}
    >
        <Text
        style={{
            fontSize: active ? 18 : 15,
            fontWeight: active ? "700" : "400",
            color: active ? theme.primary : theme.inactiveCategoryText,
            opacity: active ? 1 : 0.6,
        }}
        >
        {value}
        </Text>
    </View>
    );


const makeWheelProps = (data, onSelect, isHourList) => ({
  data,
  keyExtractor: (item) => item,
  showsVerticalScrollIndicator: false,
  snapToInterval: ITEM_HEIGHT,
  snapToAlignment: "start",
  decelerationRate: "fast", // 🔥 IMPORTANTE
  bounces: false,
  scrollEnabled: true,
  scrollEventThrottle: 16,

  getItemLayout: (_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }),

  contentContainerStyle: { paddingVertical: CENTER_PADDING },
  style: { height: WHEEL_HEIGHT, width: 88 },

  renderItem: ({ item }) =>
    renderWheelItem(item, item === (isHourList ? hour : minute)),

  onScrollEndDrag: (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const idx = Math.round(offsetY / ITEM_HEIGHT);
    const clamped = Math.min(Math.max(idx, 0), data.length - 1);

    onSelect(data[clamped]);

    e.target?.scrollToOffset?.({
      offset: clamped * ITEM_HEIGHT,
      animated: true,
    });
  },
});



  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={animateClose}>
        <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalBox,
                {
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                  width: "85%",
                  borderRadius: 14,
                  paddingVertical: 18,
                  paddingHorizontal: 18,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { marginBottom: 10 }]}>
                Hora
              </Text>

              {/* Wheel container */}
              <View
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                {/* Center selection highlight */}
                <View
                  style={{
                    position: "absolute",
                    top: 10 + CENTER_PADDING,
                    left: 12,
                    right: 12,
                    height: ITEM_HEIGHT,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: theme.primary,
                    opacity: 0.65,
                  }}
                />                
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FlatList
                    ref={hourListRef}
                    {...makeWheelProps(hours, setHour, true)}
                    />

                  <Text style={{ fontSize: 22, marginHorizontal: 10, color: theme.text }}>
                    :
                  </Text>

                    <FlatList
                    ref={minuteListRef}
                    {...makeWheelProps(minutes, setMinute, false)}
                    />
                </View>
              </View>

              <TouchableOpacity onPress={clearTime} style={{ marginTop: 12 }}>
                <Text style={{ color: theme.inactiveCategoryText, textAlign: "center" }}>
                  En cualquier momento
                </Text>
              </TouchableOpacity>              

              <TouchableOpacity style={[styles.saveButton, { marginTop: 16 }]} onPress={applyTime}>
                <Text style={styles.saveButtonText}>Aplicar</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={animateClose} style={{ marginTop: 10 }}>
                <Text style={{ color: theme.inactiveCategoryText, textAlign: "center" }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

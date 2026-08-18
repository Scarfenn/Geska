import { useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import createStyles from "@/styles/styles";
import { themes } from "@/styles/themes";

import {
  MINUTE_MS,
  HOUR_MS,
  isSameDay,
  startOfDay,
  endOfDay,
  combineDateAndTime,
  getAllDayReminderDate,
  getPersistentDatesForDay,
  remindersEqual,
} from "@/features/tasks/services/reminderModel";

const TIMED_OPTIONS = [
  {
    label: "Sin recordatorio",
    reminder: null,
  },
  {
    label: "A la hora exacta",
    reminder: {
      type: "relative",
      value: 0,
      unit: "minutes",
    },
  },
  {
    label: "5 min antes",
    reminder: {
      type: "relative",
      value: 5,
      unit: "minutes",
    },
  },
  {
    label: "10 min antes",
    reminder: {
      type: "relative",
      value: 10,
      unit: "minutes",
    },
  },
  {
    label: "15 min antes",
    reminder: {
      type: "relative",
      value: 15,
      unit: "minutes",
    },
  },
  {
    label: "30 min antes",
    reminder: {
      type: "relative",
      value: 30,
      unit: "minutes",
    },
  },
  {
    label: "1 hora antes",
    reminder: {
      type: "relative",
      value: 60,
      unit: "minutes",
    },
  },
];

const TODAY_OPTIONS = [
  {
    label: "Sin recordatorio",
    reminder: null,
  },
  {
    label: "En 1 hora",
    afterHours: 1,
  },
  {
    label: "En 2 horas",
    afterHours: 2,
  },
  {
    label: "En 4 horas",
    afterHours: 4,
  },
  {
    label: "En 6 horas",
    afterHours: 6,
  },
];

const ALL_DAY_OPTIONS = [
  {
    label: "Sin recordatorio",
    reminder: null,
  },
  {
    label: "El mismo día",
    reminder: {
      type: "all_day",
      value: 0,
      unit: "days",
    },
  },
  {
    label: "1 día antes",
    reminder: {
      type: "all_day",
      value: 1,
      unit: "days",
    },
  },
  {
    label: "2 días antes",
    reminder: {
      type: "all_day",
      value: 2,
      unit: "days",
    },
  },
  {
    label: "1 semana antes",
    reminder: {
      type: "all_day",
      value: 7,
      unit: "days",
    },
  },
];

const PERSISTENT_OPTION = {
  label: "Recordarme durante el día",
  reminder: {
    type: "persistent",
    value: 4,
    unit: "hours",
  },
};

function optionReminder(option) {
  if (option.afterHours) {
    return {
      type: "after",
      value: option.afterHours,
      unit: "hours",
      at:
        Date.now() +
        option.afterHours * HOUR_MS,
    };
  }

  return option.reminder;
}

function isOptionActive(
  currentReminder,
  option
) {
  if (option.afterHours) {
    return (
      currentReminder?.type === "after" &&
      currentReminder?.value ===
        option.afterHours &&
      currentReminder?.unit === "hours"
    );
  }

  return remindersEqual(
    currentReminder,
    option.reminder
  );
}

function getAvailableOptions({
  selectedDate,
  selectedTime,
  repeatMode,
}) {
  const now = new Date();

  if (!selectedDate) {
    return [
      {
        label: "Sin recordatorio",
        reminder: null,
      },
    ];
  }

  /*
   * TAREA CON HORA
   *
   * Solo mostramos recordatorios cuyo instante
   * todavía está en el futuro.
   */
  if (selectedTime) {
    const taskDateTime =
      combineDateAndTime(
        selectedDate,
        selectedTime
      );

    return TIMED_OPTIONS.filter((option) => {
      if (!option.reminder) {
        return true;
      }

      const reminderDate =
        new Date(
          taskDateTime.getTime() -
            option.reminder.value *
              MINUTE_MS
        );

      return reminderDate > now;
    });
  }

  const taskDay =
    startOfDay(selectedDate);

  const today =
    startOfDay(now);

  if (taskDay < today) {
    return [
      {
        label: "Sin recordatorio",
        reminder: null,
      },
    ];
  }

  const isRepeating =
    repeatMode &&
    repeatMode !== "none";

  /*
   * TAREA DE HOY SIN HORA
   *
   * Para una tarea simple usamos "En X horas".
   * También permitimos el modo persistente si
   * todavía queda al menos una ventana hoy.
   *
   * Para tareas repetitivas no usamos "En X horas":
   * esa semántica no describe las próximas ocurrencias.
   */
  if (isSameDay(selectedDate, now)) {
    if (isRepeating) {
      return ALL_DAY_OPTIONS.filter(
        (option) => {
          if (!option.reminder) {
            return true;
          }

          const reminderDate =
            getAllDayReminderDate(
              selectedDate,
              option.reminder.value
            );

          return reminderDate > now;
        }
      );
    }

    const todayEnd =
      endOfDay(now);

    const options =
      TODAY_OPTIONS.filter((option) => {
        if (!option.afterHours) {
          return true;
        }

        const reminderDate =
          new Date(
            now.getTime() +
              option.afterHours *
                HOUR_MS
          );

        return reminderDate <= todayEnd;
      });

    if (
      getPersistentDatesForDay(
        selectedDate,
        now
      ).length > 0
    ) {
      options.push(PERSISTENT_OPTION);
    }

    return options;
  }

  /*
   * TAREA FUTURA SIN HORA
   *
   * Los avisos únicos se filtran según la fecha real
   * en la que sonarían. Por ejemplo, mañana no puede
   * ofrecer "1 semana antes".
   */
  const options =
    ALL_DAY_OPTIONS.filter((option) => {
      if (!option.reminder) {
        return true;
      }

      const reminderDate =
        getAllDayReminderDate(
          selectedDate,
          option.reminder.value
        );

      return reminderDate > now;
    });

  /*
   * El modo insistente se limita, por ahora, a tareas
   * simples. Así podemos cancelar todos sus avisos al
   * completar la tarea sin interferir con ocurrencias
   * futuras de una repetición.
   */
  if (!isRepeating) {
    options.push(PERSISTENT_OPTION);
  }

  return options;
}

function getSubtitle({
  selectedDate,
  selectedTime,
  repeatMode,
}) {
  if (selectedTime) {
    return "Avísame antes de la hora de la tarea";
  }

  if (
    selectedDate &&
    isSameDay(selectedDate, new Date()) &&
    (!repeatMode ||
      repeatMode === "none")
  ) {
    return "Avísame más tarde hoy";
  }

  return "Avísame respecto al día de la tarea";
}

export default function ReminderModal({
  visible,
  themeName,
  mode,

  selectedDate,
  selectedTime,
  repeatMode,

  reminder,
  setReminder,

  closeModal,
}) {
  const styles =
    createStyles(themeName, mode);

  const theme =
    themes[themeName][mode];

  const opacityAnim = useRef(
    new Animated.Value(0)
  ).current;

  const slideAnim = useRef(
    new Animated.Value(20)
  ).current;

  const scaleAnim = useRef(
    new Animated.Value(0.95)
  ).current;

  const options =
    getAvailableOptions({
      selectedDate,
      selectedTime,
      repeatMode,
    });

  const animateOpen = () => {
    opacityAnim.setValue(0);
    slideAnim.setValue(20);
    scaleAnim.setValue(0.95);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        easing:
          Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing:
          Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        easing:
          Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 160,
        easing:
          Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 160,
        easing:
          Easing.in(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 160,
        easing:
          Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(closeModal);
  };

  const selectOption = (option) => {
    setReminder(
      optionReminder(option)
    );

    animateClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={animateOpen}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableWithoutFeedback
          onPress={animateClose}
        >
          <View
            style={
              StyleSheet.absoluteFillObject
            }
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.modalBox,
            {
              width: "85%",
              borderRadius: 14,

              paddingVertical: 18,
              paddingHorizontal: 18,

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
            },
          ]}
        >
          <Text
            style={[
              styles.modalTitle,
              {
                marginBottom: 6,
              },
            ]}
          >
            Recordatorio
          </Text>

          <Text
            style={{
              color:
                theme.inactiveCategoryText,

              fontSize: 13,
              marginBottom: 10,
            }}
          >
            {getSubtitle({
              selectedDate,
              selectedTime,
              repeatMode,
            })}
          </Text>

          {options.map((option) => {
            const active =
              isOptionActive(
                reminder,
                option
              );

            const key =
              option.afterHours
                ? `after-${option.afterHours}`
                : option.reminder
                ? `${option.reminder.type}-${option.reminder.value}`
                : "none";

            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.7}
                style={[
                  styles.optionRow,
                  {
                    justifyContent:
                      "space-between",
                  },
                ]}
                onPress={() =>
                  selectOption(option)
                }
              >
                <View
                  style={{
                    flex: 1,
                    paddingRight: 8,
                  }}
                >
                  <Text
                    style={[
                      styles.optionLabel,

                      active && {
                        color:
                          theme.primary,

                        fontWeight:
                          "600",
                      },
                    ]}
                  >
                    {option.label}
                  </Text>

                  {option.reminder?.type ===
                    "persistent" && (
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        color:
                          theme.inactiveCategoryText,
                      }}
                    >
                      09:00 · 13:00 · 17:00 · 21:00
                    </Text>
                  )}
                </View>

                {active && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={
                      theme.primary
                    }
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

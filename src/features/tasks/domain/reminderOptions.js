import {
  PERSISTENT_REMINDER_HOURS,
  MINUTE_MS,
  HOUR_MS,
  isSameDay,
  startOfDay,
  endOfDay,
  combineDateAndTime,
  getAllDayReminderDate,
  getPersistentDatesForDay,
  remindersEqual,
} from "../services/reminderModel";

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

const NO_REMINDER_OPTION = {
  label: "Sin recordatorio",
  reminder: null,
};

export function optionReminder(option, now) {
  if (option.afterHours) {
    return {
      type: "after",
      value: option.afterHours,
      unit: "hours",
      at:
        now.getTime() +
        option.afterHours * HOUR_MS,
    };
  }

  return option.reminder ? { ...option.reminder } : null;
}

export function isOptionActive(
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

export function getAvailableOptions({
  selectedDate,
  selectedTime,
  repeatMode,
}, now) {


  const isRepeating =
    repeatMode &&
    repeatMode !== "none";
    

  if (!selectedDate) {
    return [NO_REMINDER_OPTION];
  }

  if (selectedTime) {
    if (isRepeating) {
      return TIMED_OPTIONS;
    }

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

  if (
    !isRepeating &&
    taskDay < today
  ) {
    return [NO_REMINDER_OPTION];
  }

  if (isRepeating) {
    return [
      NO_REMINDER_OPTION,
      PERSISTENT_OPTION,
    ];
  }

  if (isSameDay(selectedDate, now)) {
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

  options.push(PERSISTENT_OPTION);

  return options;
}

export function getSubtitle({
  selectedDate,
  selectedTime,
  repeatMode,
}, now) {
  if (!selectedDate) return "Selecciona una fecha para configurar un recordatorio";
  if (selectedTime) {
    return "Avísame antes de la hora de la tarea";
  }

  if (
    selectedDate &&
    isSameDay(selectedDate, now) &&
    (!repeatMode ||
      repeatMode === "none")
  ) {
    return "Avísame más tarde hoy";
  }

  return "Avísame respecto al día de la tarea";
}

export function optionKey(option) {
  return option.afterHours ? `after-${option.afterHours}`
    : option.reminder ? `${option.reminder.type}-${option.reminder.value}-${option.reminder.unit}` : "none";
}

// Resolve against the current catalog, not an option retained from an old render.
export function resolveReminderOption(context, key, now) {
  const option = getAvailableOptions(context, now).find(item => optionKey(item) === key);
  return option ? { valid: true, reminder: optionReminder(option, now) } : { valid: false };
}

export function persistentDescription({ selectedDate, repeatMode }, now) {
  const repeating = repeatMode && repeatMode !== "none";
  if (!repeating && selectedDate && isSameDay(selectedDate, now)) {
    const hours = getPersistentDatesForDay(selectedDate, now)
      .map(date => `${String(date.getHours()).padStart(2, "0")}:00`);
    return hours.length ? `Hoy quedan: ${hours.join(" · ")}` : "No quedan horarios hoy";
  }
  return `Horarios habituales: ${PERSISTENT_REMINDER_HOURS.map(hour => `${String(hour).padStart(2, "0")}:00`).join(" · ")}`;
}

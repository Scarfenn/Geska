// Modelo compartido de recordatorios de tareas.
//
// El estado/UI trabaja con objetos:
// { type, value, unit, at? }
//
// Tipos:
// - relative: relativo a la hora de la tarea.
// - after: X horas desde el momento en que se eligió.
// - all_day: relativo al día de una tarea sin hora.
// - persistent: varios avisos durante el día hasta completar.

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export const ALL_DAY_REMINDER_HOUR = 9;
export const PERSISTENT_REMINDER_HOURS = [9, 13, 17, 21];

export function isSameDay(a, b) {
  if (!a || !b) return false;

  const dateA = new Date(a);
  const dateB = new Date(b);

  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function combineDateAndTime(date, time) {
  if (!date || !time) return null;

  const result = new Date(date);

  result.setHours(
    time.getHours(),
    time.getMinutes(),
    0,
    0
  );

  return result;
}

export function getAllDayReminderDate(
  selectedDate,
  daysBefore
) {
  if (!selectedDate) return null;

  const reminderDate = new Date(selectedDate);

  reminderDate.setHours(
    ALL_DAY_REMINDER_HOUR,
    0,
    0,
    0
  );

  reminderDate.setDate(
    reminderDate.getDate() - daysBefore
  );

  return reminderDate;
}

export function getPersistentDatesForDay(
  selectedDate,
  from = new Date()
) {
  if (!selectedDate) return [];

  return PERSISTENT_REMINDER_HOURS
    .map((hour) => {
      const date = new Date(selectedDate);
      date.setHours(hour, 0, 0, 0);
      return date;
    })
    .filter((date) => date > from);
}

export function reminderFromTask(task) {
  if (!task) return null;

  if (task.reminder_type) {
    return {
      type: task.reminder_type,
      value:
        task.reminder_value ?? null,
      unit:
        task.reminder_unit ?? null,
      at:
        task.reminder_at ?? null,
    };
  }

  // Compatibilidad con Geska <= 0.8.x:
  // reminder_minutes solo tenía sentido para tareas con hora.
  if (
    task.time &&
    task.reminder_minutes != null
  ) {
    return {
      type: "relative",
      value: Number(task.reminder_minutes),
      unit: "minutes",
      at: null,
    };
  }

  return null;
}

export function applyReminderToTask(
  task,
  reminder
) {
  const normalized = reminder || null;

  return {
    ...task,

    reminder_type:
      normalized?.type ?? null,

    reminder_value:
      normalized?.value ?? null,

    reminder_unit:
      normalized?.unit ?? null,

    reminder_at:
      normalized?.at ?? null,

    // Se conserva durante la transición para no romper
    // datos/código legacy. Solo representa relative/minutes.
    reminder_minutes:
      normalized?.type === "relative" &&
      normalized?.unit === "minutes"
        ? normalized.value
        : null,
  };
}

export function remindersEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    a.type === b.type &&
    (a.value ?? null) === (b.value ?? null) &&
    (a.unit ?? null) === (b.unit ?? null)
  );
}

export function formatReminder(
  reminder,
  selectedDate,
  selectedTime
) {
  if (!reminder) {
    return "Sin recordatorio";
  }

  if (reminder.type === "persistent") {
    return "Durante el día";
  }

  if (reminder.type === "after") {
    return reminder.value === 1
      ? "En 1 hora"
      : `En ${reminder.value} horas`;
  }

  if (reminder.type === "relative") {
    if (reminder.value === 0) {
      return "A la hora exacta";
    }

    if (
      reminder.unit === "minutes" &&
      reminder.value === 60
    ) {
      return "1 hora antes";
    }

    if (reminder.unit === "hours") {
      return reminder.value === 1
        ? "1 hora antes"
        : `${reminder.value} horas antes`;
    }

    return `${reminder.value} min antes`;
  }

  if (reminder.type === "all_day") {
    if (reminder.value === 0) {
      return "El mismo día";
    }

    if (reminder.value === 1) {
      return "1 día antes";
    }

    if (reminder.value === 7) {
      return "1 semana antes";
    }

    return `${reminder.value} días antes`;
  }

  return "Sin recordatorio";
}

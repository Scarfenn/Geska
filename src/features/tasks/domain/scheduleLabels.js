const WEEK_DAY_LABELS = {
  L: "Lun", M: "Mar", X: "Mié", J: "Jue", V: "Vie", S: "Sáb", D: "Dom",
};

export function formatHumanDate(date, now = new Date()) {
  if (!date) return "Nunca";

  const today = new Date(now);
  const d = new Date(date);

  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diff = Math.round((d - today) / 86400000);

  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";

  const names = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  if (diff > 1 && diff <= 6) {
    return `Este ${names[d.getDay()]}`;
  }

  if (diff >= 7 && diff <= 13) {
    return `Próx. ${names[d.getDay()]}`;
  }

  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

export function formatHumanTime(date) {
  if (!date) return "En cualquier momento";

  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");

  return `${h}:${m}`;
}

export function formatRepeatLabel({
  selectedDate,
  repeatMode,
  repeatDays = [],
  repeatInterval = 1,
}) {
  if (repeatMode === "none") {
    return "Sin repetir";
  }

  if (repeatMode === "daily") {
    return repeatInterval === 1
      ? "Diario"
      : `Cada ${repeatInterval} días`;
  }

  if (repeatMode === "weekly") {
    const selectedDays = Object.keys(WEEK_DAY_LABELS).filter((day) =>
      repeatDays.includes(day)
    );
    const allDaysSelected = selectedDays.length === 7;
    let daysLabel = "";

    if (allDaysSelected) {
      return repeatInterval === 1
        ? "Diario"
        : `Cada ${repeatInterval} semanas · Todos los días`;
    }

    const intervalLabel = repeatInterval === 1
      ? "Semanal"
      : `Cada ${repeatInterval} semanas`;
    if (selectedDays.length < 5) {
      daysLabel = selectedDays.map((day) => WEEK_DAY_LABELS[day]).join(", ");
    } else {
      daysLabel = selectedDays.join(", ");
    }

    return daysLabel ? `${intervalLabel} · ${daysLabel}` : intervalLabel;
  }

  if (repeatMode === "monthly" && repeatInterval % 12 !== 0) {
    const sortedDays = [...repeatDays]
      .map(Number)
      .sort((a, b) => a - b);

    const allDaysSelected = 
      repeatDays.length === 31;

    if (allDaysSelected) {
      return repeatInterval === 1
        ? "Diario"
        : `Cada ${repeatInterval} meses · Todos los días`;
    }

    const intervalLabel =
      repeatInterval === 1
        ? "Mensual"
        : `Cada ${repeatInterval} meses`;

    let daysLabel = null;

    if (sortedDays.length === 1) {
      daysLabel = `Día ${sortedDays[0]}`;
    } else if (sortedDays.length > 0 && sortedDays.length <= 4) {
      daysLabel = `Días ${sortedDays.join(", ")}`;
    } else if (sortedDays.length > 4) {
      daysLabel = `${sortedDays.length} días del mes`;
    }

    return daysLabel
      ? `${intervalLabel} · ${daysLabel}`
      : intervalLabel;
  }
  if (repeatMode === "monthly" && repeatInterval % 12 === 0) {
    const years = repeatInterval / 12;

    const intervalLabel =
      years === 1
        ? "Anual"
        : `Cada ${years} años`;

    if (!selectedDate || !Number.isFinite(new Date(selectedDate).getTime())) return intervalLabel;
    const monthLabel = new Date(selectedDate).toLocaleDateString("es-CL", {
      month: "long",
    });

    const daysLabel =
      repeatDays.length === 1
        ? `${repeatDays[0]} de ${monthLabel}`
        : repeatDays.length > 1
          ? `${repeatDays.join(", ")} de ${monthLabel}`
          : null;

    return daysLabel ? `${intervalLabel} · ${daysLabel}` : intervalLabel;
  }

  return "Sin repetir";
}


import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { getAvailableOptions, getSubtitle, persistentDescription, resolveReminderOption } from "../domain/reminderOptions";

export default function useReminderOptions(context) {
  const [now, setNow] = useState(() => new Date());
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") refresh();
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  return {
    options: getAvailableOptions(context, now),
    subtitle: getSubtitle(context, now),
    persistentText: persistentDescription(context, now),
    notice,
    select: key => {
      const selectedAt = new Date();
      const result = resolveReminderOption(context, key, selectedAt);
      setNow(selectedAt);
      setNotice(result.valid ? null : "Esta opción ya no está disponible. Selecciona otro recordatorio.");
      return result;
    },
  };
}

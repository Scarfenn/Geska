import { useRef, useState } from "react";
import { buildSelectedTime, readHourDraft } from "@/features/tasks/domain/hourPickerModel";

// The modal mounts a fresh session on opening or an external selection change.
export default function useHourDraft(selectedTime) {
  const initial = useRef(readHourDraft(selectedTime)).current;
  const hourRef = useRef(initial.hour);
  const minuteRef = useRef(initial.minute);
  const [period, setPeriod] = useState(initial.period);
  const moving = useRef(new Set());
  const [isMoving, setIsMoving] = useState(false);
  const setMoving = (wheel, active) => {
    if (active) moving.current.add(wheel);
    else moving.current.delete(wheel);
    setIsMoving(moving.current.size > 0);
  };
  return {
    initial, hourRef, minuteRef, period, setPeriod, isMoving, setMoving,
    canApply: () => moving.current.size === 0,
    buildTime: () => buildSelectedTime(
      { hour: hourRef.current, minute: minuteRef.current, period },
      selectedTime instanceof Date && Number.isFinite(selectedTime.getTime()) ? selectedTime : new Date(),
    ),
  };
}

import { Easing } from "react-native";
import useModalAnimation from "@/hooks/useModalAnimation";

export default function useHourModalAnimation(closeModal) {
  return useModalAnimation(closeModal, { closeDuration: 180, scaleEasing: Easing.out(Easing.cubic) });
}

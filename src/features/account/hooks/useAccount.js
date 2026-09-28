import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as auth from "@/storage/supabase/auth";
import { createAccountController } from "@/features/account/services/accountController";

export default function useAccount(clearPasswords) {
  const active = useRef(false);
  const [state, setState] = useState({ status: "loading", busy: false, session: null });
  const controller = useRef(null);
  if (!controller.current) controller.current = createAccountController(auth, next => {
    if (active.current) setState(next);
  });
  useFocusEffect(useCallback(() => {
    active.current = true;
    setState(controller.current.getState());
    controller.current.load();
    return () => { active.current = false; controller.current.cancelDeletion(); clearPasswords(); };
  }, [clearPasswords]));
  return { ...state, controller: controller.current };
}

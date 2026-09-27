import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import * as backupService from "@/features/backup/services/backupService";
import * as restoreService from "@/features/backup/services/restoreService";
import { createBackupController } from "@/features/backup/services/backupController";

export default function useBackup() {
  const active = useRef(false);
  const [state, setState] = useState({ status: "loading", busy: false, remote: null });
  const controller = useRef(null);
  if (!controller.current) controller.current = createBackupController({ ...backupService, ...restoreService }, next => {
    if (active.current) setState(next);
  });
  useFocusEffect(useCallback(() => {
    active.current = true;
    let focused = true;
    setState({ ...controller.current.getState(), status: "loading" });
    controller.current.refresh(() => focused);
    return () => { focused = false; active.current = false; controller.current.cancelPreparation(); controller.current.cancelUpload(); };
  }, []));
  return { ...state, controller: controller.current };
}

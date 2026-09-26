import { nativeApplicationVersion } from "expo-application";
import appConfig from "../../../../app.json";

export const appVersion = nativeApplicationVersion || appConfig.expo.version;

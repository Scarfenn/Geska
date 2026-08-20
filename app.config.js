const IS_DEV =
  process.env.APP_VARIANT === "development";

export default ({ config }) => ({
  ...config,

  name: IS_DEV
    ? "Geska Dev"
    : "Geska",

  icon: IS_DEV
    ? "./assets/icondev.png"
    : "./assets/icon.png",

  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV
      ? "com.scarfenn.geska.dev"
      : "com.scarfenn.geska",
  },

  android: {
    ...config.android,
    package: IS_DEV
      ? "com.scarfenn.geska.dev"
      : "com.scarfenn.geska",
  },
});
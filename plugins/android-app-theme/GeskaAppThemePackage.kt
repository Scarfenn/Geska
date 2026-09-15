package __PACKAGE__

import android.app.UiModeManager
import android.content.Context
import android.os.Build
import androidx.appcompat.app.AppCompatDelegate
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.ViewManager

class GeskaAppThemePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(GeskaAppThemeModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

class GeskaAppThemeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "GeskaAppTheme"

  @ReactMethod
  fun setMode(mode: String, promise: Promise) {
    if (mode != "light" && mode != "dark") {
      promise.reject("INVALID_MODE", "Expected light or dark")
      return
    }
    UiThreadUtil.runOnUiThread {
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          // Android persists this per-app setting and uses it for the next starting window.
          val manager = reactApplicationContext.getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
          val target = if (mode == "dark") UiModeManager.MODE_NIGHT_YES else UiModeManager.MODE_NIGHT_NO
          manager.setApplicationNightMode(target)
        } else {
          // Older Android supports the running app's theme, not a guaranteed cold-start splash override.
          val target = if (mode == "dark") AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
          if (AppCompatDelegate.getDefaultNightMode() != target) AppCompatDelegate.setDefaultNightMode(target)
        }
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("APP_THEME_ERROR", "Could not set the Android app theme", error)
      }
    }
  }
}

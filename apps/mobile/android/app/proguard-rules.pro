# ==============================================================================
# QueueLess India - Android ProGuard / R8 Rules for Release AAB Optimization
# Target: Code shrinking, dead code elimination, and obfuscation (< 15 MB)
# ==============================================================================

# 1. Flutter Wrapper & Engine
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# 2. Hive Database & HiveAesCipher
-keepattributes *Annotation*
-keepclassmembers class * extends io.hive.** { *; }
-keep class io.hive.** { *; }

# 3. Flutter Secure Storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# 4. Background Service & DataSync Foreground Engine
-keep class id.flutter.flutter_background_service.** { *; }

# 5. Local Notifications & Full Screen Intent Calling
-keep class com.dexterous.flutterlocalnotifications.** { *; }
-keep class androidx.core.app.NotificationCompat** { *; }

# 6. Text-to-Speech (TTS) Engine
-keep class com.tundralabs.fluttertts.** { *; }

# 7. Kotlin Reflect & Coroutines
-dontwarn kotlin.**
-keep class kotlin.** { *; }
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# 8. WebSockets & Network Serialization
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Keep Line Numbers for Crashlytics / Sentry symbolication
-keepattributes SourceFile,LineNumberTable

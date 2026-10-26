# راهنمای پیکربندی WebView اندروید برای Google OAuth

این راهنما پیکربندی کامل Android WebView را برای اجرای برنامه‌ی وب
«حساب صراف» و ورود با گوگل **داخل همان WebView** (بدون باز شدن مرورگر خارجی)
پوشش می‌دهد.

> **قانون ۳۵۰:** هر تغییر در این فایل نیازمند رمز `350` است.

---

## ۱. فایل `AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.sarraaf.app">

    <!-- دسترسی اینترنت -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.AppCompat.NoActionBar"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|keyboard|keyboardHidden"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### نکات کلیدی:
- `android:usesCleartextTraffic="false"` → ترافیک clear-text غیرفعال (فقط HTTPS).
- `android:theme="@style/Theme.AppCompat.NoActionBar"` → رندرینگ یکنواخت بدون ActionBar.
- `android:networkSecurityConfig` → پیکربندی امنیتی شبکه.

---

## ۲. فایل `res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- فقط ترافیک HTTPS مجاز است -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!-- دامنه‌ی برنامه -->
    <domain-config>
        <domain includeSubdomains="true">motherapp.base44.app</domain>
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </domain-config>

    <!-- دامنه‌ی گوگل برای OAuth -->
    <domain-config>
        <domain includeSubdomains="true">accounts.google.com</domain>
        <domain includeSubdomains="true">google.com</domain>
        <domain includeSubdomains="true">googleapis.com</domain>
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </domain-config>
</network-security-config>
```

---

## ۳. فایل `res/values/styles.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- تم اصلی: NoActionBar برای رندرینگ یکنواخت WebView -->
    <style name="AppTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">@android:color/white</item>
        <item name="android:statusBarColor">@color/primary_dark</item>
        <item name="android:windowLightStatusBar">false</item>
    </style>

    <!-- رنگ‌های برند -->
    <color name="primary">#3B50E0</color>
    <color name="primary_dark">#2A3FB0</color>
    <color name="white">#FFFFFF</color>
</resources>
```

---

## ۴. فایل `MainActivity.java` — پیکربندی کامل WebView

```java
package com.sarraaf.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Bitmap;
import android.net.http.SslCertificate;
import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://motherapp.base44.app/";
    private static final String KEY_REDIRECT_BASE = "https://motherapp.base44.app/";

    private WebView webView;
    private ProgressBar progressBar;

    // ── User-Agent استاندارد Chrome موبایل ──
    // این رشته از خطای disallowed_useragent گوگل جلوگیری می‌کند.
    private static final String CHROME_MOBILE_UA =
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // ── مقداردهی اولیه WebView ──
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);

        WebSettings settings = webView.getSettings();

        // ── ۴. فعال‌سازی قابلیت‌ها ──
        // JavaScript فعال
        settings.setJavaScriptEnabled(true);

        // DOM Storage (localStorage, sessionStorage) فعال
        settings.setDomStorageEnabled(true);

        // Database storage فعال
        settings.setDatabaseEnabled(true);

        // کوکی‌های دائمی (persistent) فعال
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);
        // کوکی‌ها بین راه‌اندازی‌ها باقی بمانند
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        // Cache فعال
        settings.setAppCacheEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAppCachePath(getCacheDir().getAbsolutePath());

        // Viewport و zoom
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);

        // Mixed content: فقط HTTPS (امنیت)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        // ── ۳. User-Agent استاندارد Chrome موبایل ──
        // این کار از خطای disallowed_useragent گوگل جلوگیری می‌کند.
        settings.setUserAgentString(CHROME_MOBILE_UA);

        // ── ۵. بازسازی shouldOverrideUrlLoading ──
        // همه‌ی ناوبری‌ها — از جمله redirectهای OAuth — داخل WebView نگه داشته می‌شوند.
        webView.setWebViewClient(new SarraafWebViewClient());

        // ── WebChromeClient برای Progress Bar و دیالوگ‌ها ──
        webView.setWebChromeClient(new SarraafChromeClient());

        // ── بارگذاری صفحه‌ی اصلی ──
        if (savedInstanceState != null) {
            // بازیابی وضعیت پس از چرخش صفحه
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    // ── ۵. WebViewClient سفارشی: نگه‌داشتن همه‌ی ناوبری‌ها داخل WebView ──
    private class SarraafWebViewClient extends WebViewClient {

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            // ── ۶. عدم استفاده از مرورگر خارجی ──
            // همه‌ی URLها — از جمله redirectهای OAuth گوگل — داخل WebView باز می‌شوند.
            // Chrome Custom Tabs یا Intent سیستم استفاده نمی‌شود.
            String url = request.getUrl().toString();

            // همه‌ی ناوبری‌ها داخل WebView نگه داشته می‌شوند
            // (حتی accounts.google.com برای OAuth)
            view.loadUrl(url);
            return true; // true = ما خودمان مدیریت کردیم، مرورگر خارجی باز نشود
        }

        // نسخه‌ی قدیمی برای API 21-23
        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            view.loadUrl(url);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            progressBar.setVisibility(ProgressBar.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            progressBar.setVisibility(ProgressBar.GONE);

            // همگام‌سازی کوکی‌ها پس از بارگذاری صفحه
            CookieManager.getInstance().flush();
        }

        @Override
        public void onReceivedSslError(WebView view, android.webkit.SslErrorHandler handler, android.net.http.SslError error) {
            // در تولید (Production) نباید SSL errors را نادیده بگیریم
            // برای امنیت، فقط خطاهای SSL را نمایش می‌دهیم و رد می‌کنیم
            handler.cancel();
        }
    }

    // ── WebChromeClient برای Progress Bar ──
    private class SarraafChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            super.onProgressChanged(view, newProgress);
            progressBar.setProgress(newProgress);
            if (newProgress >= 100) {
                progressBar.setVisibility(ProgressBar.GONE);
            } else {
                progressBar.setVisibility(ProgressBar.VISIBLE);
            }
        }
    }

    // ── مدیریت دکمه‌ی Back سخت‌افزاری ──
    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // ─ـ ذخیره‌ی وضعیت WebView برای جلوگیری از reload هنگام چرخش ──
    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    // ── ذخیره‌ی کوکی‌ها هنگام Pause ──
    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    // ── همگام‌سازی کوکی‌ها هنگام Resume ──
    @Override
    protected void onResume() {
        super.onResume();
        CookieManager.getInstance().flush();
    }
}
```

---

## ۵. فایل `res/layout/activity_main.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/white">

    <WebView
        android:id="@+id/webView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="3dp"
        android:layout_alignParentTop="true"
        android:max="100"
        android:progress="0"
        android:visibility="gone"
        android:background="@color/primary" />

</RelativeLayout>
```

---

## ۶. فایل `build.gradle` (app level)

```gradle
android {
    compileSdk 34
    defaultConfig {
        applicationId "com.sarraaf.app"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'
    implementation 'androidx.webkit:webkit:1.8.0'
}
```

---

## خلاصه‌ی ۷ نکته‌ی کلیدی

| # | نکته | محل پیاده‌سازی |
|---|------|------------------|
| ۱ | تک‌زمین WebView — کل چرخه‌ی حیات داخل یک WebView | `MainActivity.java` |
| ۲ | ورود فقط با گوگل — `loginWithProvider("google", returnTo)` | صفحه‌ی ورود وب (Login.jsx) |
| ۳ | User-Agent استاندارد Chrome موبایل | `CHROME_MOBILE_UA` در `MainActivity.java` |
| ۴ | فعال‌سازی JavaScript, DOM Storage, کوکی‌های دائمی | `WebSettings` در `MainActivity.java` |
| ۵ | بازسازی `shouldOverrideUrlLoading` — همه‌ی ناوبری‌ها داخل WebView | `SarraafWebViewClient` |
| ۶ | عدم استفاده از مرورگر خارجی (Custom Tabs / Intent) | `shouldOverrideUrlLoading` → `return true` |
| ۷ | امنیت و رابط کاربری — clear-text غیرفعال، `Theme.AppCompat.NoActionBar` | `AndroidManifest.xml` + `network_security_config.xml` |

---

## نکات مهم

### چرا `disallowed_useragent` رخ می‌داد؟
گوگل اگر User-Agent پیش‌فرض WebView را شناسایی کند، خطای `disallowed_useragent`
می‌دهد. با تنظیم User-Agent استاندارد Chrome موبایل، گوگل فرض می‌کند کاربر
از مرورگر Chrome موبایل استفاده می‌کند و اجازه‌ی OAuth را می‌دهد.

### چرا `MismatchingStateError` رخ می‌داد؟
وقتی OAuth به مرورگر خارجی (Custom Tabs / Intent) منتقل می‌شد، state/CSRF
token بین WebView و مرورگر خارجی گم می‌شد. با نگه‌داشتن همه‌ی ناوبری‌ها داخل
همان WebView، state token حفظ می‌شود و این خطا برطرف می‌شود.

### چرا «Login Session Expired» رخ می‌داد؟
کوکی‌های سشن بین WebView و مرورگر خارجی جدا بودند. با فعال‌سازی
`CookieManager` و کوکی‌های دائمی (`flush` در `onPause` و `onResume`)،
سشن بین راه‌اندازی‌ها باقی می‌ماند.

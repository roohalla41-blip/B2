package com.base44.apk;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private WebView webView;

    private static final String APP_URL =
            "https://preview.xcodx.io/?_tok=d9e00b59cb124a09";

    private static final String CHROME_UA =
            "Mozilla/5.0 (Linux; Android 13; Pixel 7) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/124.0.0.0 Mobile Safari/537.36";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUserAgentString(CHROME_UA);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMixedContentMode(
                WebSettings.MIXED_CONTENT_NEVER_ALLOW
        );

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(
                webView, true
        );

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view,
                    WebResourceRequest request
            ) {
                return handleUrl(request.getUrl().toString());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view,
                    String url
            ) {
                return handleUrl(url);
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            Intent intent = getIntent();
            Uri data = intent != null ? intent.getData() : null;

            webView.loadUrl(
                    data != null ? data.toString() : APP_URL
            );
        }
    }

    private boolean handleUrl(String url) {
        if (url == null || url.trim().isEmpty()) {
            return true;
        }

        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();

        if (scheme == null) {
            return false;
        }

        scheme = scheme.toLowerCase(Locale.ROOT);

        // تماس تلفنی
        if ("tel".equals(scheme)) {
            return openExternalApp(
                    new Intent(Intent.ACTION_DIAL, uri)
            );
        }

        // ایمیل
        if ("mailto".equals(scheme)) {
            return openExternalApp(
                    new Intent(Intent.ACTION_SENDTO, uri)
            );
        }

        // پیامک
        if ("sms".equals(scheme) ||
                "smsto".equals(scheme)) {
            return openExternalApp(
                    new Intent(Intent.ACTION_SENDTO, uri)
            );
        }

        // لینک‌های واتساپ، ایمو و سایر لینک‌های خارجی
        if ("http".equals(scheme) ||
                "https".equals(scheme)) {

            String host = uri.getHost();

            if (host == null) {
                return false;
            }

            host = host.toLowerCase(Locale.ROOT);

            boolean external =
                    host.equals("wa.me") ||
                    host.equals("whatsapp.com") ||
                    host.endsWith(".whatsapp.com") ||
                    host.equals("imo.im") ||
                    host.endsWith(".imo.im");

            if (external) {
                return openExternalApp(
                        new Intent(
                                Intent.ACTION_VIEW,
                                uri
                        )
                );
            }

            // صفحات داخلی برنامه در WebView باقی می‌مانند.
            return !isInternalHost(host);
        }

        // سایر طرح‌ها مانند intent://
        if ("intent".equals(scheme)) {
            try {
                Intent externalIntent =
                        Intent.parseUri(
                                url,
                                Intent.URI_INTENT_SCHEME
                        );

                if (externalIntent.getPackage() == null) {
                    externalIntent.setPackage(null);
                }

                return openExternalApp(externalIntent);

            } catch (Exception e) {
                Toast.makeText(
                        this,
                        "باز کردن این لینک ممکن نیست.",
                        Toast.LENGTH_SHORT
                ).show();

                return true;
            }
        }

        // طرح‌های ناشناخته داخل WebView باز نشوند.
        return openExternalApp(
                new Intent(Intent.ACTION_VIEW, uri)
        );
    }

    private boolean isInternalHost(String host) {
        return host.equals("motherapp.base44.app") ||
                host.equals("madar-app.base44.app") ||
                host.equals("base44.app") ||
                host.endsWith(".base44.app");
    }

    private boolean openExternalApp(Intent intent) {
        try {
            startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            Toast.makeText(
                    this,
                    "برنامه مناسب برای باز کردن لینک پیدا نشد.",
                    Toast.LENGTH_LONG
            ).show();
            return true;
        } catch (Exception e) {
            Toast.makeText(
                    this,
                    "باز کردن لینک با خطا مواجه شد.",
                    Toast.LENGTH_LONG
            ).show();
            return true;
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) {
            webView.saveState(outState);
        }

        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }
}

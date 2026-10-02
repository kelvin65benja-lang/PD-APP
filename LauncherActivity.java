package com.pdapp.pwanidirectory;

import android.net.Uri;
import android.os.Bundle;
import com.google.androidbrowserhelper.trusted.TwaLauncher;
import com.google.androidbrowserhelper.trusted.TrustedWebActivityIntentBuilder;
import android.app.Activity;

public class LauncherActivity extends Activity {
    private TwaLauncher twaLauncher;
    private static final String WEB_URL = "https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/";

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        twaLauncher = new TwaLauncher(this);
        Uri uri = Uri.parse(WEB_URL);
        twaLauncher.launch(new TrustedWebActivityIntentBuilder(uri), null, null, null);
    }

    @Override protected void onDestroy() {
        if (twaLauncher != null) twaLauncher.destroy();
        super.onDestroy();
    }
}

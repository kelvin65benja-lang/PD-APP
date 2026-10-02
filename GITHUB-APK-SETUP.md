# PD APP — GitHub APK

1. Upload the contents of this folder to the ROOT of your GitHub repository.
2. Enable GitHub Pages: Settings → Pages → Deploy from branch → main → /(root).
3. GitHub Actions → Build PD APP APK → Run workflow.
4. Download the artifact `PD-APP-debug-apk`.

IMPORTANT: Before the APK can open the live site, set the GitHub Pages URL in
`android/app/src/main/java/com/pdapp/pwanidirectory/LauncherActivity.java`:

https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/

The current workflow builds the APK. It does not automatically rewrite the Java URL.
For push notifications, Firebase Web Push/VAPID configuration is still required.

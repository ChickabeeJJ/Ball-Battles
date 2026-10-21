# Android build and Google Play release

This adds an Android package around the existing HTML5 game. The root game files and the current CrazyGames build remain in place. Capacitor packages a separate copy of the game into `www/`; that generated directory and `android/` are intentionally ignored by Git.

## App identity

- App name: **Ball Battles**
- Android application ID: `com.chickabeejj.ballbattles`
- Google Play package name: the same application ID

Set this ID in Play Console when creating the app. Treat it as permanent once published.

## Automated debug build

The GitHub Actions workflow `.github/workflows/android.yml` runs on pushes to this branch and can also be started manually from the Actions tab. It:

1. Installs Node.js, Java 21 and Android SDK API 36.
2. creates a self-contained web copy in `www/` (removing only the external CrazyGames SDK loader from that copy; the game itself and the regular web build remain unchanged).
3. Generates the Capacitor Android project.
4. Sets compile and target SDK to API 36.
5. Builds and uploads a debug APK as the `ball-battles-android-debug` artifact.

A debug APK is for device testing, **not the Google Play upload**.

## Signed Google Play bundle (AAB)

The workflow builds a signed release `.aab` only after all four GitHub Actions repository secrets are added:

- `PLAY_KEYSTORE_BASE64`: base64 contents of your upload keystore file.
- `PLAY_KEYSTORE_PASSWORD`: keystore password.
- `PLAY_KEY_ALIAS`: key alias.
- `PLAY_KEY_PASSWORD`: key password.

For a **new app**, create an upload key on a trusted local machine and keep the original keystore and passwords safe. Never commit the keystore, upload it as a public artifact, or paste it into chat. For the simplest setup, use the **same password** for the keystore and key (this is recommended with Java's default PKCS#12 keystore format). Put that same password in both the `PLAY_KEYSTORE_PASSWORD` and `PLAY_KEY_PASSWORD` secrets. Example command:

```sh
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

On Windows PowerShell, create the base64 value (keep the resulting value private):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks")) | Set-Clipboard
```

In GitHub, open **Settings → Secrets and variables → Actions → New repository secret** and create the four secrets above. Run the workflow again on this branch. With all four secrets present, a second artifact called `ball-battles-google-play-aab` will contain the signed AAB. The first publish also requires configuring Play App Signing in Play Console.

Do not lose the upload keystore or passwords. If there is an existing published app using this package ID, use its existing authorized upload key rather than generating a replacement.

## Local build (optional)

Requires Node.js 22, Java 21 and Android SDK API 36. Then:

```sh
npm install
npm run build:android-web
npx cap add android
npx cap sync android
python3 tools/prepare-android-project.py
cd android
./gradlew assembleDebug
```

## Privacy policy for Google Play

The policy is in `privacy-policy.html` and the game Settings menu links to it. The Android build script copies it into the packaged app, so players can read it from inside the app as well.

The repository's existing public site is hosted at Vercel: https://ball-battles-phi.vercel.app. To publish the new policy on that production site:

1. Open the existing pull request: https://github.com/ChickabeeJJ/Ball-Battles/pull/1
2. Review the changes and choose **Merge pull request**. This pull request contains the Android build setup as well as the privacy-policy page and in-game link.
3. Wait for Vercel's production deployment for the repository's default branch to finish successfully.
4. Open https://ball-battles-phi.vercel.app/privacy-policy in a private/incognito window. Confirm it loads without a GitHub sign-in, shows the **Ball Battles Privacy Policy** heading, and works from your region.
5. In Google Play Console, open your app's **App content / Privacy policy** section (the exact menu wording can vary), enter `https://ball-battles-phi.vercel.app/privacy-policy`, save, and finish the declaration.

Do not submit the link until you have checked that it is live and publicly accessible. The GitHub Issues page is public: players should not include sensitive or personal information in an issue. The policy and the Play Console **Data safety** answers must accurately match the version of the app you submit; update them if you later add ads, analytics, accounts, cloud saves, or other data collection.
## Important pre-release checks

- Test the APK on a real Android device, including touch controls, audio, saving, rotate/resume behavior, and network multiplayer.
- The in-game CrazyGames account, rewarded ad and invite integrations are unavailable in the standalone Android wrapper. The web build still has them.
- Play Console may ask for listing assets, Data safety, content rating, target audience, privacy policy, testing tracks, and other app-specific declarations. A successful build by itself is not approval to publish.
- New Google Play apps must target Android 16 / API 36 or higher from 31 August 2026 onward. This setup explicitly targets API 36; re-check Play Console's current requirements at submission time.

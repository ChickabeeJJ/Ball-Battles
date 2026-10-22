# Publishing Ball Vs Ball on Google Play

Everything here is for the `google-play` branch. The technical build details (Capacitor, signing secrets) are in `ANDROID_RELEASE.md`.

## 0. What's ready

| Item | Where |
| --- | --- |
| Signed upload bundle (`.aab`) | GitHub → Actions → **Android build** → latest run on `google-play` → artifact **ball-battles-google-play-aab** |
| App icon 512×512 | `store-listing/icon-512.png` |
| Feature graphic 1024×500 | `store-listing/feature-graphic-1024x500.png` |
| Phone screenshots (1080×1920) | `store-listing/screenshot-*.png` |
| Privacy policy URL | `https://ballvsball.vercel.app/privacy/` (merge `google-play` into `main` first so the updated policy is live) |
| Package name | `com.chickabeejj.ballbattles` (permanent) |

Every push to `google-play` builds a new `.aab`. Its version code is the workflow run number, so each new build can be uploaded over the last one.

## 1. Policy changes made in this branch

- **No ads, no in-app purchases, no analytics** in the Android build. The CrazyGames SDK (ads, accounts) is stripped from the app.
- **Privacy policy** now accurately describes the Android app: saves stay on the device, and optional online PvP connects through the public PeerJS server and directly to the other player (needed for the match only, default name "Player").
- **Settings → Privacy Policy** link and **Settings → Delete save data** (erases everything the app stored on the device).
- **Random ball odds are shown before you earn them**: playtime Common+ ball (85% Common · 14% Rare · 1% Epic), Beginner prize and Season Pass Rare+ balls (90% Rare · 9% Epic · 1% Legendary). These rewards are only earned by playing, never bought.
- **App name** matches the store listing: *Ball Vs Ball*. **Launcher icon** is the game art instead of Capacitor's default.
- Targets **Android API 36**, as Play requires for new apps.

## 2. Play Console, step by step

### A. Create the app
1. **Create app** → App name `Ball Vs Ball`, Default language English, **Game**, **Free**.
2. Tick the declarations → **Create app**.

### B. Testing first (new personal developer accounts)
If your developer account is a **personal** account created after 13 Nov 2023, Google requires a **closed test with at least 12 testers opted in for 14 days in a row** before you can apply for production. Do this:
1. **Test and release → Testing → Closed testing → Create track** (or use "Alpha").
2. **Testers**: create an email list with at least 12 Google accounts (friends/family); copy the opt-in link and send it to them. They must stay opted in for 14 days.
3. **Create new release** → upload the `.aab` (see section 3) → release name e.g. `1.0.21` → **Save → Review release → Start rollout**.
4. After 14 days: **Dashboard → Apply for production** and answer the questions about your test.

If it's an organisation account, you can go straight to **Production → Create new release**.

### C. App content (left menu: **Policy and programs → App content**)
| Section | Answer |
| --- | --- |
| Privacy policy | `https://ballvsball.vercel.app/privacy/` |
| App access | All functionality is available without special access |
| Ads | **No**, my app does not contain ads |
| Content rating | Run the IARC questionnaire (see below) |
| Target audience | **13–15, 16–17, 18+** (not under 13, which would bring in the stricter Families policy). "Appeal to children": No |
| News app | No |
| Data safety | See below |
| Government app | No |
| Financial features | None |
| Health | None |

**Content rating questionnaire (category: Game)**
- Violence: **Yes**, cartoon/fantasy violence; it is not realistic and not against humans (balls with weapons). Blood: No.
- Fear/horror: **Yes, mild**. Some balls have spooky/monster effects; answer the strength questions as mild.
- Sexuality, language, drugs, alcohol, tobacco, crude humour: No.
- Gambling: **No** real-money gambling and **no** simulated gambling you can buy into. If asked about random reward items: they exist, but they can't be bought with real money.
- Users can interact or communicate: **No chat**. If asked about online play: Yes, online matches with other players, no communication between them.
- Shares location: No. Digital purchases: No.

**Data safety**
- Does your app collect or share any of the required user data types? **No.** Saves stay on the device. Online PvP only exchanges temporary match data (default name "Player", picked balls, aim inputs, results) to run the match, with no account and no identifiers.
- Is all user data encrypted in transit? Yes (WebRTC/WSS).
- Account deletion: not applicable, because there are no accounts. Settings → Delete save data wipes local data.

> If you later add ads, analytics, cloud saves or sign-in, update both the Data safety form and the privacy policy *before* releasing that version.

### D. Store listing (**Grow users → Store presence → Main store listing**)
- **App name** (30): `Ball Vs Ball`
- **Short description** (80):
  `Arm a ball, watch the chaos! 100+ balls clash in fast, satisfying auto-battles.`
- **Full description**:

```
Ball Vs Ball is an auto-battler where balls with spinning weapons bounce around an arena and fight to be the last one standing. Every hit makes a weapon stronger, so battles go from calm to chaos fast!

Choose from over 100 balls: classic weapons like swords, spears and daggers, and wild Special balls like Phoenix, Vampire, Meteor, Nova, BALL and the legendary Kami. Each has its own gimmick and finisher.

FEATURES
• 1v1, 2v2, 3v3 and Free For All battles across several maps
• Online PvP: aim your launch, then watch your squad take on another player
• Cup tournaments and Gauntlet runs
• Daily quests, Beginner quests, login and playtime rewards
• A Season Pass with events, exclusive balls, skins and titles
• Ball Mastery: level up your favourite balls to unlock skins and coins

No ads. No in-app purchases. Just pick your fighters and enjoy the chaos.
```

- **App icon**: `store-listing/icon-512.png`
- **Feature graphic**: `store-listing/feature-graphic-1024x500.png`
- **Phone screenshots**: the four `store-listing/screenshot-*.png`
- **Category**: Game → Action (or Casual). Tags: Casual, Action, Arcade.
- **Contact details**: an email address is required (it is shown publicly on the store page).

## 3. Getting the `.aab`

1. GitHub → repository **Actions** tab → **Android build** → newest run on branch **google-play** (green tick).
2. Scroll to **Artifacts** → download **ball-battles-google-play-aab** (a zip) → unzip it → `app-release.aab`.
3. Upload that file in the release (step B3). On the first upload Play asks about **Play App Signing**: keep **"Let Google manage and protect your app signing key"** (recommended). The key in your GitHub secrets becomes your *upload key*. Keep that keystore file and password safe forever. If it's lost you can ask Google to reset the upload key, but it takes time.

To build a new version: push changes to `google-play` (or click **Run workflow** on the Actions page), wait about 3 minutes, and download the new artifact.

## 4. Before you press "Send for review"
- Install the debug APK artifact (`ball-battles-android-debug`) on a real phone and play: tutorial, battles, PvP, saving after closing the app, Delete save data, Privacy Policy link.
- Merge `google-play` into `main` so `https://ballvsball.vercel.app/privacy/` shows the updated policy, and open it in an incognito window to confirm.
- Publishing overview → **Send changes for review**. First reviews usually take from a few days up to about a week.

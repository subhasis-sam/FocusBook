# FocusBook

FocusBook is an offline-first personal checklist for academic work, research, placement preparation, learning, job applications, and everyday tasks. It is built with Expo, React Native, TypeScript, Expo Router, SQLite, and local notifications.

## Features

- Four tabs: Today, Categories, Plan, and More.
- Large, one-tap checkboxes with completion strikethrough and category progress.
- Add, edit, delete, search, filter, and reschedule tasks.
- Optional notes, priority, due date, scheduled date, top-three flag, and local reminder.
- SQLite storage with schema migrations and one-time, idempotent starter import.
- JSON export and replace-from-backup import.
- Weekly view and a locally saved, editable 90-day roadmap.
- No sign-in or server required.

## Setup

Install Node.js LTS, then from this folder run:

```sh
npm install
npx expo install --fix
npx expo start
```

Use a development build for full Android validation. Expo Go supports the local database and local notifications during development, but a development build matches the Android binary and notification configuration used by EAS.

## Starter data

The supplied starter bundle is included at `assets/starter-tasks.json`. It contains the exact ten categories and 85 tasks. The initializer validates both counts and each task's category reference before the first insert; a mismatch is shown as a startup error rather than silently importing partial or fabricated data. Starter rows are inserted in one SQLite transaction, all unchecked, with stable `source_key` values. A metadata flag prevents reseeding on later launches. Existing database content takes precedence if the seed file is changed in an app update.

If the database has already been initialized, uninstalling the app or clearing its storage removes local data. Export a JSON backup first if you want to move or preserve it.

## Android builds

Configure the EAS project once with `eas init` (which fills the project ID in app configuration), then use:

```sh
# Internal installable APK for device testing
npm run build:android:preview

# Google Play production Android App Bundle
npm run build:android:production
```

The `preview` EAS profile produces an APK. The `production` profile produces an AAB suitable for Google Play. EAS credentials and a valid Android application ID are required. Local reminders should be verified on the actual Android build, including notification permission behavior on the device's Android version.

## Tests and checks

```sh
npm test
npm run typecheck
```

The Jest suite validates starter bundle constraints before the SQLite seed transaction can run. SQLite persistence, offline behavior, notification delivery, and full task flows need a device or Android emulator; see [QA.md](docs/QA.md) for the test checklist.

## Project layout

```text
app/                 Expo Router tabs and category detail route
assets/              Starter task bundle
src/components/      Shared UI, task row/editor, app state
src/db/              SQLite schema, migrations, starter seed, repository
src/services/        Local notification scheduling
__tests__/           Starter validation tests
docs/                Device QA checklist
```

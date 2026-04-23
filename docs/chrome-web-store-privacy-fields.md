# Chrome Web Store Privacy Fields

Use the following answers for the current implementation of Top Hat Audio Alert.

## Single purpose description

Paste this into the `Single purpose description` field:

> Plays a local audio alert when a new question or participation prompt appears on supported Top Hat classroom pages.

## Permissions justification

Use these justifications for the current manifest permissions.

### `storage`

> Stores alert preferences, selected popup theme, and optional custom MP3 files locally in Chrome extension storage.

### `offscreen`

> Creates an offscreen document used only for local audio playback of alert and preview sounds.

### `https://app.tophat.com/e/*`

> Allows the extension to read supported Top Hat classroom pages so it can detect when a new question or participation prompt becomes visible and play the selected sound.

## Remote code use

If the dashboard asks whether the extension executes remote code, answer:

> No, I am not using remote code.

## Data usage

If the dashboard asks whether the extension handles user data, answer:

> Yes.

For the current implementation, select these data types:

- `Website content`
- `Web history`

Do not select additional website-data categories unless the code changes.

If the dashboard includes a separate category for user-provided files or user-generated content, select that too, because optional custom MP3 uploads are stored locally.

## Data use certifications

Check the certifications that say:

- collected data is not being sold to third parties;
- collected data is not being used or transferred for purposes unrelated to the item's core functionality; and
- collected data is not being used or transferred to determine creditworthiness or for lending purposes.

## Privacy policy URL

Use a public HTTPS URL for [PRIVACY_POLICY.md](/Users/dayanbattulga/Desktop/personal-code/misc/tophat extension/PRIVACY_POLICY.md).

Fastest option if the GitHub repo is public:

> https://github.com/dayan-battulga/top-hat-audio-alert/blob/main/PRIVACY_POLICY.md

## Consistency note

Keep the privacy fields, privacy policy, and store listing aligned with these facts:

- the extension only runs on `https://app.tophat.com/e/*`;
- it reads the Top Hat page locally to detect visible questions and participation prompts;
- it does not send that page data to the developer or third parties; and
- settings and optional uploaded MP3 files are stored locally in extension storage.

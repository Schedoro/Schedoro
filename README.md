# Schedoro

Expo Router app with Schedule, Jobs, Team, and More tabs. Analytics is available under More.

## Development

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. If your phone cannot reach the development server over Wi-Fi, use `npx expo start --tunnel`.

```bash
npx tsc --noEmit
```

## Fonts

Import `Text` and `TextInput` from `@/components/typography` for Product Sans
by default. For other variants, use `fontFamily: Fonts.bold` (or
`Fonts.mediumItalic`, etc.) from `@/constants/fonts` rather than `fontWeight`
or `fontStyle`.

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

For new text or inputs, import `Fonts` from `@/constants/fonts` and set
`fontFamily: Fonts.regular` (or `Fonts.bold`, `Fonts.mediumItalic`, etc.). Select
weights and italics through these explicit font names rather than adding
`fontWeight` or `fontStyle`, so each platform uses the supplied font file.

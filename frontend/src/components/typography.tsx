import { createContext, useContext, type ComponentProps } from 'react';
import { Platform, StyleSheet, Text as NativeText, TextInput as NativeTextInput } from 'react-native';

import { Fonts } from '@/constants/fonts';

const NestedText = createContext(false);
const defaultFont = { fontFamily: Fonts.regular };

export function Text({ style, ...props }: ComponentProps<typeof NativeText>) {
  const nested = useContext(NestedText);

  // Nested text inherits its parent's font, including bold headings.
  return (
    <NestedText value>
      <NativeText {...props} style={[!nested && defaultFont, style]} />
    </NestedText>
  );
}

export function TextInput({ style, multiline, ...props }: ComponentProps<typeof NativeTextInput>) {
  const { lineHeight, ...rest } = StyleSheet.flatten([defaultFont, style]) ?? {};
  const num = (v: unknown) => (typeof v === 'number' ? v : 0);
  const padding = num(rest.paddingTop ?? rest.paddingVertical ?? rest.padding) + num(rest.paddingBottom ?? rest.paddingVertical ?? rest.padding);

  // ios pushes single line text down when lineHeight is set, so keep the same height without it.
  // android adds extra font padding above the text
  const centered =
    Platform.OS === 'ios' && !multiline && lineHeight
      ? { ...rest, minHeight: lineHeight + padding }
      : { ...rest, lineHeight };

  return (
    <NativeTextInput
      {...props}
      multiline={multiline}
      style={[centered, !multiline && styles.singleLine]}
    />
  );
}

const styles = StyleSheet.create({
  singleLine: { textAlignVertical: 'center', includeFontPadding: false },
});

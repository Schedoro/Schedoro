import { createContext, useContext, type ComponentProps } from 'react';
import { Text as NativeText, TextInput as NativeTextInput } from 'react-native';

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

export function TextInput({ style, ...props }: ComponentProps<typeof NativeTextInput>) {
  return <NativeTextInput {...props} style={[defaultFont, style]} />;
}

export const Fonts = {
  thin: 'ProductSans-Thin',
  thinItalic: 'ProductSans-ThinItalic',
  light: 'ProductSans-Light',
  lightItalic: 'ProductSans-LightItalic',
  regular: 'ProductSans-Regular',
  italic: 'ProductSans-Italic',
  medium: 'ProductSans-Medium',
  mediumItalic: 'ProductSans-MediumItalic',
  bold: 'ProductSans-Bold',
  boldItalic: 'ProductSans-BoldItalic',
  black: 'ProductSans-Black',
  blackItalic: 'ProductSans-BlackItalic',
} as const;

// require bundling for offline use
export const productSansFonts = {
  [Fonts.thin]: require('@/assets/fonts/ProductSans-Thin.ttf'),
  [Fonts.thinItalic]: require('@/assets/fonts/ProductSans-ThinItalic.ttf'),
  [Fonts.light]: require('@/assets/fonts/ProductSans-Light.ttf'),
  [Fonts.lightItalic]: require('@/assets/fonts/ProductSans-LightItalic.ttf'),
  [Fonts.regular]: require('@/assets/fonts/ProductSans-Regular.ttf'),
  [Fonts.italic]: require('@/assets/fonts/ProductSans-Italic.ttf'),
  [Fonts.medium]: require('@/assets/fonts/ProductSans-Medium.ttf'),
  [Fonts.mediumItalic]: require('@/assets/fonts/ProductSans-MediumItalic.ttf'),
  [Fonts.bold]: require('@/assets/fonts/ProductSans-Bold.ttf'),
  [Fonts.boldItalic]: require('@/assets/fonts/ProductSans-BoldItalic.ttf'),
  [Fonts.black]: require('@/assets/fonts/ProductSans-Black.ttf'),
  [Fonts.blackItalic]: require('@/assets/fonts/ProductSans-BlackItalic.ttf'),
};

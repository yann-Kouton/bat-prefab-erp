import { Image, ImageStyle, StyleProp } from 'react-native';

const RATIO = 390 / 243; // largeur / hauteur de assets/logo.png

/** Logo officiel BAT & PREFAB (fond blanc : à placer sur une surface blanche). */
export function Logo({ width = 220, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[{ width, height: width / RATIO }, style]}
      resizeMode="contain"
      accessibilityLabel="BAT & PREFAB, Bâtir Des Edifices Modernes"
    />
  );
}

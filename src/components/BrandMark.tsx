import Svg, { Path, Rect } from 'react-native-svg';

/** Logo simplifié : deux modules préfabriqués sous une poutre de toit. */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="BAT & PREFAB">
      <Rect x={0} y={0} width={64} height={64} rx={14} fill="#33475A" />
      <Path d="M10 30 L32 14 L54 30" stroke="#F5B800" strokeWidth={5} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
      <Rect x={16} y={34} width={14} height={16} fill="#FFFFFF" />
      <Rect x={34} y={34} width={14} height={16} fill="#FFFFFF" fillOpacity={0.55} />
    </Svg>
  );
}

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import type { IconName } from '@/components/ui';
import { colors } from '@/theme';

const icon = (outline: IconName, filled: IconName) =>
  function TabIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
  };

export default function TabsLayout() {
  const { can } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: icon('grid-outline', 'grid') }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: icon('people-outline', 'people') }} />
      <Tabs.Screen
        name="quotes"
        options={{ title: 'Devis', tabBarIcon: icon('document-text-outline', 'document-text'), href: can('quotes.read') ? undefined : null }}
      />
      <Tabs.Screen name="projects" options={{ title: 'Projets', tabBarIcon: icon('construct-outline', 'construct') }} />
      <Tabs.Screen name="more" options={{ title: 'Plus', tabBarIcon: icon('ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle') }} />
    </Tabs>
  );
}

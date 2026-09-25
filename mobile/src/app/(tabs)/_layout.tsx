import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';
import { useColors } from '@/theme';

const icon = (glyph: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 18, lineHeight: 22, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;
  };

export default function TabLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIconStyle: { height: 24 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Bugün', tabBarIcon: icon('🌱') }} />
      <Tabs.Screen name="timeline" options={{ title: 'Zaman', tabBarIcon: icon('🗓') }} />
      <Tabs.Screen name="chat" options={{ title: 'Konuş', tabBarIcon: icon('💬') }} />
      <Tabs.Screen name="me" options={{ title: 'Ben', tabBarIcon: icon('📖') }} />
    </Tabs>
  );
}

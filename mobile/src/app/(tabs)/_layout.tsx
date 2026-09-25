import { Tabs } from 'expo-router/js-tabs';
import { Icon, type IconName } from '@/components/Icon';
import { useColors } from '@/theme';

const icon = (name: IconName) =>
  function TabIcon({ color }: { color: import("react-native").ColorValue }) {
    return <Icon name={name} color={String(color)} size={23} />;
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
      }}>
      <Tabs.Screen name="index" options={{ title: 'Bugün', tabBarIcon: icon('today') }} />
      <Tabs.Screen name="timeline" options={{ title: 'Zaman', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="chat" options={{ title: 'Konuş', tabBarIcon: icon('chat') }} />
      <Tabs.Screen name="me" options={{ title: 'Biz', tabBarIcon: icon('me') }} />
    </Tabs>
  );
}

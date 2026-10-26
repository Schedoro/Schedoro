import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

const tabs = [
  { name: 'schedule', title: 'Schedule', icon: require('@/assets/images/tabIcons/CalendarIcon.svg') },
  { name: 'jobs', title: 'Jobs', icon: require('@/assets/images/tabIcons/SuitcaseIcon.svg') },
  { name: 'team', title: 'Team', icon: require('@/assets/images/tabIcons/TeamIcon.svg') },
  { name: 'more', title: 'More', icon: require('@/assets/images/tabIcons/DotsThreeIcon.svg') },
];

export default function AppTabs() {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#5E5EFD',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
        tabBarHideOnKeyboard: true,
      }}>
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            headerShown: name !== 'more',
            tabBarIcon: ({ color, size }) => (
              <Image
                source={icon}
                tintColor={typeof color === 'string' ? color : colors.text}
                style={{ width: size, height: size }}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

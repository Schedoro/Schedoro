import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import MoreMenu from '@/components/more-menu';

const tabs = [
  { name: 'schedule', title: 'Schedule', icon: require('@/assets/images/tabIcons/CalendarIcon.svg') },
  { name: 'jobs', title: 'Jobs', icon: require('@/assets/images/tabIcons/SuitcaseIcon.svg') },
  { name: 'team', title: 'Team', icon: require('@/assets/images/tabIcons/TeamIcon.svg') },
  { name: 'more', title: 'More', icon: require('@/assets/images/tabIcons/DotsThreeIcon.svg') },
];

export default function AppTabs() {
  const colors = Colors[useColorScheme() ?? 'light'];
  const [moreVisible, setMoreVisible] = useState(false);

  return (
    <>
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
            listeners={name === 'more' ? {
              tabPress: (event) => {
                event.preventDefault();
                setMoreVisible(true);
              },
            } : undefined}
            options={{
              title,
              headerShown: name !== 'more',
              ...(name === 'more' && moreVisible && { tabBarLabelStyle: { color: '#5E5EFD' } }),
              tabBarIcon: ({ color, size }) => (
                <Image
                  source={icon}
                  tintColor={name === 'more' && moreVisible ? '#5E5EFD' : typeof color === 'string' ? color : colors.text}
                  style={{ width: size, height: size }}
                />
              ),
            }}
          />
        ))}
      </Tabs>
      <MoreMenu visible={moreVisible} onClose={() => setMoreVisible(false)} />
    </>
  );
}

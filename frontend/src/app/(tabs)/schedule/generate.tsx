import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { icons } from '@/components/schedule/icons';
import { jobs, workers } from '@/components/schedule/schedule-data';
import { Body, Button, Field, InputBox, PURPLE, Screen, ScreenHeader, SelectBox } from '@/components/schedule/ui';

const windows = ['7 days', '14 days', '30 days'];

export default function GenerateScheduleScreen() {
  const router = useRouter();
  const [range, setRange] = useState('30 days');

  return (
    <Screen>
      <ScreenHeader title="Generate Schedule" />
      <Body>
        <View style={{ gap: 12 }}>
          <Field label="Schedule window*">
            <SelectBox
              value={range}
              onPress={() => setRange(windows[(windows.indexOf(range) + 1) % windows.length])}
            />
          </Field>
          <Field label="Business constraints">
            <InputBox placeholder="e.g. Prefer more skilled workers for recurring clients..." multiline />
          </Field>
          <Field label="Jobs to schedule*" helper={`${jobs.length} jobs selected`}>
            <SelectBox value="All jobs" onPress={() => router.push('/schedule/select-jobs')} />
          </Field>
          <Field label="Workers to assign*" helper={`${workers.length} workers selected`}>
            <SelectBox value="All workers" onPress={() => router.push('/schedule/select-workers')} />
          </Field>
        </View>
        <Button icon={icons.magicWand} label="Generate schedule" color={PURPLE} onPress={() => router.push({ pathname: '/schedule/review', params: { range } })} />
      </Body>
    </Screen>
  );
}

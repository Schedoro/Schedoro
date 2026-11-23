import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { icons } from '@/components/schedule/icons';
import { Body, Button, Field, InputBox, PURPLE, Screen, ScreenHeader, SelectBox } from '@/components/schedule/ui';
import { useJobs } from '@/context/jobs';
import { useMembers } from '@/context/members';
import { useScheduleSelection } from '@/context/schedule-selection';
import { toDateString } from '@/lib/appointment-api';

// the generator works for this or next week for now
const windows = ['This week', 'Next week'];

function mondayOf(offsetWeeks: number) {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) + offsetWeeks * 7);
}

export default function GenerateScheduleScreen() {
  const router = useRouter();
  const { jobs } = useJobs();
  const { members } = useMembers();
  const { jobIds, memberIds } = useScheduleSelection();
  const jobCount = jobIds?.length ?? jobs.length;
  const workerCount = memberIds?.length ?? members.length;
  const [range, setRange] = useState(windows[1]);

  function generate() {
    const week = toDateString(mondayOf(windows.indexOf(range)));
    const params: Record<string, string> = { week };
    if (jobIds) params.jobIds = jobIds.join(',');
    if (memberIds) params.memberIds = memberIds.join(',');
    router.push({ pathname: '/schedule/review', params });
  }

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
          <Field label="Jobs to schedule*" helper={`${jobCount} jobs selected`}>
            <SelectBox value={jobIds ? `${jobCount} jobs` : 'All jobs'} onPress={() => router.push('/schedule/select-jobs')} />
          </Field>
          <Field label="Workers to assign*" helper={`${workerCount} workers selected`}>
            <SelectBox value={memberIds ? `${workerCount} workers` : 'All workers'} onPress={() => router.push('/schedule/select-workers')} />
          </Field>
        </View>
        <Button icon={icons.magicWand} label="Generate schedule" color={PURPLE} onPress={generate} />
      </Body>
    </Screen>
  );
}

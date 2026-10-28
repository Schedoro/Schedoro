import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { icons } from '@/components/schedule/icons';
import { Body, Button, Field, InputBox, Screen, ScreenHeader, SelectBox } from '@/components/schedule/ui';

export default function CreateAppointmentScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader title="Create Appointment" />
      <Body>
        <View style={{ gap: 12 }}>
          <Field label="Job*">
            <SelectBox placeholder="Select job" onPress={() => router.push('/schedule/select-jobs')} />
          </Field>
          <Field label="Location*">
            <InputBox icon={icons.mapPin} placeholder="Select location" />
          </Field>
          <Field label="Date & time*">
            <InputBox icon={icons.calendarXLight} placeholder="Select date & time" />
          </Field>
          <Field label="Assign workers*" helper="0 workers selected">
            <SelectBox placeholder="Select workers" onPress={() => router.push('/schedule/select-workers')} />
          </Field>
          <Field label="Notes">
            <InputBox placeholder="Add notes (optional)..." />
          </Field>
        </View>
        <Button icon={icons.plusSmall} label="Create" onPress={() => router.back()} />
      </Body>
    </Screen>
  );
}

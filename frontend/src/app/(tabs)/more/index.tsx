import { router } from 'expo-router';

import MoreMenu from '@/components/more-menu';

export default function MoreScreen() {
  return (
    <MoreMenu
      visible
      onClose={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/schedule');
      }}
    />
  );
}

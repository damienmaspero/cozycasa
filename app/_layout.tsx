import { Stack } from 'expo-router';
import { LanguageProvider } from '@/src/lib/calendar/i18n';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <Stack />
    </LanguageProvider>
  );
}

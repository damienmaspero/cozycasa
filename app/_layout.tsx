import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LanguageProvider, useT } from '@/src/lib/calendar/i18n';

function DrawerNavigator() {
  const T = useT();
  return (
    <Drawer>
      <Drawer.Screen
        name="index"
        options={{ drawerLabel: T.menu_home, title: T.cozy_casa }}
      />
      <Drawer.Screen
        name="calendar"
        options={{ drawerLabel: T.menu_calendar, title: T.app_title }}
      />
      <Drawer.Screen
        name="upcoming"
        options={{ drawerLabel: T.menu_upcoming, title: T.upcoming_bookings }}
      />
    </Drawer>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <DrawerNavigator />
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

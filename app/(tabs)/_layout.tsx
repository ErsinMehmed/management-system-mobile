import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="dashboard"      options={{ href: null }} />
      <Tabs.Screen name="products"       options={{ href: null }} />
      <Tabs.Screen name="sales"          options={{ href: null }} />
      <Tabs.Screen name="incomes"        options={{ href: null }} />
      <Tabs.Screen name="account"        options={{ href: null }} />
      <Tabs.Screen name="regular-orders" options={{ href: null }} />
      <Tabs.Screen name="summary"        options={{ href: null }} />
      <Tabs.Screen name="stock"          options={{ href: null }} />
      <Tabs.Screen name="clients"        options={{ href: null }} />
    </Tabs>
  );
}

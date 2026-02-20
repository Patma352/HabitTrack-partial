import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

function TabIcon({ emoji, label, focused, color }: { emoji: string; label: string; focused: boolean; color: string }) {
  return (
    <View style={styles.tabItem}>
      <Text style={{ fontSize: focused ? 22 : 20 }}>{emoji}</Text>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🛍️" label="Shop" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🪙" label="Wallet" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '500' },
});

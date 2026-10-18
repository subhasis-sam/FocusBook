import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../src/theme';

const iconNames = { index: 'today-outline', categories: 'grid-outline', plan: 'calendar-outline', more: 'ellipsis-horizontal-circle-outline' } as const;
export default function TabLayout() {
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: palette.green, tabBarInactiveTintColor: '#858C84', tabBarStyle: { height: 65, paddingTop: 7, paddingBottom: 9, backgroundColor: '#FFFDF9', borderTopColor: '#E8E5DE' }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, tabBarIcon: ({ color, size }) => <Ionicons name={iconNames[route.name as keyof typeof iconNames] ?? 'ellipse-outline'} size={size} color={color} /> })}><Tabs.Screen name="index" options={{ title: 'Today' }} /><Tabs.Screen name="categories" options={{ title: 'Categories' }} /><Tabs.Screen name="plan" options={{ title: 'Plan' }} /><Tabs.Screen name="more" options={{ title: 'More' }} /></Tabs>;
}

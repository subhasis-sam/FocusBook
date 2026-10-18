import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useAppState } from '../src/components/AppProvider';
import { Loading } from '../src/components/UI';
import { View, Text, StyleSheet } from 'react-native';
import { palette } from '../src/theme';

function AppNavigator() {
  const { ready, error } = useAppState();
  if (!ready) return error ? <View style={styles.error}><Text style={styles.title}>FocusBook couldn’t start</Text><Text style={styles.body}>{error}</Text></View> : <Loading />;
  return <><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="category/[id]" options={{ presentation: 'card', animation: 'slide_from_right' }} /></Stack></>;
}
export default function RootLayout() { return <AppProvider><AppNavigator /></AppProvider>; }
const styles = StyleSheet.create({ error: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: palette.paper }, title: { fontSize: 24, color: palette.ink, fontWeight: '700', marginBottom: 12 }, body: { color: palette.muted, fontSize: 15, lineHeight: 22 } });

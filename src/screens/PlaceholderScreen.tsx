/**
 * Temporary launch screen for slice S1 (owner decision): proves the app builds,
 * opens and reads its environment file on each platform. Strings are not
 * translated and colours are not themed yet; slice S5 replaces this screen
 * with the navigation shell, theme tokens and i18n.
 */
import { StyleSheet, Text, View } from 'react-native';
import { getEnv } from '../constants/env';

export function PlaceholderScreen() {
  const { appEnv } = getEnv();
  return (
    <View style={styles.container} testID="placeholder-screen">
      <Text style={styles.title}>Wayra</Text>
      <Text testID="placeholder-env">Environment: {appEnv}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '600', marginBottom: 8 },
});

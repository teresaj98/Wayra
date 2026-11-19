/**
 * App root. Slice S1 shows a placeholder screen only; the store, theme, i18n
 * and navigation shell arrive in slice S5 (PRD 01 section 3).
 */
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlaceholderScreen } from './src/screens/PlaceholderScreen';

function App() {
  return (
    <SafeAreaProvider>
      <PlaceholderScreen />
    </SafeAreaProvider>
  );
}

export default App;

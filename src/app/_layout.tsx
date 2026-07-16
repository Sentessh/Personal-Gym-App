import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthScreen } from '@/components/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { initActiveSelection } from '@/lib/active-selection-bootstrap';
import { initAuth } from '@/lib/auth';
import { bootstrapProfile } from '@/lib/profile-bootstrap';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Autenticação anônima roda uma vez no boot do app (Fase 0 / R11).
  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Libera o app em etapas: primeiro garante uma sessão (anônima no boot);
 * enquanto anônima, exige login/cadastro; com conta de e-mail, segue ao perfil.
 */
function AuthGate() {
  const { status, error, isAnonymous } = useAuth();

  if (status !== 'authenticated') {
    return <AuthLoading isError={status === 'error'} error={error} />;
  }
  if (isAnonymous) {
    return <AuthScreen />;
  }
  return <ProfileGate />;
}

/**
 * Carrega o perfil e decide o roteamento inicial (§4.7):
 * - sem perfil → onboarding obrigatório;
 * - com perfil → abas (+ tela de perfil como modal).
 * O `Stack.Protected` redireciona sozinho quando o perfil passa a existir.
 */
function ProfileGate() {
  const { status, error, profile } = useProfile();

  useEffect(() => {
    bootstrapProfile();
    // Listener em tempo real da seleção ativa (Fase 4) enquanto o app está aberto.
    const unsubscribe = initActiveSelection();
    return unsubscribe;
  }, []);

  if (status === 'loading') {
    return <AuthLoading isError={false} error={null} loadingLabel="Carregando perfil…" />;
  }
  if (status === 'error') {
    return <AuthLoading isError error={error} />;
  }

  const hasProfile = profile !== null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasProfile}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="perfil"
          options={{ presentation: 'modal', headerShown: true, title: 'Perfil' }}
        />
        <Stack.Screen
          name="ficha/[id]"
          options={{ headerShown: true, title: 'Ficha' }}
        />
        <Stack.Screen
          name="dieta/[id]"
          options={{ headerShown: true, title: 'Dieta' }}
        />
        <Stack.Screen
          name="sessao"
          options={{ headerShown: true, title: 'Treino' }}
        />
        <Stack.Screen
          name="dia/[date]"
          options={{ headerShown: true, title: 'Dia' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!hasProfile}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

function AuthLoading({
  isError,
  error,
  loadingLabel = 'Conectando…',
}: {
  isError: boolean;
  error: string | null;
  loadingLabel?: string;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.center}>
      {isError ? (
        <>
          <ThemedText type="subtitle">Erro ao conectar</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.msg}>
            {error ?? 'Verifique a configuração do Firebase (SETUP.md).'}
          </ThemedText>
        </>
      ) : (
        <>
          <ActivityIndicator color={theme.text} />
          <ThemedText type="small" themeColor="textSecondary">
            {loadingLabel}
          </ThemedText>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  msg: { textAlign: 'center' },
});

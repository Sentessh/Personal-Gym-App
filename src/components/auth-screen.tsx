import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import { authErrorMessage, signInWithEmail, signUpWithEmail } from '@/lib/auth';

const logoMark = require('../../assets/images/logo-mark.png');

type Mode = 'login' | 'signup';

/**
 * Tela de login/cadastro (Fase 8). Mostrada pelo gate enquanto a sessão é
 * anônima. "Criar conta" vincula o e-mail à sessão anônima (preserva os dados);
 * "Entrar" recupera uma conta existente em qualquer aparelho.
 */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    if (isSignup && password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        await signUpWithEmail(trimmedEmail, password);
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
      // Sucesso → o store vira não-anônimo e o gate troca de tela sozinho.
    } catch (e) {
      setError(authErrorMessage(e));
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode(isSignup ? 'login' : 'signup');
    setError(null);
  }

  return (
    <ThemedView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={styles.logoBadge}>
              <Image source={logoMark} style={styles.logo} resizeMode="contain" />
            </View>

            <ThemedText type="title" style={styles.centered}>
              Gym App
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.centered}>
              {isSignup
                ? 'Crie sua conta para salvar seus dados e usar em qualquer aparelho.'
                : 'Entre para acessar seus treinos e dieta.'}
            </ThemedText>

            <View style={styles.form}>
              <TextField
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />
              <TextField
                label="Senha"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignup ? 'new-password' : 'password'}
                textContentType={isSignup ? 'newPassword' : 'password'}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}

            <PrimaryButton
              title={isSignup ? 'Criar conta' : 'Entrar'}
              onPress={handleSubmit}
              loading={submitting}
            />

            <Pressable onPress={toggleMode} style={styles.toggle} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary">
                {isSignup ? 'Já tem conta? ' : 'Ainda não tem conta? '}
                <ThemedText type="smallBold" style={styles.toggleAction}>
                  {isSignup ? 'Entrar' : 'Criar conta'}
                </ThemedText>
              </ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoBadge: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  logo: { width: 68, height: 68 },
  centered: { textAlign: 'center' },
  form: { gap: Spacing.three, marginTop: Spacing.two },
  error: { color: '#E5484D', textAlign: 'center' },
  toggle: { alignSelf: 'center', paddingVertical: Spacing.two },
  toggleAction: { color: Accent },
});

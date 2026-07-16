import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { todayISO } from '@/lib/date';
import { parseDecimal } from '@/lib/number';
import { addBodyWeight, createProfile } from '@/repositories/profile-repo';
import { useProfileStore } from '@/store/profile-store';

/**
 * Onboarding de primeiro uso (§4.7). Obrigatório antes das abas: coleta
 * nome, peso inicial (base do prot/kg) e altura (opcional). Ao concluir,
 * grava o perfil + primeiro registro de peso e libera o app (o gate no
 * _layout redireciona para as abas assim que o perfil existe).
 */
export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [errors, setErrors] = useState<{ name?: string; weight?: string }>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedName = name.trim();
    const weightKg = parseDecimal(weight);
    const heightCm = parseDecimal(height);

    const nextErrors: { name?: string; weight?: string } = {};
    if (!trimmedName) nextErrors.name = 'Informe seu nome.';
    if (weightKg == null || weightKg <= 0)
      nextErrors.weight = 'Informe um peso válido (kg).';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const profile = await createProfile({
        name: trimmedName,
        heightCm: heightCm != null && heightCm > 0 ? heightCm : undefined,
      });
      const date = todayISO();
      const id = await addBodyWeight({ weightKg: weightKg as number, date });
      // Preenche o store → o gate do _layout troca para as abas.
      useProfileStore.getState().setLoaded(profile, {
        id,
        weightKg: weightKg as number,
        date,
      });
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : 'Não foi possível salvar. Tente de novo.',
      );
      setSaving(false);
    }
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
            <ThemedText type="subtitle">Bem-vindo 👋</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Vamos criar seu perfil. Você pode ajustar tudo depois.
            </ThemedText>

            <ThemedView style={styles.form}>
              <TextField
                label="Nome"
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                autoCapitalize="words"
                returnKeyType="next"
                error={errors.name}
              />
              <TextField
                label="Peso atual (kg)"
                value={weight}
                onChangeText={setWeight}
                placeholder="Ex.: 78,5"
                keyboardType="decimal-pad"
                error={errors.weight}
                hint="Usado para calcular sua meta de proteína por kg."
              />
              <TextField
                label="Altura (cm) — opcional"
                value={height}
                onChangeText={setHeight}
                placeholder="Ex.: 178"
                keyboardType="number-pad"
              />
            </ThemedView>

            {submitError ? (
              <ThemedText type="small" style={styles.error}>
                {submitError}
              </ThemedText>
            ) : null}
          </ScrollView>

          <ThemedView style={styles.footer}>
            <PrimaryButton
              title="Começar"
              onPress={handleSubmit}
              loading={saving}
            />
          </ThemedView>
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
  },
  form: { gap: Spacing.three, marginTop: Spacing.two },
  footer: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  error: { color: '#E5484D' },
});

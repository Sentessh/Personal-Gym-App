
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { authErrorMessage, signOutUser } from '@/lib/auth';
import { exportAllData, importAllData, parseBackup } from '@/lib/backup';
import { formatISODate, todayISO } from '@/lib/date';
import { parseDecimal } from '@/lib/number';
import { bootstrapProfile } from '@/lib/profile-bootstrap';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import {
  addBodyWeight,
  listBodyWeights,
  updateProfile,
} from '@/repositories/profile-repo';
import { useProfileStore } from '@/store/profile-store';
import type { BodyWeightEntry } from '@/types/domain';

/**
 * Tela de Perfil (Fase 1). Editar nome/altura, ver o peso mais recente,
 * registrar novo peso e consultar o histórico. Aberta como modal a partir
 * do cabeçalho de "Meu Dia".
 */
export default function PerfilScreen() {
  const { profile } = useProfile();
  const { email } = useAuth();

  const [name, setName] = useState(profile?.name ?? '');
  const [height, setHeight] = useState(
    profile?.heightCm != null ? String(profile.heightCm) : '',
  );
  const [savingProfile, setSavingProfile] = useState(false);

  const [newWeight, setNewWeight] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);

  const [history, setHistory] = useState<BodyWeightEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await listBodyWeights());
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleSaveProfile() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const heightCm = parseDecimal(height);
    setSavingProfile(true);
    try {
      await updateProfile({
        name: trimmed,
        heightCm: heightCm != null && heightCm > 0 ? heightCm : undefined,
      });
      useProfileStore.getState().setProfile({
        name: trimmed,
        createdAt: profile?.createdAt ?? Date.now(),
        ...(heightCm != null && heightCm > 0 ? { heightCm } : {}),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddWeight() {
    const weightKg = parseDecimal(newWeight);
    if (weightKg == null || weightKg <= 0) {
      setWeightError('Informe um peso válido (kg).');
      return;
    }
    setWeightError(null);
    setSavingWeight(true);
    try {
      const date = todayISO();
      const id = await addBodyWeight({ weightKg, date });
      useProfileStore.getState().setLatestWeight({ id, weightKg, date });
      setNewWeight('');
      await loadHistory();
    } finally {
      setSavingWeight(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportAllData();
      await Share.share({ message: JSON.stringify(data) });
    } catch (e) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao exportar.');
    } finally {
      setExporting(false);
    }
  }

  function handleImport() {
    let parsed;
    try {
      parsed = parseBackup(importText);
    } catch (e) {
      Alert.alert('Backup inválido', e instanceof Error ? e.message : 'Não foi possível ler.');
      return;
    }
    Alert.alert(
      'Importar backup',
      'Isso APAGA seus dados atuais e substitui pelos do backup. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              await importAllData(parsed);
              await bootstrapProfile();
              await loadHistory();
              setImportText('');
              Alert.alert('Pronto', 'Backup importado. Abra as abas para ver.');
            } catch (e) {
              Alert.alert('Erro', e instanceof Error ? e.message : 'Falha ao importar.');
            } finally {
              setImporting(false);
            }
          },
        },
      ],
    );
  }

  function handleLogout() {
    Alert.alert(
      'Sair da conta',
      'Seus dados ficam salvos na nuvem. Você pode entrar de novo com o mesmo e-mail em qualquer aparelho. Sair agora?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser();
            } catch (e) {
              Alert.alert('Erro', authErrorMessage(e));
            }
          },
        },
      ],
    );
  }

  return (
    <ThemedView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.root} edges={['bottom']}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {/* Dados do perfil */}
            <ThemedText type="smallBold" themeColor="textSecondary">
              DADOS
            </ThemedText>
            <TextField
              label="Nome"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextField
              label="Altura (cm) — opcional"
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="Ex.: 178"
            />
            <PrimaryButton
              title="Salvar dados"
              onPress={handleSaveProfile}
              loading={savingProfile}
              disabled={!name.trim()}
            />

            {/* Registro de peso */}
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionSpacing}>
              PESO CORPORAL
            </ThemedText>
            <TextField
              label="Registrar peso de hoje (kg)"
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              placeholder="Ex.: 78,5"
              error={weightError}
            />
            <PrimaryButton
              title="Adicionar registro"
              onPress={handleAddWeight}
              loading={savingWeight}
              variant="secondary"
            />

            {/* Histórico */}
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionSpacing}>
              HISTÓRICO
            </ThemedText>
            {loadingHistory ? (
              <ActivityIndicator style={styles.sectionSpacing} />
            ) : history.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum registro ainda.
              </ThemedText>
            ) : (
              <ThemedView type="backgroundElement" style={styles.historyCard}>
                {history.map((entry, i) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.historyRow,
                      i < history.length - 1 && styles.historyDivider,
                    ]}>
                    <ThemedText type="default">
                      {entry.weightKg.toLocaleString('pt-BR')} kg
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatISODate(entry.date)}
                    </ThemedText>
                  </View>
                ))}
              </ThemedView>
            )}

            {/* Backup — export/import de todos os dados (R12). */}
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionSpacing}>
              BACKUP
            </ThemedText>
            <PrimaryButton
              title="Exportar dados (JSON)"
              onPress={handleExport}
              loading={exporting}
              variant="secondary"
            />
            <TextField
              label="Importar: cole aqui o JSON de um backup"
              value={importText}
              onChangeText={setImportText}
              placeholder='{"version":1,...}'
              multiline
              style={styles.importInput}
            />
            <PrimaryButton
              title="Importar dados"
              onPress={handleImport}
              loading={importing}
              disabled={!importText.trim()}
              variant="secondary"
            />

            {/* Conta — e-mail vinculado + sair. */}
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={styles.sectionSpacing}>
              CONTA
            </ThemedText>
            {email ? (
              <ThemedText type="small" themeColor="textSecondary">
                Conectado como {email}
              </ThemedText>
            ) : null}
            <PrimaryButton
              title="Sair da conta"
              onPress={handleLogout}
              variant="secondary"
            />
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
  },
  sectionSpacing: { marginTop: Spacing.three },
  importInput: { minHeight: 80, textAlignVertical: 'top' },
  historyCard: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  historyDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
});

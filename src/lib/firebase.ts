/**
 * Inicialização do Firebase (React Native Firebase — API modular).
 *
 * O app padrão é auto-inicializado pelo SDK nativo a partir dos arquivos
 * de configuração (google-services.json / GoogleService-Info.plist).
 * Ver SETUP.md para gerar esses arquivos.
 *
 * A persistência offline do Firestore é habilitada por padrão no
 * iOS/Android — é o que dá o comportamento "offline-first" (§2).
 */
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

export const app = getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

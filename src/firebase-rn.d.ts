import type { Persistence } from '@firebase/auth';

// Le fichier de types par défaut de @firebase/auth n'expose pas l'API React Native
// (elle existe bien à l'exécution via la condition "react-native" de Metro).
declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}

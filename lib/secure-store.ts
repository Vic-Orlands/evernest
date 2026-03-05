import * as SecureStore from "expo-secure-store";

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: "evernest.secure",
  requireAuthentication: false
};

export async function secureSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, SECURE_OPTIONS);
}

export async function secureGet(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key, SECURE_OPTIONS);
}

export async function secureDelete(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, SECURE_OPTIONS);
}

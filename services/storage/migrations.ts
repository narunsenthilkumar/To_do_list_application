import { StorageAdapter } from './storageAdapter';

export const CURRENT_SCHEMA_VERSION = 1;
const SCHEMA_VERSION_KEY = '@taskora_schema_version';

export async function runStorageMigrations(): Promise<void> {
  const version = await StorageAdapter.getItem<number>(SCHEMA_VERSION_KEY);
  if (version === null) {
    // Fresh install or v1 setup
    await StorageAdapter.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
    return;
  }

  if (version < CURRENT_SCHEMA_VERSION) {
    // Perform migration steps here when schema version increases
    await StorageAdapter.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
  }
}

const databaseName = 'ballondor-hall-preview';
const storeName = 'artwork';

type DemoArtwork = { key: string; blob: Blob; version: string };
const cachedUrls = new Map<string, { version: string; url: string }>();

export const demoArtworkKey = (editionId: string, categoryId: string) =>
  `${editionId}:${categoryId}`;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('A prévia de imagens não está disponível neste navegador.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir a prévia.'));
  });
}

export async function getDemoArtworkUrls(): Promise<Map<string, string>> {
  const database = await openDatabase();
  const records = await new Promise<DemoArtwork[]>((resolve, reject) => {
    const request = database.transaction(storeName).objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as DemoArtwork[]);
    request.onerror = () => reject(request.error ?? new Error('Não foi possível carregar as artes.'));
  }).finally(() => database.close());

  const currentKeys = new Set(records.map((record) => record.key));
  for (const [key, cached] of cachedUrls) {
    if (!currentKeys.has(key)) {
      URL.revokeObjectURL(cached.url);
      cachedUrls.delete(key);
    }
  }
  return new Map(
    records.map((record) => {
      let cached = cachedUrls.get(record.key);
      if (!cached || cached.version !== record.version) {
        if (cached) URL.revokeObjectURL(cached.url);
        cached = { version: record.version, url: URL.createObjectURL(record.blob) };
        cachedUrls.set(record.key, cached);
      }
      return [record.key, cached.url];
    }),
  );
}

export async function saveDemoArtwork(editionId: string, categoryId: string, file: File) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put({
      key: demoArtworkKey(editionId, categoryId),
      blob: file,
      version: crypto.randomUUID(),
    } satisfies DemoArtwork);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível salvar a arte.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Não foi possível salvar a arte.'));
  }).finally(() => database.close());
}

export async function removeDemoArtwork(editionId: string, categoryId: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(demoArtworkKey(editionId, categoryId));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível remover a arte.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Não foi possível remover a arte.'));
  }).finally(() => database.close());
}

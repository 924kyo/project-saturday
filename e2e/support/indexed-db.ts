import type { Page } from '@playwright/test';

export const APP_DATABASE_NAME = 'project-saturday';

export async function readIndexedDbValue<T>(
  page: Page,
  storeName: string,
  recordId: string,
): Promise<T | undefined> {
  const value = await page.evaluate(
    ({ databaseName, id, store }) =>
      new Promise<unknown>((resolve, reject) => {
        let database: IDBDatabase | undefined;
        let settled = false;

        const close = (): void => {
          database?.close();
          database = undefined;
        };
        const fail = (reason: unknown): void => {
          if (settled) {
            return;
          }
          settled = true;
          close();
          reject(reason instanceof Error ? reason : new Error(String(reason)));
        };
        const succeed = (result: unknown): void => {
          if (settled) {
            return;
          }
          settled = true;
          close();
          resolve(result);
        };

        const openRequest = indexedDB.open(databaseName);
        openRequest.onerror = () => fail(openRequest.error ?? new Error('indexeddb.open_failed'));
        openRequest.onblocked = () => fail(new Error('indexeddb.open_blocked'));
        openRequest.onupgradeneeded = () => {
          openRequest.transaction?.abort();
          fail(new Error('indexeddb.database_not_initialized'));
        };
        openRequest.onsuccess = () => {
          database = openRequest.result;

          let transaction: IDBTransaction;
          try {
            transaction = database.transaction(store, 'readonly');
          } catch (error) {
            fail(error);
            return;
          }

          transaction.onabort = () =>
            fail(transaction.error ?? new Error('indexeddb.transaction_aborted'));
          transaction.onerror = () =>
            fail(transaction.error ?? new Error('indexeddb.transaction_failed'));

          let getRequest: IDBRequest;
          try {
            getRequest = transaction.objectStore(store).get(id);
          } catch (error) {
            fail(error);
            return;
          }

          getRequest.onerror = () =>
            fail(getRequest.error ?? new Error('indexeddb.record_read_failed'));
          getRequest.onsuccess = () => {
            const record = getRequest.result as { value?: unknown } | undefined;
            succeed(record?.value);
          };
        };
      }),
    { databaseName: APP_DATABASE_NAME, id: recordId, store: storeName },
  );

  return value as T | undefined;
}

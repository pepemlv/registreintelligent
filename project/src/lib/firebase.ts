import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryConstraint,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDiKZp3n0Pedg1JjJ52skYBR5pXB0_g7tc',
  authDomain: 'documind-d081e.firebaseapp.com',
  projectId: 'documind-d081e',
  storageBucket: 'documind-d081e.firebasestorage.app',
  messagingSenderId: '442403228578',
  appId: '1:442403228578:web:17d59c4c2daeaf8eb3c0fb',
  measurementId: 'G-WEXC6EDKMS',
  databaseURL: 'https://documind-d081e-default-rtdb.firebaseio.com',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

void isSupported().then((supported) => supported && getAnalytics(firebaseApp));

type QueryResult<T = unknown> = { data: T[] | T | null; error: { message: string } | null };
type Filter = { field: string; operator: '==' | 'ilike'; value: unknown };
type Sort = { field: string; ascending: boolean };

const now = () => new Date().toISOString();
const withId = <T>(snapshotDoc: { id: string; data: () => Record<string, unknown> }) => ({
  id: snapshotDoc.id,
  ...snapshotDoc.data(),
}) as T;

class FirestoreBuilder<T = unknown> implements PromiseLike<QueryResult<T>> {
  private filters: Filter[] = [];
  private sorts: Sort[] = [];
  private payload: Partial<T> | Partial<T>[] | null = null;
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private wantsSingle = false;
  private maxResults: number | null = null;

  constructor(private readonly table: string) {}

  select(_fields?: string) {
    return this;
  }

  insert(payload: Partial<T> | Partial<T>[]) {
    this.mode = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Partial<T>) {
    this.mode = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ field, operator: '==', value });
    return this;
  }

  ilike(field: string, value: string) {
    this.filters.push({ field, operator: 'ilike', value: value.replace(/%/g, '').toLowerCase() });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.sorts.push({ field, ascending: options?.ascending ?? true });
    return this;
  }

  single() {
    this.wantsSingle = true;
    this.maxResults = 1;
    return this;
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private get ownerId() {
    return auth.currentUser?.uid ?? null;
  }

  /**
   * `id` is the Firestore document's path segment, not a stored field, so it can
   * never be matched with `where('id', '==', ...)`. Callers use `.eq('id', x)` to
   * mean "this specific document" (mirroring the Supabase-style API this class
   * imitates) — pull that out separately so lookups target the doc directly.
   */
  private get idFilterValue(): string | null {
    const match = this.filters.find((filter) => filter.field === 'id' && filter.operator === '==');
    return match ? String(match.value) : null;
  }

  private constraints() {
    const constraints: QueryConstraint[] = [];
    if (this.ownerId) constraints.push(where('owner_id', '==', this.ownerId));

    for (const filter of this.filters) {
      if (filter.field === 'id') continue;
      if (filter.operator === '==') constraints.push(where(filter.field, '==', filter.value));
    }
    if (this.maxResults) constraints.push(limit(this.maxResults));
    return constraints;
  }

  private normalizeRow(payload: Record<string, unknown>) {
    return {
      ...payload,
      owner_id: payload.owner_id ?? this.ownerId,
      created_at: payload.created_at ?? now(),
      updated_at: payload.updated_at ?? now(),
    };
  }

  private async fetchRows() {
    const snapshot = await getDocs(query(collection(db, this.table), ...this.constraints()));
    let rows = snapshot.docs.map((item) => withId<T>(item));
    const idValue = this.idFilterValue;
    if (idValue !== null) {
      rows = rows.filter((row) => String((row as Record<string, unknown>).id) === idValue);
    }
    for (const filter of this.filters.filter((item) => item.operator === 'ilike')) {
      rows = rows.filter((row) => String((row as Record<string, unknown>)[filter.field] ?? '').toLowerCase().includes(String(filter.value)));
    }
    for (const sort of [...this.sorts].reverse()) {
      rows = rows.sort((a, b) => {
        const left = String((a as Record<string, unknown>)[sort.field] ?? '');
        const right = String((b as Record<string, unknown>)[sort.field] ?? '');
        return sort.ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }
    return rows;
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      if (!this.ownerId) return { data: this.wantsSingle ? null : [], error: null };

      if (this.mode === 'insert') {
        const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
        const created = await Promise.all(
          payloads.filter(Boolean).map(async (payload) => {
            const ref = await addDoc(collection(db, this.table), this.normalizeRow(payload as Record<string, unknown>));
            return { id: ref.id, ...(payload as Record<string, unknown>) } as T;
          }),
        );
        return { data: this.wantsSingle ? created[0] ?? null : created, error: null };
      }

      if (this.mode === 'update' || this.mode === 'delete') {
        const idValue = this.idFilterValue;
        if (idValue !== null) {
          if (this.mode === 'delete') {
            await deleteDoc(doc(db, this.table, idValue));
            return { data: null, error: null };
          }
          await updateDoc(doc(db, this.table, idValue), { ...(this.payload as Record<string, unknown>), updated_at: now() });
          return { data: { id: idValue, ...(this.payload as object) } as T, error: null };
        }

        const rows = await this.fetchRows();
        await Promise.all(rows.map((row) => {
          const id = String((row as Record<string, unknown>).id);
          return this.mode === 'delete'
            ? deleteDoc(doc(db, this.table, id))
            : updateDoc(doc(db, this.table, id), { ...(this.payload as Record<string, unknown>), updated_at: now() });
        }));
        const data = this.mode === 'delete' ? null : (this.wantsSingle ? { ...rows[0], ...(this.payload as object) } as T : rows);
        return { data, error: null };
      }

      const rows = await this.fetchRows();
      return { data: this.wantsSingle ? rows[0] ?? null : rows, error: null };
    } catch (error) {
      return { data: this.wantsSingle ? null : [], error: { message: error instanceof Error ? error.message : 'Firebase request failed.' } };
    }
  }
}

export const firestore = {
  from<T = unknown>(table: string) {
    return new FirestoreBuilder<T>(table);
  },
  channel(name: string) {
    return {
      on: (..._args: unknown[]) => ({ subscribe: () => ({ name }) }),
      subscribe: () => ({ name }),
    };
  },
  removeChannel: (..._args: unknown[]) => undefined,
};

export function subscribeToTable<T>(table: string, callback: (rows: T[]) => void, sort?: Sort) {
  const ownerId = auth.currentUser?.uid;
  if (!ownerId) return () => undefined;
  const constraints: QueryConstraint[] = [where('owner_id', '==', ownerId)];
  if (sort) constraints.push(orderBy(sort.field, sort.ascending ? 'asc' : 'desc'));
  return onSnapshot(query(collection(db, table), ...constraints), (snapshot) => callback(snapshot.docs.map((item) => withId<T>(item))));
}

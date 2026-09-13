import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  QueryConstraint,
  or,
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
// The SDK's default retry window is up to 2 minutes on a blocked/failing upload (e.g. a
// permission or CORS rejection), during which the UI has nothing to show — cap it so a
// real failure surfaces in a few seconds instead of leaving the user staring at a stuck screen.
storage.maxUploadRetryTime = 10_000;
storage.maxOperationRetryTime = 10_000;

void isSupported().then((supported) => supported && getAnalytics(firebaseApp));

type QueryResult<T = unknown> = { data: T[] | T | null; error: { message: string } | null };
type Filter = { field: string; operator: '==' | 'ilike'; value: unknown };
type Sort = { field: string; ascending: boolean };
export type ActiveCompanyContext = { id: string; name: string } | null;

const now = () => new Date().toISOString();
/** Firestore rejects a whole write if any field is `undefined` (an unset optional object
 * property produces exactly that) — drop such keys instead of failing the write silently. */
function stripUndefined<T extends Record<string, unknown>>(row: T): T {
  const clean = { ...row };
  for (const key of Object.keys(clean)) {
    if (clean[key] === undefined) delete clean[key];
  }
  return clean;
}
let activeCompanyContext: ActiveCompanyContext = null;
const companyScopedTables = new Set(['documents', 'folders', 'notes', 'comments', 'reminders', 'actions', 'profiles', 'tasks', 'notifications', 'projects', 'reports']);
/** Directory-style tables meant to be browsed across companies (the B2B network directory
 * and its product catalogs) — reads aren't scoped to the caller's own rows; callers filter
 * explicitly (e.g. `.eq('company_id', targetCompanyId)`) when they want a specific company. */
const openReadTables = new Set(['companies', 'products', 'profiles', 'rfqs']);
const participantScopedTables = new Set(['institution_collaborations']);

export function setActiveCompanyContext(company: ActiveCompanyContext) {
  activeCompanyContext = company;
  if (company) localStorage.setItem('registreIntelligentCompanyName', company.name);
}

export function getActiveCompanyContext() {
  return activeCompanyContext;
}
const chars = (...codes: number[]) => String.fromCodePoint(...codes);
const mojibakeReplacements: Array<[string, string]> = [
  [chars(0x00c3, 0x2030), chars(0x00c9)],
  [chars(0x00c3, 0x20ac), chars(0x00c0)],
  [chars(0x00c3, 0x2021), chars(0x00c7)],
  [chars(0x00c3, 0x201a), chars(0x00c2)],
  [chars(0x00c3, 0x0160), chars(0x00ca)],
  [chars(0x00c3, 0x017d), chars(0x00ce)],
  [chars(0x00c3, 0x201d), chars(0x00d4)],
  [chars(0x00c3, 0x203a), chars(0x00db)],
  [chars(0x00c3, 0x00a9), chars(0x00e9)],
  [chars(0x00c3, 0x00a8), chars(0x00e8)],
  [chars(0x00c3, 0x00aa), chars(0x00ea)],
  [chars(0x00c3, 0x00ab), chars(0x00eb)],
  [chars(0x00c3, 0x00a0), chars(0x00e0)],
  [chars(0x00c3, 0x00a2), chars(0x00e2)],
  [chars(0x00c3, 0x00a7), chars(0x00e7)],
  [chars(0x00c3, 0x00ae), chars(0x00ee)],
  [chars(0x00c3, 0x00af), chars(0x00ef)],
  [chars(0x00c3, 0x00b4), chars(0x00f4)],
  [chars(0x00c3, 0x00b9), chars(0x00f9)],
  [chars(0x00c3, 0x00bb), chars(0x00fb)],
  [chars(0x00c2, 0x00b0), chars(0x00b0)],
  [chars(0x00c2, 0x00b7), chars(0x00b7)],
  [chars(0x00c2, 0x00ab), chars(0x00ab)],
  [chars(0x00c2, 0x00bb), chars(0x00bb)],
  [chars(0x00c2, 0x00a0), ' '],
  [chars(0x00e2, 0x20ac, 0x00a2), chars(0x2022)],
  [chars(0x00e2, 0x20ac, 0x201d), chars(0x2014)],
  [chars(0x00e2, 0x20ac, 0x201c), chars(0x2013)],
  [chars(0x00e2, 0x20ac, 0x02dc), chars(0x2018)],
  [chars(0x00e2, 0x20ac, 0x2122), chars(0x2019)],
  [chars(0x00e2, 0x20ac, 0x0153), chars(0x201c)],
  [chars(0x00e2, 0x20ac, 0x009d), chars(0x201d)],
  [chars(0x00e2, 0x20ac, 0x00a6), chars(0x2026)],
  [chars(0x00e2, 0x201a, 0x00ac), chars(0x20ac)],
];

function repairTextEncoding(value: string) {
  return mojibakeReplacements.reduce((text, [broken, fixed]) => text.replaceAll(broken, fixed), value);
}

function repairFirestoreText<T>(value: T): T {
  if (typeof value === 'string') return repairTextEncoding(value) as T;
  if (Array.isArray(value)) return value.map((item) => repairFirestoreText(item)) as T;
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, repairFirestoreText(item)]),
    ) as T;
  }
  return value;
}

const withId = <T>(snapshotDoc: { id: string; data: () => Record<string, unknown> }) => ({
  id: snapshotDoc.id,
  ...repairFirestoreText(snapshotDoc.data()),
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

  private get companyId() {
    return companyScopedTables.has(this.table) ? activeCompanyContext?.id ?? null : null;
  }

  /**
   * `id` is the Firestore document's path segment, not a stored field, so it can
   * never be matched with `where('id', '==', ...)`. Callers use `.eq('id', x)` to
   * mean "this specific document" (mirroring the Supabase-style API this class
   * imitates) â€” pull that out separately so lookups target the doc directly.
   */
  private get idFilterValue(): string | null {
    const match = this.filters.find((filter) => filter.field === 'id' && filter.operator === '==');
    return match ? String(match.value) : null;
  }

  private constraints() {
    const constraints: QueryConstraint[] = [];
    if (participantScopedTables.has(this.table)) {
      if (activeCompanyContext?.id) {
        constraints.push(or(
          where('requester_company_id', '==', activeCompanyContext.id),
          where('target_company_id', '==', activeCompanyContext.id),
        ) as unknown as QueryConstraint);
      } else if (this.ownerId) {
        constraints.push(where('requester_uid', '==', this.ownerId));
      }
    } else if (!openReadTables.has(this.table)) {
      if (this.companyId) constraints.push(where('company_id', '==', this.companyId));
      else if (this.ownerId) constraints.push(where('owner_id', '==', this.ownerId));
    }

    for (const filter of this.filters) {
      if (filter.field === 'id') continue;
      if (filter.operator === '==') constraints.push(where(filter.field, '==', filter.value));
    }
    if (this.maxResults) constraints.push(limit(this.maxResults));
    return constraints;
  }

  private normalizeRow(payload: Record<string, unknown>) {
    const row: Record<string, unknown> = {
      ...payload,
      owner_id: payload.owner_id ?? this.ownerId,
      created_at: payload.created_at ?? now(),
      updated_at: payload.updated_at ?? now(),
    };
    const companyId = payload.company_id ?? this.companyId;
    if (companyId) row.company_id = companyId;
    return stripUndefined(row);
  }

  private async fetchRows() {
    const idValue = this.idFilterValue;
    let rows: T[];
    if (idValue !== null) {
      // Fetch the document directly instead of running `limit()` over the whole collection and
      // filtering by id afterward — that order let `.select().eq('id', x).single()` silently
      // return an unrelated document (whichever one Firestore's default ordering put first).
      const snapshot = await getDoc(doc(db, this.table, idValue));
      rows = snapshot.exists() ? [withId<T>(snapshot)] : [];
    } else {
      const snapshot = await getDocs(query(collection(db, this.table), ...this.constraints()));
      rows = snapshot.docs.map((item) => withId<T>(item));
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
      if (!this.ownerId && !openReadTables.has(this.table)) return { data: this.wantsSingle ? null : [], error: null };

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
          await updateDoc(doc(db, this.table, idValue), stripUndefined({ ...(this.payload as Record<string, unknown>), updated_at: now() }));
          return { data: { id: idValue, ...(this.payload as object) } as T, error: null };
        }

        const rows = await this.fetchRows();
        await Promise.all(rows.map((row) => {
          const id = String((row as Record<string, unknown>).id);
          return this.mode === 'delete'
            ? deleteDoc(doc(db, this.table, id))
            : updateDoc(doc(db, this.table, id), stripUndefined({ ...(this.payload as Record<string, unknown>), updated_at: now() }));
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
  const companyId = companyScopedTables.has(table) ? activeCompanyContext?.id ?? null : null;
  const constraints: QueryConstraint[] = [companyId ? where('company_id', '==', companyId) : where('owner_id', '==', ownerId)];
  if (sort) constraints.push(orderBy(sort.field, sort.ascending ? 'asc' : 'desc'));
  return onSnapshot(query(collection(db, table), ...constraints), (snapshot) => callback(snapshot.docs.map((item) => withId<T>(item))));
}

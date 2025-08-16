export interface StorageInterface<T> {
  save(items: T[]): void;
  get(): T[];
  append(items: T[]): T[];
  replace(items: T[]): void;
  remove(id: string): boolean;
  clear(): void;
  has(): boolean;
  count(): number;
  findById(id: string): T | undefined;
}

export interface ImportResult {
  success: boolean;
  count: number;
  error?: string;
}

export interface StorageInfo {
  size: number;
  isNearLimit: boolean;
}
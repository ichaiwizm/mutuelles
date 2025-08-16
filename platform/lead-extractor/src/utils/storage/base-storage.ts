import type { StorageInterface, StorageInfo } from './storage-interface';

export abstract class BaseStorage<T> implements StorageInterface<T> {
  protected readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  /**
   * Sauvegarde les éléments dans le localStorage
   */
  save(items: T[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(items));
      this.onSave?.(items.length);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw new Error('Impossible de sauvegarder dans le localStorage');
    }
  }

  /**
   * Récupère les éléments depuis le localStorage
   */
  get(): T[] {
    try {
      const stored = localStorage.getItem(this.key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération:', error);
      return [];
    }
  }

  /**
   * Ajoute de nouveaux éléments aux existants
   */
  append(items: T[]): T[] {
    const existing = this.get();
    const combined = [...existing, ...items];
    this.save(combined);
    return combined;
  }

  /**
   * Remplace les éléments existants
   */
  replace(items: T[]): void {
    this.save(items);
  }

  /**
   * Supprime un élément par son ID
   */
  remove(id: string): boolean {
    const items = this.get();
    const filtered = items.filter(item => this.getId(item) !== id);
    
    if (filtered.length < items.length) {
      this.save(filtered);
      return true;
    }
    
    return false;
  }

  /**
   * Supprime tous les éléments
   */
  clear(): void {
    localStorage.removeItem(this.key);
    this.onClear?.();
  }

  /**
   * Vérifie si des éléments existent
   */
  has(): boolean {
    return this.get().length > 0;
  }

  /**
   * Obtient le nombre d'éléments stockés
   */
  count(): number {
    return this.get().length;
  }

  /**
   * Recherche un élément par ID
   */
  findById(id: string): T | undefined {
    const items = this.get();
    return items.find(item => this.getId(item) === id);
  }

  /**
   * Obtient la taille utilisée dans le localStorage (en bytes)
   */
  getStorageSize(): number {
    const data = localStorage.getItem(this.key) || '';
    return new Blob([data]).size;
  }

  /**
   * Vérifie si le localStorage est proche de sa limite
   */
  isStorageNearLimit(): boolean {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const currentSize = this.getStorageSize();
    return currentSize > MAX_SIZE * 0.9; // Alerte à 90%
  }

  /**
   * Obtient les informations de stockage
   */
  getStorageInfo(): StorageInfo {
    return {
      size: this.getStorageSize(),
      isNearLimit: this.isStorageNearLimit()
    };
  }

  // Méthodes abstraites à implémenter
  protected abstract getId(item: T): string;
  protected abstract validateItem(item: any): item is T;

  // Callbacks optionnels
  protected onSave?(count: number): void;
  protected onClear?(): void;
}
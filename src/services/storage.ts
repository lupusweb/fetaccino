import { QueueItem } from '../domain/business';

export const storageService = {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] !== undefined ? result[key] : null);
      });
    });
  },
  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },
  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  },
  
  // Queue-specific helpers
  async getQueue(): Promise<QueueItem[]> {
    const data = await this.get<QueueItem[]>('candidateQueue');
    return data || [];
  },
  
  async saveQueue(queue: QueueItem[]): Promise<void> {
    await this.set('candidateQueue', queue);
  },
  
  async addToQueue(item: QueueItem): Promise<void> {
    const queue = await this.getQueue();
    const existingIndex = queue.findIndex(q => q.id === item.id);
    if (existingIndex >= 0) {
      queue[existingIndex] = item; // Update existing
    } else {
      queue.push(item);
    }
    await this.saveQueue(queue);
  },
  
  async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    const newQueue = queue.filter(q => q.id !== id);
    await this.saveQueue(newQueue);
  },
  
  async clearQueue(): Promise<void> {
    await this.remove('candidateQueue');
  }
};

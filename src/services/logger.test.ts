import { describe, it, expect, vi } from 'vitest';
import { logger } from './logger';

describe('Logger Service', () => {
  it('should call console.log on info', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test info message');
    consoleSpy.mockRestore();
  });

  it('should call console.warn on warn', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    logger.warn('Test warn message');
    expect(consoleSpy).toHaveBeenCalledWith('[WARN] Test warn message');
    consoleSpy.mockRestore();
  });

  it('should call console.error on error', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    logger.error('Test error message');
    expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    consoleSpy.mockRestore();
  });
});

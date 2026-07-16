import { describe, expect, it } from '@jest/globals';
import { parseDecimal } from '@/lib/number';

describe('parseDecimal', () => {
  it('aceita vírgula pt-BR e ponto', () => {
    expect(parseDecimal('78,5')).toBe(78.5);
    expect(parseDecimal('78.5')).toBe(78.5);
  });
  it('apara espaços e aceita zero', () => {
    expect(parseDecimal('  12 ')).toBe(12);
    expect(parseDecimal('0')).toBe(0);
  });
  it('retorna null para vazio ou inválido', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
});

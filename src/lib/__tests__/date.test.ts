import { describe, expect, it } from '@jest/globals';
import { formatISODate, maskTime, timeToMinutes, todayISO } from '@/lib/date';

describe('maskTime', () => {
  it.each([
    ['', ''],
    ['8', '8'],
    ['83', '08:3'], // 83 não é hora válida → desloca p/ 08:3
    ['830', '08:30'],
    ['8300', '08:30'],
    ['1230', '12:30'],
    ['0700', '07:00'],
    ['2359', '23:59'],
    ['1275', '12:59'], // minuto > 59 é limitado
    ['00', '00'],
    ['23', '23'],
  ])('mascara %s → %s', (input, expected) => {
    expect(maskTime(input)).toBe(expected);
  });

  it('ignora não-dígitos', () => {
    expect(maskTime('a8b3c0')).toBe('08:30');
  });
});

describe('timeToMinutes', () => {
  it('converte HH:MM em minutos', () => {
    expect(timeToMinutes('07:00')).toBe(420);
    expect(timeToMinutes('12:30')).toBe(750);
    expect(timeToMinutes('23:59')).toBe(1439);
  });
  it('sem valor válido → infinito (ordena por último)', () => {
    expect(timeToMinutes(undefined)).toBe(Number.POSITIVE_INFINITY);
    expect(timeToMinutes('')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('todayISO / formatISODate', () => {
  it('formata data local YYYY-MM-DD', () => {
    expect(todayISO(new Date(2026, 6, 15))).toBe('2026-07-15');
    expect(todayISO(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
  it('formata para exibição pt-BR', () => {
    expect(formatISODate('2026-07-15')).toBe('15/07/2026');
    expect(formatISODate('invalid')).toBe('invalid');
  });
});

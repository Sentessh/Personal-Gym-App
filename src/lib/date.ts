/**
 * Utilitários de data. Usamos SEMPRE a data local no formato `YYYY-MM-DD`
 * (nunca timestamp UTC) como id/campo de dia — evita o bug de virada de
 * fuso horário do R8 (§6).
 */

/** Timestamp atual (epoch ms). Centralizado aqui para uso fora de repositórios. */
export function now(): number {
  return Date.now();
}

/** Data local de hoje (ou de `d`) como `YYYY-MM-DD`. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formata `YYYY-MM-DD` para exibição pt-BR (`DD/MM/YYYY`). */
export function formatISODate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/**
 * Máscara de horário `HH:MM` enquanto o usuário digita. Aceita só dígitos,
 * insere o `:` e limita hora a 23 e minuto a 59. Permite apagar naturalmente.
 *
 * Se os dois primeiros dígitos não formarem uma hora válida (ex.: "83"), o
 * primeiro é tratado como hora de um dígito (→ "08:3…"), então "830" vira
 * "08:30" em vez de ser cortado.
 */
export function maskTime(text: string): string {
  let digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';
  // "83:.." não é hora válida → desloca: o 1º dígito vira a hora "0X".
  if (digits.length >= 2 && parseInt(digits.slice(0, 2), 10) > 23) {
    digits = `0${digits}`.slice(0, 4);
  }
  if (digits.length <= 2) return digits;
  const hh = digits.slice(0, 2);
  let mm = digits.slice(2);
  if (parseInt(mm, 10) > 59) mm = '59';
  return `${hh}:${mm}`;
}

/** Converte `HH:MM` em minutos desde 00:00; sem valor válido → +∞ (ordena por último). */
export function timeToMinutes(t?: string): number {
  if (!t) return Number.POSITIVE_INFINITY;
  const [h, m] = t.split(':');
  const hh = parseInt(h, 10);
  if (Number.isNaN(hh)) return Number.POSITIVE_INFINITY;
  const mm = parseInt(m ?? '0', 10);
  return hh * 60 + (Number.isNaN(mm) ? 0 : mm);
}

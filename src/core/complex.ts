export interface Complex { re: number; im: number }

export const cx = (re: number, im = 0): Complex => ({ re, im })
export const add = (a: Complex, b: Complex): Complex => cx(a.re + b.re, a.im + b.im)
export const sub = (a: Complex, b: Complex): Complex => cx(a.re - b.re, a.im - b.im)
export const mul = (a: Complex, b: Complex): Complex =>
  cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
export const div = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d)
}
export const scale = (a: Complex, k: number): Complex => cx(a.re * k, a.im * k)
export const conj = (a: Complex): Complex => cx(a.re, -a.im)
export const abs = (a: Complex): number => Math.hypot(a.re, a.im)
export const arg = (a: Complex): number => Math.atan2(a.im, a.re)

import { describe, expect, test } from 'vitest'
import { abs, add, arg, conj, cx, div, mul, scale, sub } from './complex'

describe('complex arithmetic', () => {
  test('cx defaults imaginary part to 0', () => { expect(cx(3)).toEqual({ re: 3, im: 0 }) })
  test('add / sub', () => {
    expect(add(cx(1, 2), cx(3, -5))).toEqual({ re: 4, im: -3 })
    expect(sub(cx(1, 2), cx(3, -5))).toEqual({ re: -2, im: 7 })
  })
  test('mul: (1+2j)(3+4j) = -5+10j', () => { expect(mul(cx(1, 2), cx(3, 4))).toEqual({ re: -5, im: 10 }) })
  test('div: z/z = 1', () => {
    const q = div(cx(2, 7), cx(2, 7))
    expect(q.re).toBeCloseTo(1, 12); expect(q.im).toBeCloseTo(0, 12)
  })
  test('scale, conj', () => {
    expect(scale(cx(1, -2), 3)).toEqual({ re: 3, im: -6 })
    expect(conj(cx(1, -2))).toEqual({ re: 1, im: 2 })
  })
  test('abs, arg of 3+4j', () => {
    expect(abs(cx(3, 4))).toBeCloseTo(5, 12)
    expect(arg(cx(0, 1))).toBeCloseTo(Math.PI / 2, 12)
  })
})

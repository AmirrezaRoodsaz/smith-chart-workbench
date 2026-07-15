import { describe, expect, test } from 'vitest'
import { gridPathR, gridPathX, gridValues, pathFrom } from './geometry'
import { cx } from '../core/complex'

describe('chart geometry', () => {
  test('pathFrom flips im to SVG y', () => {
    expect(pathFrom([cx(0.5, 0.5), cx(1, 0)])).toBe('M0.50000 -0.50000L1.00000 0.00000')
  })
  test('r=0 circle points lie on the unit circle', () => {
    const d = gridPathR(0, 16)
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number)
    for (let i = 0; i < nums.length; i += 2) {
      expect(Math.hypot(nums[i], nums[i + 1])).toBeCloseTo(1, 3)
    }
  })
  test('r=1 circle passes through chart center', () => {
    const d = gridPathR(1, 256)
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number)
    const minDist = Math.min(...Array.from({ length: nums.length / 2 },
      (_, i) => Math.hypot(nums[2 * i], nums[2 * i + 1])))
    expect(minDist).toBeLessThan(0.02)
  })
  test('x arcs end at Γ=(1,0); positive x stays in upper half (SVG y ≤ 0)', () => {
    const d = gridPathX(1, 64)
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number)
    expect(nums[nums.length - 2]).toBeCloseTo(1, 3)
    expect(nums[nums.length - 1]).toBeCloseTo(0, 3)
    for (let i = 1; i < nums.length; i += 2) expect(nums[i]).toBeLessThanOrEqual(1e-9)
  })
  test('gridValues densifies when zoomed in', () => {
    const base = gridValues(2.2)
    const fine = gridValues(0.2)
    expect(fine.r.length).toBeGreaterThan(base.r.length)
    expect(base.r).toContain(1)
    expect(base.x.some((v) => v < 0)).toBe(true)
  })
})

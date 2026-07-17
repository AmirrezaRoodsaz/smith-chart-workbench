import { describe, expect, test } from 'vitest'
import { qArcPath, rulerTicks, vswrRadius, Q_VALUES, VSWR_VALUES } from './overlays'

describe('overlays', () => {
  test('vswrRadius: S=1 → 0 (center), S=3 → 0.5, S→∞ → →1', () => {
    expect(vswrRadius(1)).toBe(0)
    expect(vswrRadius(3)).toBeCloseTo(0.5, 12)
    expect(vswrRadius(1e9)).toBeCloseTo(1, 6)
  })
  test('constant value lists', () => {
    expect(VSWR_VALUES).toContain(2)
    expect(Q_VALUES).toContain(1)
  })
  test('Q arc starts at Γ=-1 and ends at Γ=+1; sign selects half-plane', () => {
    const d = qArcPath(1, 1, 32)
    const nums = d.match(/-?\d+\.\d+/g)!.map(Number)
    expect(nums[0]).toBeCloseTo(-1, 3); expect(nums[1]).toBeCloseTo(0, 3)
    expect(nums[nums.length - 2]).toBeCloseTo(1, 3); expect(nums[nums.length - 1]).toBeCloseTo(0, 3)
    for (let i = 1; i < nums.length; i += 2) expect(nums[i]).toBeLessThanOrEqual(1e-9)   // upper half in SVG y
    const dn = qArcPath(1, -1, 32)
    const numsN = dn.match(/-?\d+\.\d+/g)!.map(Number)
    for (let i = 1; i < numsN.length; i += 2) expect(numsN[i]).toBeGreaterThanOrEqual(-1e-9)
  })
  test('ruler: 50 ticks, 0λ at (-1,0), 0.25λ at (+1,0), labels every 0.05λ', () => {
    const ticks = rulerTicks()
    expect(ticks).toHaveLength(50)
    expect(ticks[0].x1).toBeCloseTo(-1, 9); expect(ticks[0].y1).toBeCloseTo(0, 9)
    expect(ticks[0].label).toBe('0.00')
    const quarter = ticks[25]
    expect(quarter.x1).toBeCloseTo(1, 9); expect(quarter.y1).toBeCloseTo(0, 9)
    expect(quarter.label).toBe('0.25')
    expect(ticks.filter((t) => t.label).length).toBe(10)
    // clockwise: 0.125λ is at the top (SVG y negative)
    expect(ticks[12].y1).toBeLessThan(0)   // ticks[12] = 0.12λ, near top
  })
})

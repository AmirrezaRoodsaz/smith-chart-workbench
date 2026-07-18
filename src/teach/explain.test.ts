import { describe, expect, it } from 'vitest'
import { EXPLAIN } from './explain'

const KINDS = ['seriesL', 'seriesC', 'seriesR', 'shuntL', 'shuntC', 'shuntR', 'line', 'stubOpen', 'stubShort']

describe('explain registry', () => {
  it('covers every palette element', () => {
    for (const k of KINDS) expect(EXPLAIN[`el-${k}`], `el-${k}`).toBeDefined()
  })
  it('covers the core UI surfaces', () => {
    for (const id of ['chart', 'vswr-badge', 'toggle-vswr', 'toggle-q', 'toggle-ruler', 'grid-mode',
      'settings-load', 'settings-freq', 'settings-z0', 'automatch', 'strip', 'readout'])
      expect(EXPLAIN[id], id).toBeDefined()
  })
  it('every entry has a title and a real body (2+ sentences)', () => {
    for (const [id, e] of Object.entries(EXPLAIN)) {
      expect(e.title.length, id).toBeGreaterThan(2)
      expect(e.body.length, id).toBeGreaterThan(80)
      expect((e.body.match(/\./g) ?? []).length, id).toBeGreaterThanOrEqual(2)
    }
  })
})

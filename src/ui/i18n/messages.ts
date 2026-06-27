/**
 * Merged translation dictionaries. Each UI area contributes a small locale module
 * under ./locales/<area>.ts exporting `en` and `es` maps of namespaced keys
 * (e.g. 'deckBuilder.confirm'). They are spread into one flat dict per language so
 * the `t()` lookup is a single object access. Per-area files keep the strings near
 * their feature and let multiple areas be edited without collisions.
 */

import * as menu from './locales/menu'
import * as common from './locales/common'
import * as match from './locales/match'
import * as builder from './locales/builder'
import * as screens from './locales/screens'
import * as run from './locales/run'
import * as card from './locales/card'
import * as multiplayer from './locales/multiplayer'

export type Lang = 'en' | 'es'
export type Dict = Record<string, string>

// Add a new area module here to register its strings.
const parts: { en: Dict; es: Dict }[] = [menu, common, match, builder, screens, run, card, multiplayer]

export const messages: Record<Lang, Dict> = {
  en: Object.assign({}, ...parts.map((p) => p.en)),
  es: Object.assign({}, ...parts.map((p) => p.es)),
}

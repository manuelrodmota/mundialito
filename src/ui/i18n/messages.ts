/**
 * Merged translation dictionaries. Each UI area contributes a small locale module
 * under ./locales/<area>.ts exporting `en` and `es` maps of namespaced keys
 * (e.g. 'deckBuilder.confirm'). They are spread into one flat dict per language so
 * the `t()` lookup is a single object access. Per-area files keep the strings near
 * their feature and let multiple areas be edited without collisions.
 */

import * as menu from './locales/menu'
import * as common from './locales/common'

export type Lang = 'en' | 'es'
export type Dict = Record<string, string>

// Add a new area module here to register its strings.
const parts: { en: Dict; es: Dict }[] = [menu, common]

export const messages: Record<Lang, Dict> = {
  en: Object.assign({}, ...parts.map((p) => p.en)),
  es: Object.assign({}, ...parts.map((p) => p.es)),
}

// Pure helpers shared across composables and components.
// No reactive state, no I/O.

const PLUGIN_PACKAGE_RE = /^@koishijs\/plugin-[0-9a-z-]+$|(^|\/)koishi-plugin-[0-9a-z-]+$/
const BUNDLE_PACKAGE_RE = /^(?:@[0-9a-z-]+\/)?koishi-plugin-pa-[0-9a-z-]+$/

const SENSITIVE_KEY_RE = /(command|script|exec|path|token|secret|password|sql|url|webhook|key)/i

export function normalizePackageName(name = '') {
  return name.trim().toLowerCase()
}

export function shortname(name = '') {
  return name.toLowerCase().replace(/(koishi-|^@koishijs\/)plugin-/, '')
}

export function isPluginPackageName(name = '') {
  return PLUGIN_PACKAGE_RE.test(name)
}

export function isBundlePackageName(name = '') {
  return BUNDLE_PACKAGE_RE.test(name.trim())
}

export function defaultRange(version?: string) {
  if (!version) return '^1.0.0'
  return /^[0-9]+\.[0-9]+\.[0-9]+/.test(version) ? `^${version}` : version
}

export function createId() {
  return Math.random().toString(36).slice(2, 10)
}

export function cloneConfig(value: any): Record<string, any> {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith('$'))
    .map(([key, child]) => {
      if (Array.isArray(child)) return [key, child.map(item => cloneConfigValue(item))]
      if (child && typeof child === 'object') return [key, cloneConfig(child)]
      return [key, child]
    }))
}

export function cloneConfigValue(value: any): any {
  if (Array.isArray(value)) return value.map(item => cloneConfigValue(item))
  if (value && typeof value === 'object') return cloneConfig(value)
  return value
}

export function collectSensitiveKeys(value: any, prefix = '', output = new Set<string>()) {
  if (!value || typeof value !== 'object') return output
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (SENSITIVE_KEY_RE.test(key)) output.add(path)
    if (child && typeof child === 'object') collectSensitiveKeys(child, path, output)
  }
  return output
}

export function findExistingConfig(plugins: any, target: string): any {
  if (!plugins || typeof plugins !== 'object') return
  for (const key of Object.keys(plugins)) {
    if (key.startsWith('$')) continue
    const value = plugins[key]
    const [prefix] = key.split(':', 1)
    const normalized = prefix.replace(/^~/, '')
    if (normalized === target) return value
    const nested = findExistingConfig(value, target)
    if (nested) return nested
  }
}

export function parseKeywords(text: string) {
  return text
    .split(/[\s,，;；]+/g)
    .map(keyword => keyword.trim())
    .filter(Boolean)
}

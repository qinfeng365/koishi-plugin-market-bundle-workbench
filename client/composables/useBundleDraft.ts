import { computed, reactive, ref } from 'vue'
import { message, store } from '@koishijs/client'
import type { BundleManifestDraft } from '../../src/shared'
import {
  cloneConfig,
  collectSensitiveKeys,
  createId,
  defaultRange,
  findExistingConfig,
  isBundlePackageName,
  isPluginPackageName,
  normalizePackageName,
  parseKeywords,
  shortname,
} from './helpers'

export interface MemberView {
  id: string
  package: string
  plugin: string
  version: string
  required: boolean
  configText: string
  configObject: Record<string, any>
  configError?: string
  autoPlugin: boolean
}

function packagesIndex() {
  return ((store as any).packages ?? {}) as Record<string, any>
}

function marketIndex() {
  return ((store as any).market?.data ?? {}) as Record<string, any>
}

export function useBundleDraft() {
  const draft = reactive({
    packageName: 'koishi-plugin-pa-demo',
    version: '0.1.0-alpha.0',
    label: '',
    description: '',
    distTag: 'alpha',
  })
  const members = reactive<MemberView[]>([])
  const keywordsText = ref('koishi, plugin, market:package')
  const projectPath = ref('')

  const packageNameOk = computed(() => isBundlePackageName(draft.packageName))
  const presetCount = computed(() => members.filter(hasPresetConfig).length)

  const installedOptions = computed(() => {
    return Object.values(packagesIndex())
      .filter((item: any) => isPluginPackageName(item?.package?.name))
      .sort((a: any, b: any) => a.package.name.localeCompare(b.package.name))
      .map((item: any) => ({
        name: item.package.name,
        label: `${item.package.name}@${item.package.version}`,
      }))
  })

  function packageInfo(name: string): any {
    return packagesIndex()[normalizePackageName(name)]
  }

  function marketInfo(name: string): any {
    return marketIndex()[normalizePackageName(name)]
  }

  function runtimeSchema(member: MemberView) {
    return packageInfo(member.package)?.runtime?.schema
  }

  function hasPresetConfig(member: MemberView) {
    return !!member.configObject && Object.keys(member.configObject).length > 0
  }

  function sensitiveKeys(member: MemberView) {
    return [...collectSensitiveKeys(member.configObject)].slice(0, 8)
  }

  function addMember(name: string, version?: string) {
    const packageName = normalizePackageName(name)
    if (!packageName) return
    if (members.some(member => member.package === packageName)) {
      message.warning('这个成员已经在列表中。')
      return
    }
    members.push({
      id: createId(),
      package: packageName,
      plugin: shortname(packageName),
      version: defaultRange(version ?? packageInfo(packageName)?.package?.version),
      required: true,
      configText: '{}',
      configObject: {},
      autoPlugin: true,
    })
  }

  function removeMember(index: number) {
    members.splice(index, 1)
  }

  function moveMember(index: number, offset: number) {
    const next = index + offset
    if (next < 0 || next >= members.length) return
    const [item] = members.splice(index, 1)
    members.splice(next, 0, item)
  }

  function syncPluginKey(member: MemberView) {
    if (member.autoPlugin || !member.plugin) {
      member.plugin = shortname(member.package)
      member.autoPlugin = true
    }
  }

  function updatePluginKey(member: MemberView, value: string) {
    member.plugin = value
    member.autoPlugin = value === shortname(member.package)
  }

  function setConfig(member: MemberView, config: Record<string, any>) {
    member.configObject = cloneConfig(config)
    member.configText = JSON.stringify(member.configObject, null, 2)
    member.configError = ''
  }

  function resetConfig(member: MemberView) {
    setConfig(member, {})
  }

  function updateConfigObject(member: MemberView, value: any) {
    member.configObject = cloneConfig(value)
    member.configText = JSON.stringify(member.configObject, null, 2)
    member.configError = ''
  }

  function syncConfigText(member: MemberView): boolean {
    try {
      const value = JSON.parse(member.configText || '{}')
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        member.configError = '预设配置必须是对象。'
        return false
      }
      member.configObject = cloneConfig(value)
      member.configText = JSON.stringify(member.configObject, null, 2)
      member.configError = ''
      message.success('已从 JSON 更新表单。')
      return true
    } catch (error) {
      member.configError = error instanceof Error ? error.message : String(error)
      return false
    }
  }

  function copyExistingConfig(member: MemberView) {
    const plugins = (store as any).config?.plugins
    const config = findExistingConfig(plugins, member.plugin) ?? findExistingConfig(plugins, member.package)
    if (!config) {
      message.warning('没有找到已有配置。')
      return
    }
    setConfig(member, cloneConfig(config))
  }

  function buildPayload(): BundleManifestDraft | undefined {
    const result: BundleManifestDraft = {
      ...draft,
      keywords: parseKeywords(keywordsText.value),
      members: [],
    }
    for (const [index, member] of members.entries()) {
      let config: any
      try {
        config = JSON.parse(member.configText || '{}')
      } catch {
        message.error(`第 ${index + 1} 个成员的预设配置不是合法 JSON。`)
        return
      }
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        message.error(`第 ${index + 1} 个成员的预设配置必须是对象。`)
        return
      }
      member.configObject = cloneConfig(config)
      member.configError = ''
      result.members.push({
        package: normalizePackageName(member.package),
        plugin: member.plugin.trim().toLowerCase(),
        version: member.version.trim(),
        required: member.required,
        config,
      })
    }
    return result
  }

  return {
    draft,
    members,
    keywordsText,
    projectPath,
    packageNameOk,
    presetCount,
    installedOptions,
    packageInfo,
    marketInfo,
    runtimeSchema,
    hasPresetConfig,
    sensitiveKeys,
    addMember,
    removeMember,
    moveMember,
    syncPluginKey,
    updatePluginKey,
    setConfig,
    resetConfig,
    updateConfigObject,
    syncConfigText,
    copyExistingConfig,
    buildPayload,
  }
}

export type BundleDraftApi = ReturnType<typeof useBundleDraft>

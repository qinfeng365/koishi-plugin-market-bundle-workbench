import { computed, reactive, ref, type Ref } from 'vue'
import { message, send } from '@koishijs/client'
import type {
  ArchiveType,
  BundleManifestDraft,
  DownloadArchiveResult,
  GenerateResult,
  PackDryRunResult,
  ValidationResult,
  WriteFilesResult,
} from '../../src/shared'

interface ActionsDeps {
  buildPayload: () => BundleManifestDraft | undefined
  projectPath: Ref<string>
}

export function useBundleActions(deps: ActionsDeps) {
  const validation = ref<ValidationResult>()
  const generated = ref<GenerateResult>()
  const writeResult = ref<WriteFilesResult>()
  const packResult = ref<PackDryRunResult>()
  const archiveResult = ref<DownloadArchiveResult>()

  const busy = reactive({
    validate: false,
    generate: false,
    pack: false,
    previewWrite: false,
    write: false,
    archive: '' as ArchiveType | '',
  })

  const errorCount = computed(() =>
    validation.value?.issues.filter(issue => issue.level === 'error').length ?? 0)
  const warningCount = computed(() =>
    validation.value?.issues.filter(issue => issue.level === 'warning').length ?? 0)
  const npmEntries = computed(() => Object.values(validation.value?.npm ?? {}))

  async function validate() {
    const payload = deps.buildPayload()
    if (!payload) return
    busy.validate = true
    try {
      validation.value = await send('bundle-workbench/validate', payload)
      if (validation.value.valid) message.success('校验通过。')
      else message.warning('校验完成,仍有问题需要处理。')
    } catch (error) {
      console.error(error)
      message.error('校验失败。')
    } finally {
      busy.validate = false
    }
  }

  async function generate() {
    const payload = deps.buildPayload()
    if (!payload) return
    busy.generate = true
    try {
      generated.value = await send('bundle-workbench/generate', payload)
      message.success('已生成插件包文件内容。')
    } catch (error) {
      console.error(error)
      message.error('生成失败。')
    } finally {
      busy.generate = false
    }
  }

  async function previewWrite(overwrite: boolean) {
    const payload = deps.buildPayload()
    if (!payload) return
    busy.previewWrite = true
    try {
      writeResult.value = await send('bundle-workbench/write-files', deps.projectPath.value, payload, {
        dryRun: true,
        overwrite,
      })
      if (writeResult.value.ok) message.success('写入预览通过。')
      else message.warning(writeResult.value.error || '写入预览完成,有文件会被跳过。')
    } catch (error) {
      console.error(error)
      message.error('写入预览失败。')
    } finally {
      busy.previewWrite = false
    }
  }

  async function writeToDisk(overwrite: boolean) {
    const payload = deps.buildPayload()
    if (!payload) return
    busy.write = true
    try {
      writeResult.value = await send('bundle-workbench/write-files', deps.projectPath.value, payload, {
        overwrite,
      })
      if (writeResult.value.ok) message.success('已写入插件包项目。')
      else message.warning(writeResult.value.error || '部分文件被跳过,开启覆盖后可重试。')
    } catch (error) {
      console.error(error)
      message.error('写入失败。')
    } finally {
      busy.write = false
    }
  }

  async function packDryRun() {
    busy.pack = true
    try {
      packResult.value = await send('bundle-workbench/pack-dry-run', deps.projectPath.value)
      if (packResult.value.ok) message.success('dry-run 通过。')
      else message.error('dry-run 失败。')
    } catch (error) {
      console.error(error)
      message.error('dry-run 调用失败。')
    } finally {
      busy.pack = false
    }
  }

  async function downloadArchive(type: ArchiveType) {
    const payload = deps.buildPayload()
    if (!payload) return
    busy.archive = type
    try {
      archiveResult.value = await send('bundle-workbench/download-archive', payload, type)
      const result = archiveResult.value
      if (!result.ok || !result.base64 || !result.filename) {
        message.error(result.error || '压缩包生成失败。')
        return
      }
      saveBase64File(result.base64, result.filename, result.mime)
      if (result.warnings?.length) {
        message.warning(`已下载,但仍有 ${result.warnings.length} 个警告需要留意。`)
      } else {
        message.success('压缩包已下载。')
      }
    } catch (error) {
      console.error(error)
      message.error('压缩包生成失败。')
    } finally {
      busy.archive = ''
    }
  }

  async function copyAll() {
    if (!generated.value) return
    const text = [
      '--- package.json ---',
      generated.value.packageJson,
      '--- koishi.bundle ---',
      generated.value.bundleJson,
      '--- lib/index.js ---',
      generated.value.libIndex,
      '--- README.md ---',
      generated.value.readme,
      '--- commands ---',
      generated.value.publishCommands.join('\n'),
    ].join('\n\n')
    await navigator.clipboard?.writeText(text)
    message.success('已复制生成结果。')
  }

  return {
    validation,
    generated,
    writeResult,
    packResult,
    archiveResult,
    busy,
    errorCount,
    warningCount,
    npmEntries,
    validate,
    generate,
    previewWrite,
    writeToDisk,
    packDryRun,
    downloadArchive,
    copyAll,
  }
}

function saveBase64File(base64: string, filename: string, mime = 'application/octet-stream') {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type BundleActionsApi = ReturnType<typeof useBundleActions>

import { Context, Dict, Logger, Schema } from 'koishi'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'
import { valid, validRange, maxSatisfying } from 'semver'
import spawn from 'execa'
import { strToU8, zipSync } from 'fflate'
import {} from '@koishijs/plugin-console'
import type {
  ArchiveType,
  BundleManifestDraft,
  DownloadArchiveResult,
  GenerateResult,
  NpmInfo,
  PackDryRunResult,
  ValidationResult,
  WorkbenchIssue,
  WriteFilesOptions,
  WriteFilesResult,
} from './shared'

export * from './shared'

declare module '@koishijs/console' {
  interface Events {
    'bundle-workbench/npm-info'(name: string): Promise<NpmInfo>
    'bundle-workbench/validate'(draft: BundleManifestDraft): Promise<ValidationResult>
    'bundle-workbench/generate'(draft: BundleManifestDraft): Promise<GenerateResult>
    'bundle-workbench/download-archive'(draft: BundleManifestDraft, type: ArchiveType): Promise<DownloadArchiveResult>
    'bundle-workbench/write-files'(projectPath: string, draft: BundleManifestDraft, options?: WriteFilesOptions): Promise<WriteFilesResult>
    'bundle-workbench/pack-dry-run'(projectPath: string): Promise<PackDryRunResult>
  }
}

export const name = 'market-bundle-workbench'
export const inject = ['http']

export interface Config {
  enableWorkbench?: boolean
  npmRegistry?: string
  defaultDistTag?: string
  allowPublishCommand?: boolean
}

export const Config: Schema<Config> = Schema.object({
  enableWorkbench: Schema.boolean().default(false).description('启用插件包制作工作台页面。'),
  npmRegistry: Schema.string().default('https://registry.npmjs.org').description('用于校验 npm 包信息的 registry。'),
  defaultDistTag: Schema.string().default('alpha').description('生成发布命令时默认使用的 dist-tag。'),
  allowPublishCommand: Schema.boolean().default(false).description('显示 npm publish 命令。第一版不会代为执行发布。'),
})

const logger = new Logger('bundle-workbench')
const BUNDLE_KEYWORD = 'market:package'
const BUNDLE_PACKAGE_RE = /^(?:@[0-9a-z-]+\/)?koishi-plugin-pa-[0-9a-z-]+$/
const PLUGIN_PACKAGE_RE = /^(?:@[^/]+\/)?koishi-plugin-[0-9a-z-]+$|^@koishijs\/plugin-[0-9a-z-]+$/
const PLUGIN_KEY_RE = /^(?:@[^/]+\/)?[0-9a-z][0-9a-z-]*(?:\/[0-9a-z][0-9a-z-]*)?$/

function normalizeRegistry(registry = 'https://registry.npmjs.org') {
  return registry.replace(/\/+$/, '')
}

function normalizeName(name = '') {
  return name.trim().toLowerCase()
}

function getShortname(name = '') {
  return name.replace(/(koishi-|^@koishijs\/)plugin-/, '')
}

function formatUser(user: any) {
  if (!user) return ''
  if (typeof user === 'string') return user
  return user.name || user.username || user.email || ''
}

function toArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
}

function createBundleManifest(draft: BundleManifestDraft) {
  return {
    label: draft.label || getShortname(draft.packageName),
    description: draft.description || undefined,
    members: (draft.members ?? []).map(member => ({
      package: normalizeName(member.package),
      plugin: normalizeName(member.plugin || getShortname(member.package)),
      version: member.version?.trim() || '',
      required: member.required !== false,
      config: member.config && Object.keys(member.config).length ? member.config : undefined,
    })),
  }
}

function createPackageJson(draft: BundleManifestDraft) {
  const members = draft.members ?? []
  const keywords = new Set([
    'koishi',
    'plugin',
    BUNDLE_KEYWORD,
    ...(draft.keywords ?? []),
  ].map(keyword => keyword.trim()).filter(Boolean))
  return {
    name: normalizeName(draft.packageName),
    version: draft.version?.trim() || '0.1.0',
    description: draft.description || draft.label || 'Koishi plugin bundle',
    main: 'lib/index.js',
    files: [
      'lib',
      'README.md',
    ],
    license: 'AGPL-3.0',
    keywords: [...keywords],
    koishi: {
      description: {
        zh: draft.description || draft.label || 'Koishi 插件包',
      },
      bundle: createBundleManifest(draft),
    },
    peerDependencies: {
      koishi: '^4.18.0',
      ...Object.fromEntries(members
        .filter(member => member.package && member.version)
        .map(member => [normalizeName(member.package), member.version.trim()])),
    },
    peerDependenciesMeta: Object.fromEntries(members
      .filter(member => member.package && member.required === false)
      .map(member => [normalizeName(member.package), { optional: true }])),
  }
}

function createLibIndex(draft: BundleManifestDraft) {
  const pluginName = normalizeName(draft.packageName).replace(/^(?:@[^/]+\/)?koishi-plugin-/, '')
  return [
    "'use strict'",
    '',
    `exports.name = ${JSON.stringify(pluginName)}`,
    '',
    'exports.apply = function apply() {',
    '  // This package is a Market NEXT plugin bundle manifest.',
    '  // Runtime behavior is provided by the bundle members.',
    '}',
    '',
  ].join('\n')
}

function createReadme(draft: BundleManifestDraft, packageJson: ReturnType<typeof createPackageJson>) {
  const bundle = createBundleManifest(draft)
  return [
    `# ${draft.label || packageJson.name}`,
    '',
    draft.description || 'Koishi plugin bundle.',
    '',
    '## Members',
    '',
    ...bundle.members.map(member => `- \`${member.package}\` \`${member.version}\`${member.required === false ? ' (optional)' : ''}`),
    '',
    '## Install',
    '',
    'Install this package from Koishi Market NEXT. Review member plugins and preset configs before enabling them.',
    '',
    '## Bundle Manifest',
    '',
    'This package declares `koishi.bundle` in `package.json` and is intended to be managed by Market NEXT.',
    '',
  ].join('\n')
}

function createGeneratedFiles(draft: BundleManifestDraft) {
  const packageJson = createPackageJson(draft)
  const bundleJson = createBundleManifest(draft)
  const libIndex = createLibIndex(draft)
  const readme = createReadme(draft, packageJson)
  return {
    packageJson,
    bundleJson,
    libIndex,
    readme,
    files: {
      'package.json': JSON.stringify(packageJson, null, 2) + '\n',
      'README.md': readme + '\n',
      'lib/index.js': libIndex,
    },
  }
}

function pushIssue(issues: WorkbenchIssue[], level: WorkbenchIssue['level'], message: string, path?: string) {
  issues.push({ level, message, path })
}

function encodePackageName(name: string) {
  return encodeURIComponent(name)
}

function createNpmPackFilename(packageJson: ReturnType<typeof createPackageJson>) {
  const name = packageJson.name.replace(/^@/, '').replace(/\//g, '-')
  return `${name}-${packageJson.version}.tgz`
}

function createSourceZipFilename(packageJson: ReturnType<typeof createPackageJson>) {
  const name = packageJson.name.replace(/^@/, '').replace(/\//g, '-')
  return `${name}-${packageJson.version}.zip`
}

function createPublishCommand(packageJson: ReturnType<typeof createPackageJson>, tag: string, filename?: string) {
  const target = filename ? ` ./${filename}` : ''
  return `npm publish${target} --tag ${tag}${packageJson.name.startsWith('@') ? ' --access public' : ''}`
}

async function writeGeneratedFiles(root: string, draft: BundleManifestDraft) {
  const generated = createGeneratedFiles(draft)
  for (const [path, content] of Object.entries(generated.files)) {
    const filename = resolve(root, path)
    await mkdir(dirname(filename), { recursive: true })
    await writeFile(filename, content)
  }
  return generated
}

export function apply(ctx: Context, config: Config = {}) {
  const registry = () => normalizeRegistry(config.npmRegistry)

  async function getNpmInfo(name: string): Promise<NpmInfo> {
    const normalized = normalizeName(name)
    if (!normalized) return { name, exists: false, error: 'empty package name' }
    try {
      const data = await ctx.http.get(`${registry()}/${encodePackageName(normalized)}`) as any
      const versions = Object.keys(data?.versions ?? {}).sort()
      return {
        name: normalized,
        exists: true,
        latest: data?.['dist-tags']?.latest,
        versions,
        description: data?.description,
        author: formatUser(data?.author),
        maintainers: toArray(data?.maintainers?.map?.(formatUser)),
        keywords: toArray(data?.keywords),
      }
    } catch (error) {
      const status = (error as any)?.response?.status
      return {
        name: normalized,
        exists: false,
        error: status === 404 ? 'not found' : error instanceof Error ? error.message : String(error),
      }
    }
  }

  async function validateDraft(draft: BundleManifestDraft): Promise<ValidationResult> {
    const issues: WorkbenchIssue[] = []
    const npm: Record<string, NpmInfo> = {}
    const packageName = normalizeName(draft.packageName)
    const version = draft.version?.trim()
    const keywords = draft.keywords ?? []
    const members = draft.members ?? []

    if (!packageName) pushIssue(issues, 'error', '包名不能为空。', 'packageName')
    else if (draft.packageName !== packageName) pushIssue(issues, 'error', '真实 npm 包名必须小写。', 'packageName')
    else if (!BUNDLE_PACKAGE_RE.test(packageName)) pushIssue(issues, 'error', '插件包包名必须是 koishi-plugin-pa-* 或 @scope/koishi-plugin-pa-*。', 'packageName')

    if (!version) pushIssue(issues, 'error', '版本号不能为空。', 'version')
    else if (!valid(version)) pushIssue(issues, 'error', '版本号必须是合法 semver。', 'version')

    if (!keywords.some(keyword => keyword.toLowerCase() === BUNDLE_KEYWORD)) {
      pushIssue(issues, 'warning', `建议添加 keyword "${BUNDLE_KEYWORD}"，便于市场显式识别插件包。`, 'keywords')
    }

    if (!members.length) pushIssue(issues, 'error', '至少需要一个成员插件。', 'members')

    if (packageName) {
      npm[packageName] = await getNpmInfo(packageName)
      if (npm[packageName].exists && version && npm[packageName].versions?.includes(version)) {
        pushIssue(issues, 'error', `${packageName}@${version} 已经发布，不能重复发布。`, 'version')
      }
    }

    const seenPackages = new Set<string>()
    const seenPlugins = new Set<string>()
    for (const [index, member] of members.entries()) {
      const path = `members[${index}]`
      const memberPackage = normalizeName(member.package)
      const memberPlugin = normalizeName(member.plugin || getShortname(memberPackage))
      const range = member.version?.trim()

      if (!memberPackage) pushIssue(issues, 'error', '成员包名不能为空。', `${path}.package`)
      else if (member.package !== memberPackage) pushIssue(issues, 'error', `${member.package} 必须改为小写包名。`, `${path}.package`)
      else if (!PLUGIN_PACKAGE_RE.test(memberPackage)) pushIssue(issues, 'error', `${memberPackage} 不是有效 Koishi 插件包名。`, `${path}.package`)
      else if (memberPackage === packageName) pushIssue(issues, 'error', '成员不能引用插件包自身。', `${path}.package`)

      if (!memberPlugin) pushIssue(issues, 'error', '成员 plugin 键不能为空。', `${path}.plugin`)
      else if (!PLUGIN_KEY_RE.test(memberPlugin)) pushIssue(issues, 'warning', `${memberPlugin} 可能造成配置键冲突，建议使用小写包名风格。`, `${path}.plugin`)

      if (!range) pushIssue(issues, 'error', '成员 version 必填，不能默认 latest。', `${path}.version`)
      else if (!validRange(range)) pushIssue(issues, 'error', `${range} 不是合法 semver range。`, `${path}.version`)

      if (memberPackage) {
        if (seenPackages.has(memberPackage)) pushIssue(issues, 'warning', `${memberPackage} 被重复加入。`, `${path}.package`)
        seenPackages.add(memberPackage)
        npm[memberPackage] = await getNpmInfo(memberPackage)
        if (!npm[memberPackage].exists) {
          pushIssue(issues, 'error', `npm 上找不到成员包 ${memberPackage}。`, `${path}.package`)
        } else if (range && !maxSatisfying(npm[memberPackage].versions ?? [], range, { includePrerelease: true })) {
          pushIssue(issues, 'error', `${memberPackage} 没有版本满足 ${range}。`, `${path}.version`)
        }
      }

      if (memberPlugin) {
        if (seenPlugins.has(memberPlugin)) pushIssue(issues, 'warning', `${memberPlugin} 配置键重复，安装时可能冲突。`, `${path}.plugin`)
        seenPlugins.add(memberPlugin)
      }
    }

    for (const member of members) {
      const info = npm[normalizeName(member.package)]
      if (!info?.exists) continue
      const latest = info.latest && info.versions?.includes(info.latest) ? info.latest : info.versions?.at(-1)
      if (!latest) continue
      try {
        const data = await ctx.http.get(`${registry()}/${encodePackageName(normalizeName(member.package))}/${latest}`) as any
        const nested = data?.koishi?.bundle?.members
        if (Array.isArray(nested) && nested.some(item => normalizeName(item?.package) === packageName)) {
          pushIssue(issues, 'error', `检测到直接循环依赖：${packageName} <-> ${member.package}。`, 'members')
        }
      } catch (error) {
        logger.debug(`direct cycle check skipped: member=${member.package}, error=${error instanceof Error ? error.message : error}`)
      }
    }

    return {
      valid: !issues.some(issue => issue.level === 'error'),
      issues,
      npm,
    }
  }

  function generate(draft: BundleManifestDraft): GenerateResult {
    const generated = createGeneratedFiles(draft)
    const packageJson = generated.packageJson
    const bundleJson = generated.bundleJson
    const tag = draft.distTag || config.defaultDistTag || 'alpha'
    const tarballName = createNpmPackFilename(packageJson)
    const commands = ['npm pack --dry-run']
    if (config.allowPublishCommand) {
      commands.push(createPublishCommand(packageJson, tag, tarballName))
    }
    return {
      packageJson: JSON.stringify(packageJson, null, 2),
      bundleJson: JSON.stringify(bundleJson, null, 2),
      libIndex: generated.libIndex,
      readme: generated.readme,
      publishCommands: commands,
    }
  }

  async function downloadArchive(draft: BundleManifestDraft, type: ArchiveType): Promise<DownloadArchiveResult> {
    if (type !== 'npm-tgz' && type !== 'source-zip') {
      return { ok: false, error: `unsupported archive type: ${type}` }
    }

    const validation = await validateDraft(draft)
    const errors = validation.issues.filter(issue => issue.level === 'error')
    const warnings = validation.issues.filter(issue => issue.level === 'warning')
    if (errors.length) {
      return {
        ok: false,
        error: errors.map(issue => issue.message).join('；'),
        warnings,
      }
    }

    const generated = createGeneratedFiles(draft)
    const packageJson = generated.packageJson
    const tag = draft.distTag || config.defaultDistTag || 'alpha'

    if (type === 'source-zip') {
      const folder = packageJson.name.replace(/^@/, '').replace(/\//g, '-')
      const entries = Object.fromEntries(Object
        .entries(generated.files)
        .map(([path, content]) => [`${folder}/${path}`, strToU8(content)]))
      const buffer = Buffer.from(zipSync(entries))
      return {
        ok: true,
        filename: createSourceZipFilename(packageJson),
        mime: 'application/zip',
        base64: buffer.toString('base64'),
        command: createPublishCommand(packageJson, tag),
        files: Object.entries(generated.files).map(([path, content]) => ({
          path,
          size: Buffer.byteLength(content),
        })),
        warnings,
      }
    }

    const root = await mkdtemp(join(tmpdir(), 'koishi-bundle-'))
    try {
      await writeGeneratedFiles(root, draft)
      const result = await spawn('npm', ['pack', '--json', '--pack-destination', root], {
        cwd: root,
        all: true,
      })
      let packed: any
      try {
        packed = JSON.parse(result.stdout)?.[0]
      } catch {}

      const filename = packed?.filename || createNpmPackFilename(packageJson)
      const content = await readFile(resolve(root, filename))
      return {
        ok: true,
        filename,
        mime: 'application/octet-stream',
        base64: content.toString('base64'),
        command: createPublishCommand(packageJson, tag, filename),
        files: packed?.files?.map((file: any) => ({ path: file.path, size: file.size })) ?? Object
          .entries(generated.files)
          .map(([path, content]) => ({ path, size: Buffer.byteLength(content) })),
        warnings,
      }
    } catch (error) {
      const err = error as any
      return {
        ok: false,
        error: err.shortMessage || err.message || String(error),
        warnings,
      }
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }

  async function writeFiles(projectPath: string, draft: BundleManifestDraft, options: WriteFilesOptions = {}): Promise<WriteFilesResult> {
    if (!projectPath?.trim()) return { ok: false, files: [], skipped: [], overwritten: [], error: 'projectPath is required' }
    const root = resolve(ctx.baseDir, projectPath)
    const generated = createGeneratedFiles(draft)
    const files: WriteFilesResult['files'] = []
    const skipped: string[] = []
    const overwritten: string[] = []

    try {
      for (const [path, next] of Object.entries(generated.files)) {
        const filename = resolve(root, path)
        let previous = ''
        let exists = false
        try {
          previous = await readFile(filename, 'utf8')
          exists = true
        } catch {}

        const entry = {
          path,
          exists,
          size: Buffer.byteLength(next),
          previous: exists ? previous : undefined,
          next,
        }

        if (exists && !options.overwrite) {
          skipped.push(path)
          files.push({ ...entry, skipped: true })
          continue
        }

        if (!options.dryRun) {
          await mkdir(dirname(filename), { recursive: true })
          await writeFile(filename, next)
        }

        if (exists) overwritten.push(path)
        files.push({
          ...entry,
          written: !options.dryRun,
          overwritten: exists && !options.dryRun,
        })
      }

      return {
        ok: !skipped.length,
        root,
        files,
        skipped,
        overwritten,
      }
    } catch (error) {
      return {
        ok: false,
        root,
        files,
        skipped,
        overwritten,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async function packDryRun(projectPath: string): Promise<PackDryRunResult> {
    if (!projectPath?.trim()) return { ok: false, error: 'projectPath is required' }
    try {
      const result = await spawn('npm', ['pack', '--dry-run', '--json'], {
        cwd: resolve(ctx.baseDir, projectPath),
        all: true,
      })
      let files: PackDryRunResult['files']
      try {
        const parsed = JSON.parse(result.stdout)
        files = parsed?.[0]?.files
      } catch {}
      return { ok: true, stdout: result.stdout, stderr: result.stderr, files }
    } catch (error) {
      const err = error as any
      return {
        ok: false,
        stdout: err.stdout,
        stderr: err.stderr,
        error: err.shortMessage || err.message || String(error),
      }
    }
  }

  ctx.inject(['console'], (ctx) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })

    ctx.console.addListener('bundle-workbench/npm-info', getNpmInfo, { authority: 4 })
    ctx.console.addListener('bundle-workbench/validate', validateDraft, { authority: 4 })
    ctx.console.addListener('bundle-workbench/generate', async draft => generate(draft), { authority: 4 })
    ctx.console.addListener('bundle-workbench/download-archive', downloadArchive, { authority: 4 })
    ctx.console.addListener('bundle-workbench/write-files', writeFiles, { authority: 4 })
    ctx.console.addListener('bundle-workbench/pack-dry-run', packDryRun, { authority: 4 })
  })
}

import type { Dict } from 'koishi'

export interface BundleMemberDraft {
  package: string
  plugin: string
  version: string
  required?: boolean
  config?: Dict
}

export interface BundleManifestDraft {
  packageName: string
  version: string
  label?: string
  description?: string
  keywords?: string[]
  distTag?: string
  members: BundleMemberDraft[]
}

export interface WorkbenchIssue {
  level: 'error' | 'warning' | 'info'
  message: string
  path?: string
}

export interface NpmInfo {
  name: string
  exists: boolean
  latest?: string
  versions?: string[]
  description?: string
  author?: string
  maintainers?: string[]
  keywords?: string[]
  error?: string
}

export interface ValidationResult {
  valid: boolean
  issues: WorkbenchIssue[]
  npm?: Record<string, NpmInfo>
}

export interface GenerateResult {
  packageJson: string
  bundleJson: string
  libIndex: string
  readme: string
  publishCommands: string[]
}

export type ArchiveType = 'npm-tgz' | 'source-zip'

export interface ArchiveFileEntry {
  path: string
  size?: number
}

export interface DownloadArchiveResult {
  ok: boolean
  filename?: string
  mime?: string
  base64?: string
  command?: string
  files?: ArchiveFileEntry[]
  warnings?: WorkbenchIssue[]
  error?: string
}

export interface WriteFilesOptions {
  overwrite?: boolean
  dryRun?: boolean
}

export interface WriteFileEntry {
  path: string
  exists?: boolean
  written?: boolean
  skipped?: boolean
  overwritten?: boolean
  size?: number
  previous?: string
  next?: string
}

export interface WriteFilesResult {
  ok: boolean
  root?: string
  files: WriteFileEntry[]
  skipped: string[]
  overwritten: string[]
  error?: string
}

export interface PackDryRunResult {
  ok: boolean
  stdout?: string
  stderr?: string
  files?: Array<{ path: string, size?: number }>
  error?: string
}

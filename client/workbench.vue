<template>
  <k-layout main="bundle-workbench">
    <div class="bundle-workbench-page">
      <aside class="wizard-rail">
        <div class="rail-brand">
          <div class="rail-mark">R</div>
          <div>
            <strong>插件包发布</strong>
            <span>Market NEXT Bundle</span>
          </div>
        </div>

        <button
          v-for="(step, index) in steps"
          :key="step.key"
          :class="['rail-step', { active: activeStep === step.key, done: stepIndex(activeStep) > index }]"
          type="button"
          @click="activeStep = step.key"
        >
          <span class="step-dot">{{ index + 1 }}</span>
          <span class="step-copy">
            <strong>{{ step.label }}</strong>
            <small>{{ step.short }}</small>
          </span>
        </button>
      </aside>

      <main class="wizard-main">
        <header class="wizard-header">
          <div>
            <h1>{{ currentStep.label }}</h1>
            <p>{{ currentStep.description }}</p>
          </div>
          <div class="header-actions">
            <el-button :loading="validating" @click="validate">校验</el-button>
            <el-button type="primary" :loading="generating" @click="generate">生成</el-button>
          </div>
        </header>

        <section v-if="activeStep === 'project'" class="wizard-card">
          <div class="card-head">
            <div>
              <h2>项目基础信息</h2>
              <p>真实 npm 包名必须是小写的 <code>koishi-plugin-pa-*</code> 或 <code>@scope/koishi-plugin-pa-*</code>。</p>
            </div>
          </div>

          <div class="form-grid">
            <label>
              <span>包名</span>
              <el-input v-model="draft.packageName" placeholder="koishi-plugin-pa-demo"></el-input>
            </label>
            <label>
              <span>版本</span>
              <el-input v-model="draft.version" placeholder="0.1.0-alpha.0"></el-input>
            </label>
            <label>
              <span>显示名称</span>
              <el-input v-model="draft.label" placeholder="Dialogue 插件包"></el-input>
            </label>
            <label>
              <span>dist-tag</span>
              <el-input v-model="draft.distTag" placeholder="alpha"></el-input>
            </label>
          </div>

          <label class="block-field">
            <span>描述</span>
            <el-input
              v-model="draft.description"
              type="textarea"
              :rows="3"
              placeholder="说明这个插件包解决什么场景，包含哪些能力。"
            ></el-input>
          </label>

          <label class="block-field">
            <span>Keywords</span>
            <el-input v-model="keywordsText" placeholder="koishi, plugin, market:package"></el-input>
          </label>

          <label class="block-field">
            <span>项目目录</span>
            <el-input v-model="projectPath" placeholder="相对 Koishi baseDir 或绝对路径"></el-input>
          </label>

          <div class="hint-strip">
            <strong>生成内容</strong>
            <span>工作台会生成 <code>package.json</code>、<code>README.md</code> 和 <code>lib/index.js</code>，不会执行 npm publish。</span>
          </div>
        </section>

        <section v-else-if="activeStep === 'members'" class="wizard-card">
          <div class="card-head">
            <div>
              <h2>成员插件</h2>
              <p>required 默认加入安装计划，optional 默认作为可选项展示。</p>
            </div>
          </div>

          <div class="member-add-panel">
            <section class="add-source">
              <div>
                <h3>从已安装插件加入</h3>
                <p>适合把当前环境里已经验证过的插件做成插件包成员。</p>
              </div>
              <div class="source-line">
                <el-select
                  v-model="selectedInstalled"
                  class="installed-select"
                  filterable
                  clearable
                  :disabled="!installedOptions.length"
                  :placeholder="installedOptions.length ? '选择已安装插件' : '没有可选的已安装插件'"
                >
                <el-option
                  v-for="item in installedOptions"
                  :key="item.name"
                  :value="item.name"
                  :label="item.label"
                ></el-option>
                </el-select>
                <el-button type="primary" :disabled="!selectedInstalled" @click="addInstalled">加入</el-button>
              </div>
            </section>

            <section class="add-source">
              <div>
                <h3>手动添加 npm 包</h3>
                <p>适合添加没有安装到当前环境、但已经发布到 npm 的成员。</p>
              </div>
              <div class="source-line">
                <el-input v-model="manualName" placeholder="koishi-plugin-example" @keyup.enter="addManual"></el-input>
                <el-button type="primary" plain :disabled="!manualName.trim()" @click="addManual">添加成员</el-button>
              </div>
            </section>
          </div>

          <div v-if="!members.length" class="workbench-empty">
            <strong>先添加一个成员插件</strong>
            <span>插件包至少需要一个成员。添加后可以设置版本范围、required/optional，并在下一步审查预设配置。</span>
            <div class="empty-examples">
              <button type="button" @click="manualName = 'koishi-plugin-example'">示例包名</button>
              <button type="button" @click="activeStep = 'project'">检查包信息</button>
            </div>
          </div>

          <div v-if="members.length" class="member-list">
            <article v-for="(member, index) in members" :key="member.id" class="member-card">
              <div class="member-title">
                <div>
                  <h3>{{ shortname(member.package) || '未命名成员' }}</h3>
                  <span>{{ member.package || '等待输入包名' }}</span>
                </div>
                <div class="member-actions">
                  <el-button text @click="moveMember(index, -1)" :disabled="index === 0">上移</el-button>
                  <el-button text @click="moveMember(index, 1)" :disabled="index === members.length - 1">下移</el-button>
                  <el-button text type="danger" @click="removeMember(index)">移除</el-button>
                </div>
              </div>

              <div class="member-row">
                <label class="member-package">
                  <span>包名</span>
                  <el-input v-model="member.package" @change="syncPluginKey(member)"></el-input>
                </label>
                <label>
                  <span>plugin 键</span>
                  <el-input
                    :model-value="member.plugin"
                    @update:model-value="value => updatePluginKey(member, value)"
                  ></el-input>
                </label>
                <label>
                  <span>版本范围</span>
                  <el-input v-model="member.version" placeholder="^1.0.0"></el-input>
                </label>
                <label>
                  <span>成员类型</span>
                  <el-select v-model="member.required">
                    <el-option :value="true" label="required"></el-option>
                    <el-option :value="false" label="optional"></el-option>
                  </el-select>
                </label>
              </div>

              <div class="member-meta">
                <span v-if="packageInfo(member.package)?.package?.version">本地 {{ packageInfo(member.package).package.version }}</span>
                <span v-if="runtimeSchema(member)">runtime schema</span>
                <span v-if="marketInfo(member.package)?.verified" title="该标记来自市场索引，不等于安全审计。">市场认证</span>
                <span v-if="marketInfo(member.package)?.insecure" class="danger">风险标记</span>
                <span v-if="marketInfo(member.package)?.deprecated" class="danger">已废弃</span>
                <span v-if="hasPresetConfig(member)" class="accent">含预设配置</span>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activeStep === 'config'" class="wizard-card">
          <div class="card-head">
            <div>
              <h2>配置审计</h2>
              <p>预设配置会随插件包公开，敏感字段应在发布前逐项确认。</p>
            </div>
          </div>

          <div v-if="members.length" class="audit-list">
            <article v-for="member in members" :key="member.id" class="audit-card">
              <div class="audit-head">
                <div>
                  <h3>{{ shortname(member.package) }}</h3>
                  <span>{{ member.package }}</span>
                </div>
                <div class="inline-actions">
                  <el-button size="small" @click="copyExistingConfig(member)">复制已有配置</el-button>
                  <el-button size="small" @click="resetConfig(member)">清空</el-button>
                </div>
              </div>

              <div v-if="sensitiveKeys(member).length" class="sensitive-warning">
                <strong>敏感字段</strong>
                <span>{{ sensitiveKeys(member).join(', ') }}</span>
              </div>

              <details class="schema-editor" :open="!!runtimeSchema(member)">
                <summary>
                  表单编辑
                  <span v-if="runtimeSchema(member)">可用</span>
                  <span v-else>未读取到 schema</span>
                </summary>
                <div v-if="runtimeSchema(member)" class="schema-body">
                  <k-form
                    :schema="runtimeSchema(member)"
                    :initial="member.configObject"
                    :model-value="member.configObject"
                    @update:model-value="value => updateConfigObject(member, value)"
                  ></k-form>
                </div>
              </details>

              <label class="block-field">
                <span>完整 JSON 预览</span>
                <el-input v-model="member.configText" type="textarea" :rows="7" spellcheck="false"></el-input>
              </label>
              <div class="json-actions">
                <el-button size="small" @click="syncConfigText(member)">从 JSON 更新表单</el-button>
                <span v-if="member.configError" class="danger">{{ member.configError }}</span>
              </div>
            </article>
          </div>
          <k-empty v-else>先添加成员插件。</k-empty>
        </section>

        <section v-else-if="activeStep === 'validate'" class="wizard-card">
          <div class="card-head">
            <div>
              <h2>npm 与清单校验</h2>
              <p>检查包名、版本占用、成员包存在性、版本范围、自引用、重复成员和直接循环。</p>
            </div>
            <el-button type="primary" :loading="validating" @click="validate">运行校验</el-button>
          </div>

          <div v-if="validation" class="validation-grid">
            <section class="result-card">
              <strong :class="validation.valid ? 'ok' : 'danger'">
                {{ validation.valid ? '校验通过' : '校验未通过' }}
              </strong>
              <span>{{ errorCount }} 个错误，{{ warningCount }} 个警告</span>
            </section>

            <section class="issue-panel">
              <p v-if="!validation.issues.length" class="muted">没有发现问题。</p>
              <p v-for="(issue, index) in validation.issues" :key="index" :class="['issue', issue.level]">
                <strong>{{ issue.level }}</strong>
                <span>{{ issue.path ? issue.path + '：' : '' }}{{ issue.message }}</span>
              </p>
            </section>

            <section v-if="npmEntries.length" class="npm-panel">
              <article v-for="info in npmEntries" :key="info.name" class="npm-item">
                <div>
                  <strong>{{ info.name }}</strong>
                  <span>{{ info.exists ? `latest ${info.latest || '-'}` : info.error || 'not found' }}</span>
                </div>
                <span :class="info.exists ? 'ok' : 'danger'">{{ info.exists ? '存在' : '缺失' }}</span>
              </article>
            </section>
          </div>
          <k-empty v-else>点击运行校验后显示结果。</k-empty>
        </section>

        <section v-else class="wizard-card release-card">
          <div class="card-head">
            <div>
              <h2>生成与发布</h2>
              <p>可以直接下载 npm 发布包或源码 zip，再用开发者本机 npm 登录态发布。</p>
            </div>
            <div class="inline-actions">
              <el-button :loading="generating" @click="generate">生成</el-button>
              <el-button :loading="previewingWrite" :disabled="!generated" @click="previewWriteFiles">预览写入</el-button>
              <el-button type="primary" :loading="writing" :disabled="!generated" @click="writeFilesToDisk">写入项目</el-button>
            </div>
          </div>

          <div class="download-panel">
            <section class="download-card primary">
              <div>
                <h3>npm 发布包</h3>
                <p>生成真实 <code>npm pack</code> 产物，下载后可直接在终端发布。</p>
              </div>
              <el-button
                type="primary"
                :loading="downloadingArchive === 'npm-tgz'"
                @click="downloadArchive('npm-tgz')"
              >
                下载 npm 发布包
              </el-button>
            </section>

            <section class="download-card">
              <div>
                <h3>源码 zip</h3>
                <p>下载可审查和二次编辑的项目源码，再自行解压发布。</p>
              </div>
              <el-button
                :loading="downloadingArchive === 'source-zip'"
                @click="downloadArchive('source-zip')"
              >
                下载源码 zip
              </el-button>
            </section>
          </div>

          <div v-if="archiveResult" class="archive-result">
            <strong :class="archiveResult.ok ? 'ok' : 'danger'">
              {{ archiveResult.ok ? '压缩包已生成' : archiveResult.error || '压缩包生成失败' }}
            </strong>
            <span v-if="archiveResult.filename">文件：{{ archiveResult.filename }}</span>
            <span v-if="archiveResult.command">发布命令：<code>{{ archiveResult.command }}</code></span>
            <div v-if="archiveResult.warnings?.length" class="archive-warnings">
              <p v-for="(issue, index) in archiveResult.warnings" :key="index">
                {{ issue.path ? issue.path + '：' : '' }}{{ issue.message }}
              </p>
            </div>
            <div v-if="archiveResult.files?.length" class="file-list">
              <p v-for="file in archiveResult.files.slice(0, 8)" :key="file.path">
                <strong>{{ file.path }}</strong>
                <span v-if="file.size">{{ file.size }} bytes</span>
              </p>
            </div>
          </div>

          <div class="release-actions">
            <label class="switch-line">
              <el-checkbox v-model="overwriteFiles"></el-checkbox>
              <span>允许覆盖已有文件</span>
            </label>
            <el-button :loading="packing" @click="packDryRun">运行 npm pack --dry-run</el-button>
            <el-button :disabled="!generated" @click="copyAll">复制全部输出</el-button>
          </div>

          <div v-if="writeResult" class="write-result">
            <strong :class="writeResult.ok ? 'ok' : 'danger'">
              {{ writeResult.ok ? '文件检查通过' : writeResult.error || '仍有文件被跳过或写入失败' }}
            </strong>
            <span v-if="writeResult.root">目标目录：{{ writeResult.root }}</span>
            <div class="file-list">
              <p v-for="file in writeResult.files" :key="file.path">
                <strong>{{ file.path }}</strong>
                <span v-if="file.skipped">已存在，未覆盖</span>
                <span v-else-if="file.written">已写入</span>
                <span v-else>将写入</span>
              </p>
            </div>
          </div>

          <div v-if="packResult" class="pack-result">
            <strong :class="packResult.ok ? 'ok' : 'danger'">
              {{ packResult.ok ? 'dry-run 通过' : packResult.error || 'dry-run 失败' }}
            </strong>
            <ul v-if="packResult.files?.length">
              <li v-for="file in packResult.files.slice(0, 12)" :key="file.path">
                {{ file.path }} <span v-if="file.size">({{ file.size }} bytes)</span>
              </li>
            </ul>
            <pre v-if="packResult.stderr">{{ packResult.stderr }}</pre>
          </div>

          <div v-if="generated" class="output-tabs">
            <el-tabs v-model="activeOutput">
              <el-tab-pane label="package.json" name="package">
                <pre>{{ generated.packageJson }}</pre>
              </el-tab-pane>
              <el-tab-pane label="koishi.bundle" name="bundle">
                <pre>{{ generated.bundleJson }}</pre>
              </el-tab-pane>
              <el-tab-pane label="lib/index.js" name="lib">
                <pre>{{ generated.libIndex }}</pre>
              </el-tab-pane>
              <el-tab-pane label="README" name="readme">
                <pre>{{ generated.readme }}</pre>
              </el-tab-pane>
              <el-tab-pane label="发布命令" name="commands">
                <pre>{{ generated.publishCommands.join('\n') }}</pre>
              </el-tab-pane>
            </el-tabs>
          </div>
          <k-empty v-else>点击生成后显示输出。</k-empty>
        </section>
      </main>

      <aside class="wizard-status">
        <section class="status-card">
          <h2>状态</h2>
          <p class="status-name">{{ draft.packageName || '未填写包名' }}</p>
          <div class="metric-grid">
            <div>
              <strong>{{ members.length }}</strong>
              <span>成员</span>
            </div>
            <div>
              <strong>{{ errorCount }}</strong>
              <span>错误</span>
            </div>
            <div>
              <strong>{{ warningCount }}</strong>
              <span>警告</span>
            </div>
            <div>
              <strong>{{ presetCount }}</strong>
              <span>预设配置</span>
            </div>
          </div>
          <p :class="['status-pill', packageNameOk ? 'ok' : 'warn']">
            {{ packageNameOk ? '包名格式可发布' : '包名需要 koishi-plugin-pa-*' }}
          </p>
          <p :class="['status-pill', generated ? 'ok' : 'muted']">
            {{ generated ? '已生成文件内容' : '尚未生成' }}
          </p>
          <p :class="['status-pill', packResult?.ok ? 'ok' : 'muted']">
            {{ packResult?.ok ? 'dry-run 通过' : 'dry-run 未通过或未运行' }}
          </p>
        </section>

        <section class="status-card">
          <h2>下一步</h2>
          <p>{{ nextActionText }}</p>
          <div class="status-actions">
            <el-button @click="previousStep" :disabled="stepIndex(activeStep) === 0">上一步</el-button>
            <el-button type="primary" @click="nextStep" :disabled="stepIndex(activeStep) === steps.length - 1">下一步</el-button>
          </div>
        </section>

        <section class="status-card compact">
          <h2>发布边界</h2>
          <p>工作台只生成文件、校验和 dry-run；真正发布仍由你在终端执行。</p>
        </section>
      </aside>
    </div>
  </k-layout>
</template>

<script lang="ts" setup>

import { computed, reactive, ref } from 'vue'
import { message, send, store } from '@koishijs/client'
import type {
  ArchiveType,
  BundleManifestDraft,
  DownloadArchiveResult,
  GenerateResult,
  PackDryRunResult,
  ValidationResult,
  WriteFilesResult,
} from '../src/shared'

type StepKey = 'project' | 'members' | 'config' | 'validate' | 'release'

interface MemberView {
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

const steps: Array<{ key: StepKey, label: string, short: string, description: string }> = [
  { key: 'project', label: '项目', short: '包名与目录', description: '定义插件包 npm 信息、关键词、dist-tag 和本地项目目录。' },
  { key: 'members', label: '成员', short: '选择插件', description: '选择要打包的成员插件，声明版本范围、插件键和 required/optional。' },
  { key: 'config', label: '配置审计', short: '预设配置', description: '审查每个成员的预设配置，检查敏感字段和完整 JSON。' },
  { key: 'validate', label: '校验', short: 'npm 检查', description: '通过 npm 和清单规则检查插件包是否可以安全发布。' },
  { key: 'release', label: '生成与发布', short: '下载压缩包', description: '下载 npm-ready 发布包或源码 zip，也可以写入本地项目后 dry-run。' },
]

const activeStep = ref<StepKey>('project')
const draft = reactive({
  packageName: 'koishi-plugin-pa-demo',
  version: '0.1.0-alpha.0',
  label: '',
  description: '',
  distTag: 'alpha',
})
const members = reactive<MemberView[]>([])
const selectedInstalled = ref('')
const manualName = ref('')
const keywordsText = ref('koishi, plugin, market:package')
const projectPath = ref('')
const validation = ref<ValidationResult>()
const generated = ref<GenerateResult>()
const packResult = ref<PackDryRunResult>()
const writeResult = ref<WriteFilesResult>()
const archiveResult = ref<DownloadArchiveResult>()
const activeOutput = ref('package')
const overwriteFiles = ref(false)
const validating = ref(false)
const generating = ref(false)
const packing = ref(false)
const previewingWrite = ref(false)
const writing = ref(false)
const downloadingArchive = ref<ArchiveType | ''>('')

const currentStep = computed(() => steps.find(step => step.key === activeStep.value) ?? steps[0])
const errorCount = computed(() => validation.value?.issues.filter(issue => issue.level === 'error').length ?? 0)
const warningCount = computed(() => validation.value?.issues.filter(issue => issue.level === 'warning').length ?? 0)
const presetCount = computed(() => members.filter(hasPresetConfig).length)
const npmEntries = computed(() => Object.values(validation.value?.npm ?? {}))
const packageNameOk = computed(() => /^(?:@[0-9a-z-]+\/)?koishi-plugin-pa-[0-9a-z-]+$/.test(draft.packageName.trim()))
const nextActionText = computed(() => {
  if (activeStep.value === 'project') return '确认包名、版本和项目目录后继续选择成员。'
  if (activeStep.value === 'members') return members.length ? '成员列表就绪，继续审查预设配置。' : '至少添加一个成员插件。'
  if (activeStep.value === 'config') return '确认预设配置后运行校验。'
  if (activeStep.value === 'validate') return validation.value?.valid ? '校验通过，可以生成文件。' : '处理校验错误后再生成。'
  return generated.value ? '下载压缩包，或写入项目后 dry-run。' : '可以直接下载压缩包，也可以先生成文件内容。'
})

const installedOptions = computed(() => {
  return Object.values(((store as any).packages ?? {}) as Record<string, any>)
    .filter((item: any) => isPluginPackage(item?.package?.name))
    .sort((a: any, b: any) => a.package.name.localeCompare(b.package.name))
    .map((item: any) => ({
      name: item.package.name,
      label: `${item.package.name}@${item.package.version}`,
    }))
})

function stepIndex(key: StepKey) {
  return steps.findIndex(step => step.key === key)
}

function nextStep() {
  const index = stepIndex(activeStep.value)
  if (index < steps.length - 1) activeStep.value = steps[index + 1].key
}

function previousStep() {
  const index = stepIndex(activeStep.value)
  if (index > 0) activeStep.value = steps[index - 1].key
}

function isPluginPackage(name = '') {
  return /^@koishijs\/plugin-[0-9a-z-]+$/.test(name) || /(^|\/)koishi-plugin-[0-9a-z-]+$/.test(name)
}

function shortname(name = '') {
  return name.toLowerCase().replace(/(koishi-|^@koishijs\/)plugin-/, '')
}

function normalizePackageName(name = '') {
  return name.trim().toLowerCase()
}

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

function packageInfo(name: string): any {
  return ((store as any).packages ?? {})[normalizePackageName(name)]
}

function marketInfo(name: string): any {
  return (store as any).market?.data?.[normalizePackageName(name)]
}

function runtimeSchema(member: MemberView) {
  return packageInfo(member.package)?.runtime?.schema
}

function defaultRange(version?: string) {
  if (!version) return '^1.0.0'
  return /^[0-9]+\.[0-9]+\.[0-9]+/.test(version) ? `^${version}` : version
}

function hasPresetConfig(member: MemberView) {
  return !!member.configObject && Object.keys(member.configObject).length > 0
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

function addInstalled() {
  if (!selectedInstalled.value) return
  addMember(selectedInstalled.value)
  selectedInstalled.value = ''
}

function addManual() {
  addMember(manualName.value)
  manualName.value = ''
}

function removeMember(index: number) {
  members.splice(index, 1)
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

function moveMember(index: number, offset: number) {
  const next = index + offset
  if (next < 0 || next >= members.length) return
  const [item] = members.splice(index, 1)
  members.splice(next, 0, item)
}

function cloneConfig(value: any) {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith('$'))
    .map(([key, child]) => {
      if (Array.isArray(child)) return [key, child.map(item => cloneConfigValue(item))]
      if (child && typeof child === 'object') return [key, cloneConfig(child)]
      return [key, child]
    }))
}

function cloneConfigValue(value: any): any {
  if (Array.isArray(value)) return value.map(item => cloneConfigValue(item))
  if (value && typeof value === 'object') return cloneConfig(value)
  return value
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

function syncConfigText(member: MemberView) {
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

function collectSensitiveKeys(value: any, prefix = '', output = new Set<string>()) {
  const sensitivePattern = /(command|script|exec|path|token|secret|password|sql|url|webhook|key)/i
  if (!value || typeof value !== 'object') return output
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (sensitivePattern.test(key)) output.add(path)
    if (child && typeof child === 'object') collectSensitiveKeys(child, path, output)
  }
  return output
}

function sensitiveKeys(member: MemberView) {
  return [...collectSensitiveKeys(member.configObject)].slice(0, 8)
}

function findExistingConfig(name: string) {
  const target = shortname(name)
  function visit(plugins: any): any {
    if (!plugins || typeof plugins !== 'object') return
    for (const key of Object.keys(plugins)) {
      if (key.startsWith('$')) continue
      const value = plugins[key]
      const [prefix] = key.split(':', 1)
      const normalized = prefix.replace(/^~/, '')
      if (normalized === target) return value
      const nested = visit(value)
      if (nested) return nested
    }
  }
  return visit((store as any).config?.plugins)
}

function copyExistingConfig(member: MemberView) {
  const config = findExistingConfig(member.plugin) ?? findExistingConfig(member.package)
  if (!config) {
    message.warning('没有找到已有配置。')
    return
  }
  setConfig(member, cloneConfig(config))
}

function parseKeywords() {
  return keywordsText.value
    .split(/[\s,，;；]+/g)
    .map(keyword => keyword.trim())
    .filter(Boolean)
}

function buildDraft(): BundleManifestDraft | undefined {
  const result: BundleManifestDraft = {
    ...draft,
    keywords: parseKeywords(),
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

async function validate() {
  const payload = buildDraft()
  if (!payload) return
  validating.value = true
  try {
    validation.value = await send('bundle-workbench/validate', payload)
    if (validation.value.valid) message.success('校验通过。')
    else message.warning('校验完成，仍有问题需要处理。')
  } catch (error) {
    console.error(error)
    message.error('校验失败。')
  } finally {
    validating.value = false
  }
}

async function generate() {
  const payload = buildDraft()
  if (!payload) return
  generating.value = true
  try {
    generated.value = await send('bundle-workbench/generate', payload)
    activeOutput.value = 'package'
    message.success('已生成插件包文件内容。')
  } catch (error) {
    console.error(error)
    message.error('生成失败。')
  } finally {
    generating.value = false
  }
}

async function previewWriteFiles() {
  const payload = buildDraft()
  if (!payload) return
  previewingWrite.value = true
  try {
    writeResult.value = await send('bundle-workbench/write-files', projectPath.value, payload, {
      dryRun: true,
      overwrite: overwriteFiles.value,
    })
    if (writeResult.value.ok) message.success('写入预览通过。')
    else message.warning(writeResult.value.error || '写入预览完成，有文件会被跳过。')
  } catch (error) {
    console.error(error)
    message.error('写入预览失败。')
  } finally {
    previewingWrite.value = false
  }
}

async function writeFilesToDisk() {
  const payload = buildDraft()
  if (!payload) return
  writing.value = true
  try {
    writeResult.value = await send('bundle-workbench/write-files', projectPath.value, payload, {
      overwrite: overwriteFiles.value,
    })
    if (writeResult.value.ok) message.success('已写入插件包项目。')
    else message.warning(writeResult.value.error || '部分文件被跳过，开启覆盖后可重试。')
  } catch (error) {
    console.error(error)
    message.error('写入失败。')
  } finally {
    writing.value = false
  }
}

async function packDryRun() {
  packing.value = true
  try {
    packResult.value = await send('bundle-workbench/pack-dry-run', projectPath.value)
    if (packResult.value.ok) message.success('dry-run 通过。')
    else message.error('dry-run 失败。')
  } catch (error) {
    console.error(error)
    message.error('dry-run 调用失败。')
  } finally {
    packing.value = false
  }
}

async function downloadArchive(type: ArchiveType) {
  const payload = buildDraft()
  if (!payload) return
  downloadingArchive.value = type
  try {
    archiveResult.value = await send('bundle-workbench/download-archive', payload, type)
    if (!archiveResult.value.ok || !archiveResult.value.base64 || !archiveResult.value.filename) {
      message.error(archiveResult.value.error || '压缩包生成失败。')
      return
    }
    saveBase64File(archiveResult.value.base64, archiveResult.value.filename, archiveResult.value.mime)
    if (archiveResult.value.warnings?.length) {
      message.warning(`已下载，但仍有 ${archiveResult.value.warnings.length} 个警告需要留意。`)
    } else {
      message.success('压缩包已下载。')
    }
  } catch (error) {
    console.error(error)
    message.error('压缩包生成失败。')
  } finally {
    downloadingArchive.value = ''
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

</script>

<style lang="scss">

.bundle-workbench {
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.bundle-workbench-page {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr) 19rem;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--k-color-primary) 8%, transparent), transparent 36rem),
    var(--k-side-bg);

  code {
    font-family: var(--font-mono);
  }
}

.wizard-rail,
.wizard-status,
.wizard-main {
  min-height: 0;
}

.wizard-rail {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 1rem;
  overflow: auto;
  border-right: 1px solid color-mix(in srgb, var(--k-color-border) 70%, transparent);
  background: color-mix(in srgb, var(--k-card-bg) 82%, transparent);
}

.rail-brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 0.5rem;

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 0.08rem;
    color: var(--fg3);
    font-size: 0.78rem;
  }
}

.rail-mark {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  color: white;
  background: linear-gradient(145deg, var(--k-color-primary), color-mix(in srgb, var(--k-color-primary) 65%, #111));
  font-weight: 800;
  font-size: 1.25rem;
}

.rail-step {
  display: grid;
  grid-template-columns: 1.8rem minmax(0, 1fr);
  gap: 0.55rem;
  align-items: center;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.55rem;
  color: var(--fg2);
  background: transparent;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: color-mix(in srgb, var(--k-color-primary) 24%, transparent);
    background: color-mix(in srgb, var(--k-color-primary) 7%, transparent);
  }

  &.active {
    color: var(--fg1);
    border-color: color-mix(in srgb, var(--k-color-primary) 38%, transparent);
    background: color-mix(in srgb, var(--k-color-primary) 11%, transparent);
  }

  &.done .step-dot {
    color: white;
    background: var(--k-color-success);
  }
}

.step-dot {
  display: grid;
  place-items: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  color: var(--fg2);
  background: color-mix(in srgb, var(--fg3) 12%, transparent);
  font-size: 0.78rem;
  font-weight: 700;
}

.step-copy {
  min-width: 0;

  strong,
  small {
    display: block;
  }

  small {
    margin-top: 0.05rem;
    color: var(--fg3);
  }
}

.wizard-main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: auto;
  padding: 1rem;
}

.wizard-header,
.card-head,
.audit-head,
.member-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  p,
  span {
    color: var(--fg2);
  }
}

.wizard-header {
  border: 1px solid color-mix(in srgb, var(--k-color-border) 70%, transparent);
  border-radius: 8px;
  padding: 0.95rem 1rem;
  background: color-mix(in srgb, var(--k-card-bg) 88%, transparent);

  h1 {
    font-size: 1.35rem;
  }

  p {
    margin-top: 0.25rem;
  }
}

.header-actions,
.inline-actions,
.source-line,
.json-actions,
.release-actions,
.status-actions,
.member-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wizard-card,
.status-card {
  border: 1px solid color-mix(in srgb, var(--k-color-border) 76%, transparent);
  border-radius: 8px;
  background: var(--k-card-bg);
}

.wizard-card {
  padding: 1rem;
}

.status-card {
  padding: 0.85rem;

  h2 {
    margin: 0 0 0.65rem;
    font-size: 0.95rem;
  }

  p {
    margin: 0;
    color: var(--fg2);
  }

  &.compact {
    font-size: 0.86rem;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.block-field,
.form-grid label,
.member-row label {
  display: grid;
  gap: 0.32rem;

  > span {
    color: var(--fg2);
    font-size: 0.82rem;
  }
}

.block-field {
  margin-top: 0.75rem;
}

.hint-strip,
.sensitive-warning,
.archive-result,
.write-result,
.pack-result {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.85rem;
  border-radius: 8px;
  padding: 0.7rem 0.75rem;
}

.hint-strip {
  border: 1px solid color-mix(in srgb, var(--k-color-primary) 22%, transparent);
  background: color-mix(in srgb, var(--k-color-primary) 8%, transparent);
}

.member-add-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.add-source {
  display: grid;
  gap: 0.7rem;
  border: 1px solid color-mix(in srgb, var(--k-color-border) 70%, transparent);
  border-radius: 8px;
  padding: 0.85rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--k-color-primary) 5%, transparent), transparent),
    color-mix(in srgb, var(--k-side-bg) 70%, var(--k-card-bg));

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 0.95rem;
  }

  p {
    margin-top: 0.16rem;
    color: var(--fg3);
    font-size: 0.82rem;
    line-height: 1.45;
  }
}

.source-line {
  align-items: stretch;

  .el-select,
  .el-input {
    flex: 1 1 auto;
    min-width: 0;
  }

  .installed-select {
    min-width: 18rem;
  }

  .el-button {
    flex: 0 0 auto;
  }
}

.workbench-empty {
  display: grid;
  place-items: center;
  gap: 0.55rem;
  min-height: 11rem;
  margin-top: 0.85rem;
  border: 1px dashed color-mix(in srgb, var(--k-color-border) 85%, transparent);
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  color: var(--fg2);
  background: color-mix(in srgb, var(--k-side-bg) 52%, transparent);

  strong {
    color: var(--fg1);
    font-size: 1rem;
  }

  span {
    max-width: 32rem;
    color: var(--fg3);
    line-height: 1.55;
  }
}

.empty-examples {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.45rem;

  button {
    border: 1px solid color-mix(in srgb, var(--k-color-primary) 28%, transparent);
    border-radius: 999px;
    padding: 0.24rem 0.65rem;
    color: var(--k-color-primary);
    background: color-mix(in srgb, var(--k-color-primary) 8%, transparent);
    cursor: pointer;
  }
}

.member-list,
.audit-list,
.validation-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.member-card,
.audit-card,
.result-card,
.issue-panel,
.npm-panel {
  border: 1px solid color-mix(in srgb, var(--k-color-border) 70%, transparent);
  border-radius: 8px;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--k-side-bg) 62%, var(--k-card-bg));
}

.member-title h3,
.audit-head h3 {
  font-size: 1rem;
}

.member-title span,
.audit-head span {
  display: block;
  margin-top: 0.12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 36rem;
  font-size: 0.8rem;
}

.member-row {
  display: grid;
  grid-template-columns: minmax(13rem, 1.35fr) minmax(8rem, 0.8fr) minmax(7rem, 0.65fr) 8rem;
  gap: 0.6rem;
  align-items: end;
  margin-top: 0.7rem;
}

.member-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.55rem;
  color: var(--fg3);
  font-size: 0.78rem;

  span {
    border-radius: 999px;
    padding: 0.08rem 0.45rem;
    background: color-mix(in srgb, var(--fg3) 9%, transparent);
  }

  .accent {
    color: var(--k-color-primary);
    background: color-mix(in srgb, var(--k-color-primary) 12%, transparent);
  }
}

.audit-card {
  display: grid;
  gap: 0.7rem;
}

.sensitive-warning {
  border: 1px solid color-mix(in srgb, var(--k-color-warning) 25%, transparent);
  color: var(--k-color-warning);
  background: color-mix(in srgb, var(--k-color-warning) 10%, transparent);
}

.schema-editor {
  border: 1px solid color-mix(in srgb, var(--k-color-border) 66%, transparent);
  border-radius: 8px;
  padding: 0.65rem;
  background: color-mix(in srgb, var(--k-card-bg) 80%, transparent);

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    color: var(--k-color-primary);
    font-weight: 600;
  }
}

.schema-body {
  margin-top: 0.65rem;
}

.result-card {
  display: flex;
  justify-content: space-between;
  gap: 1rem;

  strong {
    font-size: 1.05rem;
  }

  span {
    color: var(--fg2);
  }
}

.issue-panel {
  display: grid;
  gap: 0.45rem;
}

.issue {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 0.5rem;
  margin: 0;
  color: var(--fg2);

  strong {
    text-transform: uppercase;
  }

  &.error strong,
  &.error span {
    color: var(--k-color-danger);
  }

  &.warning strong {
    color: var(--k-color-warning);
  }
}

.npm-panel {
  display: grid;
  gap: 0.45rem;
}

.npm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--k-color-border) 45%, transparent);
  padding-bottom: 0.45rem;

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  strong,
  span {
    display: block;
  }

  span {
    color: var(--fg3);
    font-size: 0.78rem;
  }
}

.release-card {
  display: grid;
  gap: 0.85rem;
}

.download-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.download-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--k-color-border) 70%, transparent);
  border-radius: 8px;
  padding: 0.85rem;
  background: color-mix(in srgb, var(--k-side-bg) 64%, var(--k-card-bg));

  &.primary {
    border-color: color-mix(in srgb, var(--k-color-primary) 32%, transparent);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--k-color-primary) 9%, transparent), transparent),
      color-mix(in srgb, var(--k-side-bg) 64%, var(--k-card-bg));
  }

  h3,
  p {
    margin: 0;
  }

  h3 {
    font-size: 0.98rem;
  }

  p {
    margin-top: 0.18rem;
    color: var(--fg3);
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .el-button {
    flex: 0 0 auto;
  }
}

.release-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.switch-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--fg2);
  margin-right: auto;
}

.write-result {
  border: 1px solid color-mix(in srgb, var(--k-color-primary) 22%, transparent);
  background: color-mix(in srgb, var(--k-color-primary) 7%, transparent);
}

.archive-result {
  border: 1px solid color-mix(in srgb, var(--k-color-primary) 24%, transparent);
  background: color-mix(in srgb, var(--k-color-primary) 8%, transparent);

  code {
    word-break: break-all;
  }
}

.archive-warnings {
  display: grid;
  gap: 0.25rem;
  border-radius: 6px;
  padding: 0.5rem;
  color: var(--k-color-warning);
  background: color-mix(in srgb, var(--k-color-warning) 10%, transparent);

  p {
    margin: 0;
  }
}

.file-list {
  display: grid;
  gap: 0.25rem;

  p {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin: 0;
    color: var(--fg2);
  }
}

.pack-result {
  border: 1px solid color-mix(in srgb, var(--k-color-border) 70%, transparent);
  background: color-mix(in srgb, var(--k-side-bg) 70%, transparent);

  ul {
    margin: 0.25rem 0 0;
    padding-left: 1.1rem;
    color: var(--fg2);
  }
}

.output-tabs pre,
.pack-result pre {
  max-height: 38rem;
  margin: 0;
  border-radius: 6px;
  padding: 0.75rem;
  overflow: auto;
  background: var(--k-color-code-bg, rgb(0 0 0 / 8%));
  font-size: 0.78rem;
}

.wizard-status {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  overflow: auto;
  padding: 1rem;
  border-left: 1px solid color-mix(in srgb, var(--k-color-border) 70%, transparent);
  background: color-mix(in srgb, var(--k-card-bg) 78%, transparent);
}

.status-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0.7rem 0;

  div {
    border-radius: 8px;
    padding: 0.55rem;
    background: color-mix(in srgb, var(--k-side-bg) 75%, transparent);
  }

  strong,
  span {
    display: block;
  }

  strong {
    font-size: 1.2rem;
  }

  span {
    color: var(--fg3);
    font-size: 0.78rem;
  }
}

.status-pill {
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  margin-top: 0.45rem !important;
  background: color-mix(in srgb, var(--fg3) 8%, transparent);
  font-size: 0.8rem;
}

.status-actions {
  margin-top: 0.75rem;
}

.ok {
  color: var(--k-color-success) !important;
}

.warn {
  color: var(--k-color-warning) !important;
}

.danger {
  color: var(--k-color-danger) !important;
}

.muted {
  color: var(--fg3) !important;
}

@media (max-width: 1180px) {
  .bundle-workbench-page {
    grid-template-columns: 13rem minmax(0, 1fr);
  }

  .wizard-status {
    display: none;
  }
}

@media (max-width: 820px) {
  .bundle-workbench-page {
    grid-template-columns: 1fr;
  }

  .wizard-rail {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(9rem, 1fr);
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--k-color-border) 70%, transparent);
  }

  .rail-brand {
    display: none;
  }

  .form-grid,
  .member-row {
    grid-template-columns: 1fr;
  }

  .wizard-header,
  .card-head,
  .audit-head,
  .member-title {
    flex-direction: column;
  }

  .header-actions,
  .inline-actions,
  .release-actions,
  .source-line {
    width: 100%;
    flex-wrap: wrap;
  }

  .member-add-panel {
    grid-template-columns: 1fr;
  }

  .download-panel {
    grid-template-columns: 1fr;
  }

  .download-card {
    align-items: stretch;
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }

  .source-line {
    .installed-select {
      min-width: 0;
    }

    .el-button {
      width: 100%;
    }
  }
}

</style>

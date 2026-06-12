<template>
  <section class="bw-card">
    <div class="bw-card-head">
      <div>
        <h2>下载与发布</h2>
        <p>下载 npm 发布包或源码 zip,使用本机 npm 登录态发布。</p>
      </div>
      <div class="bw-toolbar">
        <el-button :loading="actions.busy.generate" @click="actions.generate">生成文件</el-button>
        <el-button :disabled="!actions.generated.value" @click="actions.copyAll">复制全部输出</el-button>
      </div>
    </div>

    <div class="bw-download-grid">
      <button
        type="button"
        class="bw-download-card primary"
        :disabled="actions.busy.archive === 'npm-tgz'"
        @click="actions.downloadArchive('npm-tgz')"
      >
        <span class="bw-download-title">下载 npm 发布包</span>
        <span class="bw-download-desc is-muted">真实 npm pack 产物,下载后可直接发布。</span>
        <span v-if="actions.busy.archive === 'npm-tgz'" class="bw-download-busy is-accent">正在打包…</span>
      </button>

      <button
        type="button"
        class="bw-download-card"
        :disabled="actions.busy.archive === 'source-zip'"
        @click="actions.downloadArchive('source-zip')"
      >
        <span class="bw-download-title">下载源码 zip</span>
        <span class="bw-download-desc is-muted">可审查的项目源码,自行解压发布。</span>
        <span v-if="actions.busy.archive === 'source-zip'" class="bw-download-busy is-accent">正在压缩…</span>
      </button>
    </div>

    <ResultPanel
      v-if="actions.archiveResult.value"
      :title="actions.archiveResult.value.ok ? '压缩包已生成' : (actions.archiveResult.value.error || '压缩包生成失败')"
      :status="actions.archiveResult.value.ok ? 'is-ok' : 'is-danger'"
      :subtitle="actions.archiveResult.value.filename ? `文件:${actions.archiveResult.value.filename}` : undefined"
    >
      <p v-if="actions.archiveResult.value.command" class="is-muted">
        发布命令:<code>{{ actions.archiveResult.value.command }}</code>
      </p>
      <div v-if="actions.archiveResult.value.warnings?.length" class="bw-issue-warnings">
        <p v-for="(issue, index) in actions.archiveResult.value.warnings" :key="index" class="is-warn">
          {{ issue.path ? `${issue.path}:` : '' }}{{ issue.message }}
        </p>
      </div>
      <div v-if="actions.archiveResult.value.files?.length" class="bw-file-list">
        <p v-for="file in actions.archiveResult.value.files.slice(0, 8)" :key="file.path">
          <code>{{ file.path }}</code>
          <span v-if="file.size" class="is-muted">{{ file.size }} bytes</span>
        </p>
      </div>
    </ResultPanel>
  </section>

  <section class="bw-card">
    <div class="bw-card-head">
      <div>
        <h2>写入项目</h2>
        <p>写入 ProjectStep 中填写的项目目录。预览模式不会修改磁盘。</p>
      </div>
    </div>

    <div class="bw-write-controls bw-toolbar">
      <span class="is-muted">目录:<code>{{ projectPath || '未填写' }}</code></span>
      <span class="bw-toolbar-spacer"></span>
      <label class="bw-checkbox-line">
        <el-checkbox v-model="overwriteFiles"></el-checkbox>
        <span class="is-muted">允许覆盖</span>
      </label>
      <el-button
        :loading="actions.busy.previewWrite"
        :disabled="!actions.generated.value || !projectPath"
        @click="actions.previewWrite(overwriteFiles)"
      >预览</el-button>
      <el-button
        type="primary"
        :loading="actions.busy.write"
        :disabled="!actions.generated.value || !projectPath"
        @click="actions.writeToDisk(overwriteFiles)"
      >写入项目</el-button>
      <el-button :loading="actions.busy.pack" :disabled="!projectPath" @click="actions.packDryRun">
        npm pack --dry-run
      </el-button>
    </div>

    <ResultPanel
      v-if="actions.writeResult.value"
      :title="actions.writeResult.value.ok ? '文件检查通过' : (actions.writeResult.value.error || '仍有文件被跳过或写入失败')"
      :status="actions.writeResult.value.ok ? 'is-ok' : 'is-warn'"
      :subtitle="actions.writeResult.value.root ? `目标:${actions.writeResult.value.root}` : undefined"
    >
      <div class="bw-file-list">
        <p v-for="file in actions.writeResult.value.files" :key="file.path">
          <code>{{ file.path }}</code>
          <span v-if="file.skipped" class="is-warn">已存在,未覆盖</span>
          <span v-else-if="file.written" class="is-ok">已写入</span>
          <span v-else class="is-muted">将写入</span>
        </p>
      </div>
    </ResultPanel>

    <ResultPanel
      v-if="actions.packResult.value"
      :title="actions.packResult.value.ok ? 'dry-run 通过' : (actions.packResult.value.error || 'dry-run 失败')"
      :status="actions.packResult.value.ok ? 'is-ok' : 'is-danger'"
    >
      <ul v-if="actions.packResult.value.files?.length" class="bw-pack-files">
        <li v-for="file in actions.packResult.value.files.slice(0, 12)" :key="file.path">
          <code>{{ file.path }}</code>
          <span v-if="file.size" class="is-muted">{{ file.size }} bytes</span>
        </li>
      </ul>
      <pre v-if="actions.packResult.value.stderr" class="bw-pre">{{ actions.packResult.value.stderr }}</pre>
    </ResultPanel>
  </section>

  <section v-if="actions.generated.value" class="bw-card">
    <div class="bw-card-head">
      <div>
        <h2>生成内容预览</h2>
        <p>核对每个文件的内容,确认无误后再下载或写入。</p>
      </div>
    </div>

    <el-tabs v-model="activeOutput" class="bw-output-tabs">
      <el-tab-pane label="package.json" name="package">
        <pre class="bw-pre">{{ actions.generated.value.packageJson }}</pre>
      </el-tab-pane>
      <el-tab-pane label="koishi.bundle" name="bundle">
        <pre class="bw-pre">{{ actions.generated.value.bundleJson }}</pre>
      </el-tab-pane>
      <el-tab-pane label="lib/index.js" name="lib">
        <pre class="bw-pre">{{ actions.generated.value.libIndex }}</pre>
      </el-tab-pane>
      <el-tab-pane label="README" name="readme">
        <pre class="bw-pre">{{ actions.generated.value.readme }}</pre>
      </el-tab-pane>
      <el-tab-pane label="发布命令" name="commands">
        <pre class="bw-pre">{{ actions.generated.value.publishCommands.join('\n') }}</pre>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import ResultPanel from '../components/ResultPanel.vue'
import type { BundleActionsApi } from '../composables/useBundleActions'

defineProps<{
  actions: BundleActionsApi
  projectPath: string
}>()

const overwriteFiles = ref(false)
const activeOutput = ref('package')
</script>

<style lang="scss">
.bw-download-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--bw-gap-md);
}

.bw-download-card {
  appearance: none;
  display: grid;
  gap: var(--bw-gap-xs);
  padding: var(--bw-gap-md);
  border: var(--bw-border);
  border-radius: var(--bw-radius);
  background: var(--k-card-bg);
  cursor: pointer;
  text-align: left;

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--k-color-primary) 35%, var(--k-color-border));
  }

  &:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  &.primary {
    border-color: color-mix(in srgb, var(--k-color-primary) 35%, var(--k-color-border));
  }
}

.bw-download-title {
  color: var(--fg1);
  font-size: 0.95rem;
  font-weight: 600;
}

.bw-download-desc {
  font-size: 0.8rem;
  line-height: 1.5;
}

.bw-download-busy {
  font-size: 0.78rem;
  margin-top: 0.2rem;
}

.bw-write-controls {
  margin-top: var(--bw-gap-md);
  font-size: 0.85rem;

  .bw-toolbar-spacer {
    flex: 1;
  }
}

.bw-checkbox-line {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.bw-issue-warnings {
  display: grid;
  gap: 0.2rem;

  p {
    margin: 0;
    font-size: 0.82rem;
  }
}

.bw-file-list {
  display: grid;
  gap: 0.2rem;

  p {
    display: flex;
    justify-content: space-between;
    gap: var(--bw-gap-md);
    margin: 0;
    font-size: 0.82rem;
    color: var(--fg2);
  }

  code {
    font-family: var(--bw-font-mono);
  }
}

.bw-pack-files {
  margin: 0.2rem 0 0;
  padding-left: 1.2rem;
  font-size: 0.82rem;
  color: var(--fg2);

  li {
    line-height: 1.5;
  }

  code {
    font-family: var(--bw-font-mono);
  }
}

.bw-output-tabs {
  margin-top: var(--bw-gap-md);
}

@media (max-width: 720px) {
  .bw-download-grid {
    grid-template-columns: 1fr;
  }
}
</style>

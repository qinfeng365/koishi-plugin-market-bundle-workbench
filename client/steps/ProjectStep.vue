<template>
  <section class="bw-card">
    <div class="bw-card-head">
      <div>
        <h2>项目基础信息</h2>
        <p>真实 npm 包名必须是小写的 <code>koishi-plugin-pa-*</code> 或 <code>@scope/koishi-plugin-pa-*</code>。</p>
      </div>
    </div>

    <div class="bw-form-grid">
      <label>
        <span>包名</span>
        <el-input v-model="api.draft.packageName" placeholder="koishi-plugin-pa-demo"></el-input>
      </label>
      <label>
        <span>版本</span>
        <el-input v-model="api.draft.version" placeholder="0.1.0-alpha.0"></el-input>
      </label>
      <label>
        <span>显示名称</span>
        <el-input v-model="api.draft.label" placeholder="Dialogue 插件包"></el-input>
      </label>
      <label>
        <span>dist-tag</span>
        <el-input v-model="api.draft.distTag" placeholder="alpha"></el-input>
      </label>
      <label class="bw-span-2">
        <span>描述</span>
        <el-input
          v-model="api.draft.description"
          type="textarea"
          :rows="3"
          placeholder="说明这个插件包解决什么场景,包含哪些能力。"
        ></el-input>
      </label>
      <label class="bw-span-2">
        <span>Keywords (逗号分隔)</span>
        <el-input v-model="api.keywordsText.value" placeholder="koishi, plugin, market:package"></el-input>
      </label>
      <label class="bw-span-2">
        <span>项目目录</span>
        <el-input v-model="api.projectPath.value" placeholder="相对 Koishi baseDir 或绝对路径"></el-input>
      </label>
    </div>

    <p v-if="!api.packageNameOk.value" class="bw-form-error is-danger">
      包名格式不合法,需要 <code>koishi-plugin-pa-*</code> 或 <code>@scope/koishi-plugin-pa-*</code>。
    </p>

    <p class="bw-form-note is-muted">
      工作台仅生成 <code>package.json</code>、<code>README.md</code> 和 <code>lib/index.js</code>;不会执行 npm publish。
    </p>
  </section>
</template>

<script lang="ts" setup>
import type { BundleDraftApi } from '../composables/useBundleDraft'

defineProps<{ api: BundleDraftApi }>()
</script>

<style lang="scss">
.bw-form-error {
  margin: var(--bw-gap-md) 0 0;
  font-size: 0.82rem;

  code {
    font-family: var(--bw-font-mono);
  }
}

.bw-form-note {
  margin: var(--bw-gap-md) 0 0;
  font-size: 0.82rem;

  code {
    font-family: var(--bw-font-mono);
  }
}
</style>

<template>
  <article class="bw-config-editor bw-card">
    <div class="bw-card-head">
      <div>
        <h3>{{ shortName }}</h3>
        <p class="is-muted">{{ member.package }}</p>
      </div>
      <div class="bw-toolbar">
        <el-button size="small" @click="$emit('copyExisting')">复制已有配置</el-button>
        <el-button size="small" @click="$emit('reset')">清空</el-button>
      </div>
    </div>

    <div v-if="sensitiveKeys.length" class="bw-sensitive">
      <strong class="is-warn">敏感字段</strong>
      <span class="is-muted">{{ sensitiveKeys.join(', ') }}</span>
    </div>

    <div class="bw-tabs" role="tablist">
      <button
        type="button"
        :class="{ active: activeTab === 'form' }"
        :disabled="!hasSchema"
        :title="hasSchema ? '' : '未读取到 schema'"
        role="tab"
        @click="setTab('form')"
      >表单</button>
      <button
        type="button"
        :class="{ active: activeTab === 'json' }"
        role="tab"
        @click="setTab('json')"
      >JSON</button>
    </div>

    <div v-if="activeTab === 'form' && hasSchema" class="bw-tab-body">
      <k-form
        :schema="schema"
        :initial="member.configObject"
        :model-value="member.configObject"
        @update:model-value="value => $emit('updateObject', value)"
      ></k-form>
    </div>

    <div v-else class="bw-tab-body">
      <el-input
        v-model="member.configText"
        type="textarea"
        :rows="9"
        spellcheck="false"
      ></el-input>
      <div class="bw-tab-actions">
        <el-button size="small" @click="$emit('syncFromText')">解析 JSON</el-button>
        <span v-if="member.configError" class="is-danger">{{ member.configError }}</span>
        <span v-else-if="!hasSchema" class="is-muted">该成员未读取到 schema,只能在 JSON 模式编辑。</span>
      </div>
    </div>
  </article>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import type { MemberView } from '../composables/useBundleDraft'
import { shortname } from '../composables/helpers'

const props = defineProps<{
  member: MemberView
  schema?: any
  sensitiveKeys: string[]
}>()

defineEmits<{
  (event: 'copyExisting'): void
  (event: 'reset'): void
  (event: 'updateObject', value: any): void
  (event: 'syncFromText'): void
}>()

const hasSchema = computed(() => !!props.schema)

const activeTab = ref<'form' | 'json'>(hasSchema.value ? 'form' : 'json')

watch(hasSchema, value => {
  if (!value && activeTab.value === 'form') activeTab.value = 'json'
})

function setTab(tab: 'form' | 'json') {
  if (tab === 'form' && !hasSchema.value) return
  activeTab.value = tab
}

const shortName = computed(() => shortname(props.member.package))
</script>

<style lang="scss">
.bw-config-editor {
  & + & {
    margin-top: var(--bw-gap-md);
  }
}

.bw-sensitive {
  display: flex;
  align-items: center;
  gap: var(--bw-gap-sm);
  margin-bottom: var(--bw-gap-md);
  padding: 0.45rem var(--bw-gap-md);
  border-radius: var(--bw-radius-sm);
  background: color-mix(in srgb, var(--k-color-warning) 8%, transparent);
  font-size: 0.82rem;

  strong {
    flex: 0 0 auto;
  }

  span {
    word-break: break-all;
  }
}

.bw-tab-body {
  display: grid;
  gap: var(--bw-gap-sm);
}

.bw-tab-actions {
  display: flex;
  align-items: center;
  gap: var(--bw-gap-sm);
  font-size: 0.82rem;
}
</style>

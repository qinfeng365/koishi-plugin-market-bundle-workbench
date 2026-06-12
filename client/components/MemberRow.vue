<template>
  <div class="bw-member-row">
    <div class="bw-tr bw-row-main">
      <div class="bw-cell-name">
        <button
          type="button"
          class="bw-expander"
          :aria-expanded="expanded"
          @click="$emit('toggle')"
        >{{ expanded ? '▾' : '▸' }}</button>
        <div class="bw-name-block">
          <strong>{{ shortName || '未命名' }}</strong>
          <span class="is-muted">{{ member.package || '等待输入包名' }}</span>
        </div>
      </div>

      <div class="bw-cell-version">
        <el-input v-model="member.version" placeholder="^1.0.0" size="small"></el-input>
      </div>

      <div class="bw-cell-type">
        <el-select v-model="member.required" size="small">
          <el-option :value="true" label="required"></el-option>
          <el-option :value="false" label="optional"></el-option>
        </el-select>
      </div>

      <div class="bw-cell-status bw-status-line">
        <span v-if="localVersion">local {{ localVersion }}</span>
        <span v-if="hasSchema">runtime schema</span>
        <span v-if="market?.verified" :title="'该标记来自市场索引,不等于安全审计。'">市场认证</span>
        <span v-if="market?.insecure" class="is-danger">风险标记</span>
        <span v-if="market?.deprecated" class="is-danger">已废弃</span>
        <span v-if="hasPreset" class="is-accent">含预设配置</span>
      </div>

      <div class="bw-cell-actions">
        <el-button text size="small" :disabled="isFirst" @click="$emit('move', -1)">↑</el-button>
        <el-button text size="small" :disabled="isLast" @click="$emit('move', 1)">↓</el-button>
        <el-button text size="small" type="danger" @click="$emit('remove')">移除</el-button>
      </div>
    </div>

    <div v-if="expanded" class="bw-tr bw-row-detail">
      <div class="bw-detail-grid">
        <label>
          <span>完整包名</span>
          <el-input
            :model-value="member.package"
            size="small"
            @update:model-value="value => $emit('updatePackage', value)"
          ></el-input>
        </label>
        <label>
          <span>plugin 键</span>
          <el-input
            :model-value="member.plugin"
            size="small"
            @update:model-value="value => $emit('updatePluginKey', value)"
          ></el-input>
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { MemberView } from '../composables/useBundleDraft'
import { shortname } from '../composables/helpers'

const props = defineProps<{
  member: MemberView
  isFirst: boolean
  isLast: boolean
  expanded: boolean
  localVersion?: string
  hasSchema: boolean
  hasPreset: boolean
  market?: { verified?: boolean, insecure?: boolean, deprecated?: boolean }
}>()

defineEmits<{
  (event: 'toggle'): void
  (event: 'move', offset: number): void
  (event: 'remove'): void
  (event: 'updatePackage', value: string): void
  (event: 'updatePluginKey', value: string): void
}>()

const shortName = computed(() => shortname(props.member.package))
</script>

<style lang="scss">
.bw-member-row {
  display: contents;
}

.bw-row-main {
  grid-template-columns:
    minmax(13rem, 2.4fr)
    minmax(7rem, 1fr)
    7rem
    minmax(8rem, 1.4fr)
    auto;

  > div {
    min-width: 0;
  }
}

.bw-cell-name {
  display: flex;
  align-items: center;
  gap: var(--bw-gap-sm);
  min-width: 0;
}

.bw-expander {
  flex: 0 0 auto;
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--fg3);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0 0.25rem;
  width: 1.4rem;
}

.bw-name-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  overflow: hidden;

  strong {
    color: var(--fg1);
    font-size: 0.9rem;
    font-weight: 600;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.78rem;
    font-family: var(--bw-font-mono);
  }
}

.bw-cell-status {
  font-size: 0.76rem;
  gap: var(--bw-gap-xs) var(--bw-gap-sm);
}

.bw-cell-actions {
  display: flex;
  gap: 0.15rem;
  white-space: nowrap;
}

.bw-row-detail {
  background: var(--bw-bg-elev);
}

.bw-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--bw-gap-md);

  label {
    display: grid;
    gap: 0.25rem;

    > span {
      color: var(--fg3);
      font-size: 0.78rem;
    }
  }
}

@media (max-width: 820px) {
  .bw-row-main {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'name actions'
      'version type'
      'status status';
    row-gap: var(--bw-gap-xs);
  }

  .bw-cell-name {
    grid-area: name;
  }

  .bw-cell-version {
    grid-area: version;
  }

  .bw-cell-type {
    grid-area: type;
  }

  .bw-cell-status {
    grid-area: status;
  }

  .bw-cell-actions {
    grid-area: actions;
  }

  .bw-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <section class="bw-card">
    <div class="bw-card-head">
      <div>
        <h2>npm 与清单校验</h2>
        <p>检查包名、版本占用、成员包存在性、版本范围、自引用、重复成员和直接循环。</p>
      </div>
      <div class="bw-toolbar">
        <el-button type="primary" :loading="actions.busy.validate" @click="actions.validate">
          运行校验
        </el-button>
      </div>
    </div>

    <div v-if="actions.validation.value" class="bw-validate-grid">
      <div class="bw-validate-summary">
        <strong :class="actions.validation.value.valid ? 'is-ok' : 'is-danger'">
          {{ actions.validation.value.valid ? '校验通过' : '校验未通过' }}
        </strong>
        <span class="is-muted">
          {{ actions.errorCount.value }} 个错误,{{ actions.warningCount.value }} 个警告
        </span>
      </div>

      <div v-if="actions.npmEntries.value.length" class="bw-validate-npm">
        <h3>npm 检查</h3>
        <div
          v-for="info in actions.npmEntries.value"
          :key="info.name"
          class="bw-validate-npm-item"
        >
          <div>
            <strong>{{ info.name }}</strong>
            <span class="is-muted">{{ info.exists ? `latest ${info.latest || '-'}` : info.error || 'not found' }}</span>
          </div>
          <span :class="info.exists ? 'is-ok' : 'is-danger'">
            {{ info.exists ? '存在' : '缺失' }}
          </span>
        </div>
      </div>

      <div class="bw-validate-issues">
        <h3>问题列表</h3>
        <p v-if="!actions.validation.value.issues.length" class="is-muted">没有发现问题。</p>
        <div
          v-for="(issue, index) in actions.validation.value.issues"
          :key="index"
          :class="['bw-issue', issue.level]"
        >
          <strong>{{ issue.level }}</strong>
          <span>
            <span v-if="issue.path" class="bw-issue-path">{{ issue.path }}:</span>{{ issue.message }}
          </span>
        </div>
      </div>
    </div>
    <p v-else class="bw-empty">点击运行校验后显示结果。</p>
  </section>
</template>

<script lang="ts" setup>
import type { BundleActionsApi } from '../composables/useBundleActions'

defineProps<{ actions: BundleActionsApi }>()
</script>

<style lang="scss">
.bw-validate-grid {
  display: grid;
  gap: var(--bw-gap-md);
}

.bw-validate-summary {
  display: flex;
  justify-content: space-between;
  gap: var(--bw-gap-md);
  padding: var(--bw-gap-md);
  border: var(--bw-border);
  border-radius: var(--bw-radius);
  background: var(--bw-bg-elev);

  strong {
    font-size: 1rem;
  }

  span {
    font-size: 0.85rem;
  }
}

.bw-validate-npm,
.bw-validate-issues {
  border: var(--bw-border);
  border-radius: var(--bw-radius);
  padding: var(--bw-gap-md);

  h3 {
    margin: 0 0 var(--bw-gap-sm);
    font-size: 0.88rem;
    color: var(--fg2);
  }
}

.bw-validate-npm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--bw-gap-md);
  padding: 0.35rem 0;
  border-bottom: var(--bw-border-soft);

  &:last-child {
    border-bottom: 0;
  }

  strong {
    font-family: var(--bw-font-mono);
    font-size: 0.85rem;
  }

  span {
    display: block;
    font-size: 0.78rem;
  }
}

.bw-issue {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: var(--bw-gap-sm);
  padding: 0.3rem 0;
  font-size: 0.84rem;
  color: var(--fg2);

  strong {
    text-transform: uppercase;
    font-size: 0.74rem;
    letter-spacing: 0.04em;
    align-self: center;
  }

  &.error strong,
  &.error span {
    color: var(--k-color-danger);
  }

  &.warning strong {
    color: var(--k-color-warning);
  }
}

.bw-issue-path {
  font-family: var(--bw-font-mono);
  font-size: 0.78rem;
  color: var(--fg3);
  margin-right: 0.25rem;
}
</style>

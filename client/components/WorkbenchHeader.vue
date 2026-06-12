<template>
  <header class="bw-header">
    <div class="bw-header-row">
      <div class="bw-header-title">
        <h1>{{ currentStep.label }}</h1>
        <p>{{ currentStep.description }}</p>
      </div>
      <div class="bw-header-meta bw-status-line">
        <span class="bw-pkg-name" :class="{ 'is-warn': !packageNameOk }">
          {{ draft.packageName || '未填写包名' }}
        </span>
        <span class="dot">{{ draft.version || '0.0.0' }}</span>
        <span class="dot">{{ draft.distTag || 'alpha' }}</span>
        <span class="dot">{{ memberCount }} 成员</span>
        <span v-if="errorCount" class="dot is-danger">{{ errorCount }} 错误</span>
        <span v-else-if="warningCount" class="dot is-warn">{{ warningCount }} 警告</span>
      </div>
    </div>

    <div class="bw-header-rule"></div>

    <StepIndicator :steps="steps" :step-states="stepStates" @go="key => $emit('go', key)" />
  </header>
</template>

<script lang="ts" setup>
import StepIndicator from './StepIndicator.vue'
import type { StepDef, StepKey, StepState } from '../composables/useStepFlow'

defineProps<{
  steps: StepDef[]
  stepStates: Record<StepKey, StepState>
  currentStep: StepDef
  draft: { packageName: string, version: string, distTag: string }
  packageNameOk: boolean
  memberCount: number
  errorCount: number
  warningCount: number
}>()

defineEmits<{
  (event: 'go', key: StepKey): void
}>()
</script>

<style lang="scss">
.bw-header {
  flex: 0 0 auto;
  padding: var(--bw-gap-md) var(--bw-gap-lg);
  background: var(--bw-bg-soft);
  border-bottom: var(--bw-border);
}

.bw-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--bw-gap-lg);
  flex-wrap: wrap;
}

.bw-header-title {
  min-width: 0;

  h1 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--fg1);
  }

  p {
    margin: 0.2rem 0 0;
    color: var(--fg3);
    font-size: 0.82rem;
    line-height: 1.5;
    max-width: 48rem;
  }
}

.bw-header-meta {
  font-size: 0.8rem;
}

.bw-pkg-name {
  font-family: var(--bw-font-mono);
  color: var(--fg1);
  font-weight: 500;
}

.bw-header-rule {
  height: var(--bw-gap-md);
}

@media (max-width: 720px) {
  .bw-header {
    padding: var(--bw-gap-sm) var(--bw-gap-md);
  }

  .bw-header-meta {
    width: 100%;
  }
}
</style>

<template>
  <footer class="bw-footer">
    <div class="bw-footer-left">
      <el-button :disabled="isFirst" @click="$emit('prev')">上一步</el-button>
    </div>

    <div class="bw-footer-hint">
      <span :class="blockReason ? 'is-warn' : 'is-muted'">{{ footerHint }}</span>
    </div>

    <div class="bw-footer-right">
      <el-button
        v-if="primaryActionKind === 'next'"
        type="primary"
        :disabled="primaryDisabled || isLast"
        @click="$emit('next')"
      >下一步</el-button>
      <el-button
        v-else-if="primaryActionKind === 'validate'"
        type="primary"
        :loading="busyValidate"
        @click="$emit('validate')"
      >运行校验</el-button>
      <el-button
        v-else
        type="primary"
        :loading="busyGenerate"
        @click="$emit('generate')"
      >生成文件</el-button>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import type { PrimaryActionKind } from '../composables/useStepFlow'

defineProps<{
  primaryActionKind: PrimaryActionKind
  primaryDisabled: boolean
  blockReason: string | null
  footerHint: string
  isFirst: boolean
  isLast: boolean
  busyValidate: boolean
  busyGenerate: boolean
}>()

defineEmits<{
  (event: 'prev'): void
  (event: 'next'): void
  (event: 'validate'): void
  (event: 'generate'): void
}>()
</script>

<style lang="scss">
.bw-footer {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--bw-gap-md);
  padding: var(--bw-gap-md) var(--bw-gap-lg);
  background: var(--bw-bg-soft);
  border-top: var(--bw-border);
}

.bw-footer-hint {
  font-size: 0.85rem;
  text-align: center;
  min-width: 0;

  span {
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
}

.bw-footer-right {
  display: flex;
  justify-content: flex-end;
  gap: var(--bw-gap-sm);
}

@media (max-width: 720px) {
  .bw-footer {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'hint hint'
      'left right';
    padding: var(--bw-gap-sm) var(--bw-gap-md);
  }

  .bw-footer-hint {
    grid-area: hint;
    text-align: left;
  }

  .bw-footer-left {
    grid-area: left;
  }

  .bw-footer-right {
    grid-area: right;
  }
}
</style>

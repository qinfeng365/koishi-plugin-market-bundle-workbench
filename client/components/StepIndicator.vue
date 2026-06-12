<template>
  <ol class="bw-step-indicator" role="list">
    <li
      v-for="(step, index) in steps"
      :key="step.key"
      :class="['bw-step', stepStates[step.key]]"
    >
      <button
        type="button"
        class="bw-step-btn"
        :aria-current="stepStates[step.key] === 'current' ? 'step' : undefined"
        @click="$emit('go', step.key)"
      >
        <span class="bw-step-mark">{{ stepStates[step.key] === 'done' ? '✓' : index + 1 }}</span>
        <span class="bw-step-label">{{ step.label }}</span>
      </button>
      <span v-if="index < steps.length - 1" class="bw-step-rule" aria-hidden="true"></span>
    </li>
  </ol>
</template>

<script lang="ts" setup>
import type { StepDef, StepKey, StepState } from '../composables/useStepFlow'

defineProps<{
  steps: StepDef[]
  stepStates: Record<StepKey, StepState>
}>()

defineEmits<{
  (event: 'go', key: StepKey): void
}>()
</script>

<style lang="scss">
.bw-step-indicator {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: thin;
}

.bw-step {
  display: flex;
  align-items: center;
  flex: 0 0 auto;

  &:last-child {
    flex: 0 1 auto;
  }
}

.bw-step-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 0;
  background: transparent;
  padding: 0.3rem 0.5rem;
  color: var(--fg2);
  font-size: 0.86rem;
  cursor: pointer;
  border-radius: var(--bw-radius-sm);

  &:hover {
    color: var(--fg1);
    background: color-mix(in srgb, var(--k-color-primary) 6%, transparent);
  }
}

.bw-step-mark {
  display: inline-grid;
  place-items: center;
  width: var(--bw-step-size);
  height: var(--bw-step-size);
  border-radius: 999px;
  border: 1px solid var(--fg3);
  color: var(--fg3);
  font-size: 0.78rem;
  font-weight: 600;
  background: var(--k-card-bg);
}

.bw-step-label {
  font-weight: 500;
}

.bw-step-rule {
  display: inline-block;
  width: 1.6rem;
  height: 1px;
  margin: 0 0.25rem;
  background: var(--fg3);
  opacity: 0.6;
}

.bw-step.current .bw-step-mark {
  border-color: var(--k-color-primary);
  color: var(--k-color-primary);
  background: color-mix(in srgb, var(--k-color-primary) 10%, var(--k-card-bg));
}

.bw-step.current .bw-step-label {
  color: var(--fg1);
  font-weight: 600;
}

.bw-step.done .bw-step-mark {
  border-color: var(--k-color-success);
  color: var(--k-color-success);
  background: color-mix(in srgb, var(--k-color-success) 10%, var(--k-card-bg));
}

.bw-step.done .bw-step-label {
  color: var(--fg1);
}

.bw-step.error .bw-step-mark {
  border-color: var(--k-color-danger);
  color: var(--k-color-danger);
  background: color-mix(in srgb, var(--k-color-danger) 10%, var(--k-card-bg));
}

.bw-step.error .bw-step-label {
  color: var(--k-color-danger);
}

@media (max-width: 720px) {
  .bw-step-rule {
    width: 0.8rem;
  }

  .bw-step-btn {
    padding: 0.2rem 0.35rem;
    font-size: 0.8rem;
  }
}
</style>

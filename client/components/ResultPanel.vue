<template>
  <section v-if="title || $slots.default" class="bw-result-panel">
    <div v-if="title" class="bw-result-head">
      <strong :class="status">{{ title }}</strong>
      <span v-if="subtitle" class="is-muted">{{ subtitle }}</span>
    </div>
    <slot></slot>
  </section>
</template>

<script lang="ts" setup>
defineProps<{
  title?: string
  subtitle?: string
  status?: 'is-ok' | 'is-warn' | 'is-danger' | 'is-muted'
}>()
</script>

<style lang="scss">
.bw-result-panel {
  display: grid;
  gap: var(--bw-gap-sm);
  margin-top: var(--bw-gap-md);
  padding: var(--bw-gap-md);
  border: var(--bw-border);
  border-radius: var(--bw-radius);
  background: var(--bw-bg-elev);
}

.bw-result-head {
  display: flex;
  align-items: baseline;
  gap: var(--bw-gap-md);
  flex-wrap: wrap;

  strong {
    font-size: 0.94rem;
  }

  span {
    font-size: 0.82rem;
  }
}
</style>

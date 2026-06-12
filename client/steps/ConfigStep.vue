<template>
  <section class="bw-card">
    <div class="bw-card-head">
      <div>
        <h2>配置审计</h2>
        <p>预设配置会随插件包公开,敏感字段应在发布前逐项确认。</p>
      </div>
    </div>

    <p v-if="!api.members.length" class="bw-empty">先添加成员插件。</p>
  </section>

  <ConfigEditor
    v-for="member in api.members"
    :key="member.id"
    :member="member"
    :schema="api.runtimeSchema(member)"
    :sensitive-keys="api.sensitiveKeys(member)"
    @copy-existing="api.copyExistingConfig(member)"
    @reset="api.resetConfig(member)"
    @update-object="value => api.updateConfigObject(member, value)"
    @sync-from-text="api.syncConfigText(member)"
  />
</template>

<script lang="ts" setup>
import ConfigEditor from '../components/ConfigEditor.vue'
import type { BundleDraftApi } from '../composables/useBundleDraft'

defineProps<{ api: BundleDraftApi }>()
</script>

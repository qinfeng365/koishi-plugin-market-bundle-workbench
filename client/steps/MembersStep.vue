<template>
  <section class="bw-card bw-add-card">
    <div class="bw-card-head">
      <div>
        <h2>添加成员</h2>
        <p>从已安装插件中选择,或手动输入 npm 包名。</p>
      </div>
    </div>

    <div class="bw-add-grid">
      <div class="bw-add-source">
        <span class="bw-add-label is-muted">已安装</span>
        <el-select
          v-model="selectedInstalled"
          filterable
          clearable
          :disabled="!api.installedOptions.value.length"
          :placeholder="api.installedOptions.value.length ? '选择已安装插件' : '没有可选的已安装插件'"
        >
          <el-option
            v-for="item in api.installedOptions.value"
            :key="item.name"
            :value="item.name"
            :label="item.label"
          ></el-option>
        </el-select>
        <el-button type="primary" :disabled="!selectedInstalled" @click="addInstalled">加入</el-button>
      </div>

      <div class="bw-add-source">
        <span class="bw-add-label is-muted">手动添加</span>
        <el-input
          v-model="manualName"
          placeholder="koishi-plugin-example"
          @keyup.enter="addManual"
        ></el-input>
        <el-button type="primary" plain :disabled="!manualName.trim()" @click="addManual">添加</el-button>
      </div>
    </div>
  </section>

  <section class="bw-card">
    <div class="bw-card-head">
      <div>
        <h2>成员列表 <span class="is-muted">({{ api.members.length }})</span></h2>
        <p>required 默认加入安装计划,optional 默认作为可选项展示。</p>
      </div>
    </div>

    <div v-if="!api.members.length" class="bw-empty">
      还没有添加成员。从上面的两种方式选择一个开始。
    </div>

    <div v-else class="bw-table">
      <div class="bw-tr bw-th bw-row-main">
        <div>包名</div>
        <div>版本范围</div>
        <div>类型</div>
        <div>状态</div>
        <div>操作</div>
      </div>
      <MemberRow
        v-for="(member, index) in api.members"
        :key="member.id"
        :member="member"
        :is-first="index === 0"
        :is-last="index === api.members.length - 1"
        :expanded="expanded.has(member.id)"
        :local-version="api.packageInfo(member.package)?.package?.version"
        :has-schema="!!api.runtimeSchema(member)"
        :has-preset="api.hasPresetConfig(member)"
        :market="api.marketInfo(member.package)"
        @toggle="toggleExpanded(member.id)"
        @move="offset => api.moveMember(index, offset)"
        @remove="api.removeMember(index)"
        @update-package="value => onPackageChange(member, value)"
        @update-plugin-key="value => api.updatePluginKey(member, value)"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import MemberRow from '../components/MemberRow.vue'
import type { BundleDraftApi, MemberView } from '../composables/useBundleDraft'

const props = defineProps<{ api: BundleDraftApi }>()

const selectedInstalled = ref('')
const manualName = ref('')
const expanded = ref<Set<string>>(new Set())

function toggleExpanded(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function addInstalled() {
  if (!selectedInstalled.value) return
  props.api.addMember(selectedInstalled.value)
  selectedInstalled.value = ''
}

function addManual() {
  props.api.addMember(manualName.value)
  manualName.value = ''
}

function onPackageChange(member: MemberView, value: string) {
  member.package = value
  props.api.syncPluginKey(member)
}
</script>

<style lang="scss">
.bw-add-card {
  margin-bottom: var(--bw-gap-md);
}

.bw-add-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--bw-gap-md);
}

.bw-add-source {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--bw-gap-sm);
}

.bw-add-label {
  font-size: 0.82rem;
  white-space: nowrap;
}

@media (max-width: 820px) {
  .bw-add-grid {
    grid-template-columns: 1fr;
  }

  .bw-add-source {
    grid-template-columns: minmax(0, 1fr) auto;

    .bw-add-label {
      grid-column: 1 / -1;
    }
  }

  .bw-row-main.bw-th {
    display: none;
  }
}
</style>

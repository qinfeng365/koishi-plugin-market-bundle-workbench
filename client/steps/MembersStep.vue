<template>
  <section class="bw-card bw-add-card">
    <div class="bw-card-head">
      <div>
        <h2>添加成员</h2>
        <p>从已安装插件中选择,或手动输入 npm 包名。</p>
      </div>
    </div>

    <div class="bw-installed-picker">
      <div class="bw-installed-toolbar">
        <div>
          <span class="bw-add-label">已安装插件</span>
          <span class="is-muted">已选 {{ selectedInstalled.length }} / 可选 {{ availableInstalledCount }}</span>
        </div>
        <el-input
          v-model="installedKeyword"
          clearable
          class="bw-installed-search"
          placeholder="搜索插件名、包名、描述或版本"
        ></el-input>
        <div class="bw-installed-actions">
          <el-button size="small" :disabled="!filteredSelectable.length" @click="selectFiltered">全选当前</el-button>
          <el-button size="small" :disabled="!selectedInstalled.length" @click="clearInstalledSelection">清空</el-button>
          <el-button type="primary" size="small" :disabled="!selectedInstalled.length" @click="addInstalled">
            加入已选
          </el-button>
        </div>
      </div>

      <div v-if="filteredInstalled.length" class="bw-installed-grid">
        <button
          v-for="item in filteredInstalled"
          :key="item.name"
          type="button"
          :class="['bw-installed-card', { selected: selectedInstalledSet.has(item.name), added: item.added, danger: item.insecure || item.deprecated }]"
          :disabled="item.added"
          @click="toggleInstalled(item.name)"
        >
          <span class="bw-installed-check">{{ item.added ? '已加入' : selectedInstalledSet.has(item.name) ? '已选' : '可选' }}</span>
          <span class="bw-installed-main">
            <strong>{{ item.shortname }}</strong>
            <span class="bw-installed-package" :title="item.name">{{ item.name }}</span>
            <span class="bw-installed-desc" :title="item.description">{{ item.description }}</span>
          </span>
          <span class="bw-installed-meta">
            <span>{{ item.version }}</span>
            <span v-if="item.hasSchema">schema</span>
            <span v-if="item.verified" class="ok">市场认证</span>
            <span v-if="item.insecure" class="danger">风险</span>
            <span v-if="item.deprecated" class="danger">废弃</span>
          </span>
        </button>
      </div>

      <div v-else class="bw-empty compact">
        {{ api.installedOptions.value.length ? '没有匹配的已安装插件。' : '没有可选的已安装插件。' }}
      </div>
    </div>

    <div class="bw-add-grid">
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
import { computed, ref, watch } from 'vue'
import MemberRow from '../components/MemberRow.vue'
import type { BundleDraftApi, MemberView } from '../composables/useBundleDraft'

const props = defineProps<{ api: BundleDraftApi }>()

const selectedInstalled = ref<string[]>([])
const installedKeyword = ref('')
const manualName = ref('')
const expanded = ref<Set<string>>(new Set())

const selectedInstalledSet = computed(() => new Set(selectedInstalled.value))
const availableInstalledCount = computed(() => props.api.installedOptions.value.filter(item => !item.added).length)
const filteredInstalled = computed(() => {
  const word = installedKeyword.value.trim().toLowerCase()
  return props.api.installedOptions.value.filter((item) => {
    if (!word) return true
    return [
      item.name,
      item.shortname,
      item.version,
      item.description,
      item.category,
    ].some(value => String(value ?? '').toLowerCase().includes(word))
  })
})
const filteredSelectable = computed(() => filteredInstalled.value.filter(item => !item.added))

watch(() => props.api.installedOptions.value, (options) => {
  const available = new Set(options.filter(item => !item.added).map(item => item.name))
  selectedInstalled.value = selectedInstalled.value.filter(name => available.has(name))
}, { deep: true })

function toggleExpanded(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function addInstalled() {
  if (!selectedInstalled.value.length) return
  props.api.addMembers(selectedInstalled.value)
  selectedInstalled.value = []
}

function toggleInstalled(name: string) {
  const item = props.api.installedOptions.value.find(item => item.name === name)
  if (!item || item.added) return
  const next = new Set(selectedInstalled.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  selectedInstalled.value = [...next]
}

function selectFiltered() {
  const next = new Set(selectedInstalled.value)
  for (const item of filteredSelectable.value) next.add(item.name)
  selectedInstalled.value = [...next]
}

function clearInstalledSelection() {
  selectedInstalled.value = []
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

.bw-installed-picker {
  display: grid;
  gap: var(--bw-gap-sm);
  margin-bottom: var(--bw-gap-md);
}

.bw-installed-toolbar {
  display: grid;
  grid-template-columns: auto minmax(16rem, 1fr) auto;
  align-items: center;
  gap: var(--bw-gap-sm);

  > div:first-child {
    display: grid;
    gap: 0.08rem;
  }
}

.bw-installed-search {
  min-width: 0;
}

.bw-installed-actions {
  display: flex;
  align-items: center;
  gap: var(--bw-gap-xs);
}

.bw-installed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16.5rem, 1fr));
  gap: var(--bw-gap-sm);
  max-height: 20rem;
  overflow: auto;
  padding: 2px;
}

.bw-installed-card {
  appearance: none;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.42rem 0.58rem;
  align-items: start;
  min-width: 0;
  border: var(--bw-border);
  border-radius: var(--bw-radius-sm);
  padding: 0.54rem 0.62rem;
  color: var(--fg1);
  background: var(--k-card-bg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--k-color-primary) 42%, var(--k-color-border));
    outline: none;
  }

  &.selected {
    border-color: color-mix(in srgb, var(--k-color-primary) 62%, var(--k-color-border));
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--k-color-primary) 10%, transparent), transparent 55%),
      var(--k-card-bg);
    box-shadow: inset 3px 0 0 var(--k-color-primary);
  }

  &.danger {
    border-color: color-mix(in srgb, var(--k-color-danger) 32%, var(--k-color-border));
  }

  &.added {
    cursor: default;
    opacity: 0.58;
    background: color-mix(in srgb, var(--k-side-bg) 72%, transparent);
  }
}

.bw-installed-check {
  grid-row: 1 / span 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.6rem;
  height: 1.35rem;
  border-radius: 999px;
  color: var(--fg2);
  background: color-mix(in srgb, var(--fg3) 10%, transparent);
  font-size: 0.72rem;
  font-weight: 600;

  .bw-installed-card.selected & {
    color: var(--k-color-primary);
    background: color-mix(in srgb, var(--k-color-primary) 12%, transparent);
  }
}

.bw-installed-main {
  min-width: 0;
  display: grid;
  gap: 0.12rem;

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.88rem;
  }
}

.bw-installed-package,
.bw-installed-desc {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bw-installed-package {
  color: var(--fg3);
  font-family: var(--bw-font-mono);
  font-size: 0.72rem;
}

.bw-installed-desc {
  color: var(--fg2);
  font-size: 0.75rem;
}

.bw-installed-meta {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 0.24rem;

  span {
    border-radius: 4px;
    padding: 0.04rem 0.34rem;
    color: var(--fg3);
    background: color-mix(in srgb, var(--fg3) 9%, transparent);
    font-size: 0.68rem;

    &.ok {
      color: var(--k-color-success);
      background: color-mix(in srgb, var(--k-color-success) 10%, transparent);
    }

    &.danger {
      color: var(--k-color-danger);
      background: color-mix(in srgb, var(--k-color-danger) 10%, transparent);
    }
  }
}

.bw-add-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
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
  .bw-installed-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .bw-installed-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .bw-installed-grid {
    grid-template-columns: 1fr;
    max-height: 18rem;
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

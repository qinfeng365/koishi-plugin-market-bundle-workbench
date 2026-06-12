<template>
  <k-layout main="bundle-workbench">
    <div class="bw-shell">
      <WorkbenchHeader
        :steps="flow.steps"
        :step-states="flow.stepStates.value"
        :current-step="flow.currentStep.value"
        :draft="draftApi.draft"
        :package-name-ok="draftApi.packageNameOk.value"
        :member-count="draftApi.members.length"
        :error-count="actionsApi.errorCount.value"
        :warning-count="actionsApi.warningCount.value"
        @go="flow.go"
      />

      <main class="bw-main">
        <ProjectStep v-if="flow.activeStep.value === 'project'" :api="draftApi" />
        <MembersStep v-else-if="flow.activeStep.value === 'members'" :api="draftApi" />
        <ConfigStep v-else-if="flow.activeStep.value === 'config'" :api="draftApi" />
        <ValidateStep v-else-if="flow.activeStep.value === 'validate'" :actions="actionsApi" />
        <ReleaseStep
          v-else-if="flow.activeStep.value === 'release'"
          :actions="actionsApi"
          :project-path="draftApi.projectPath.value"
        />
      </main>

      <WorkbenchFooter
        :primary-action-kind="flow.primaryActionKind.value"
        :primary-disabled="flow.primaryDisabled.value"
        :block-reason="flow.blockReason.value"
        :footer-hint="flow.footerHint.value"
        :is-first="flow.isFirst.value"
        :is-last="flow.isLast.value"
        :busy-validate="actionsApi.busy.validate"
        :busy-generate="actionsApi.busy.generate"
        @prev="flow.prev"
        @next="flow.next"
        @validate="actionsApi.validate"
        @generate="actionsApi.generate"
      />
    </div>
  </k-layout>
</template>

<script lang="ts" setup>
import WorkbenchHeader from './components/WorkbenchHeader.vue'
import WorkbenchFooter from './components/WorkbenchFooter.vue'
import ProjectStep from './steps/ProjectStep.vue'
import MembersStep from './steps/MembersStep.vue'
import ConfigStep from './steps/ConfigStep.vue'
import ValidateStep from './steps/ValidateStep.vue'
import ReleaseStep from './steps/ReleaseStep.vue'
import { useBundleDraft } from './composables/useBundleDraft'
import { useBundleActions } from './composables/useBundleActions'
import { useStepFlow } from './composables/useStepFlow'

const draftApi = useBundleDraft()

const actionsApi = useBundleActions({
  buildPayload: draftApi.buildPayload,
  projectPath: draftApi.projectPath,
})

const flow = useStepFlow({
  packageNameOk: draftApi.packageNameOk,
  members: draftApi.members,
  errorCount: actionsApi.errorCount,
  validation: actionsApi.validation,
  generated: actionsApi.generated,
})
</script>

<style lang="scss">
@use './style/workbench.scss';

.bundle-workbench {
  display: flex;
  min-height: 0;
  overflow: hidden;
}
</style>

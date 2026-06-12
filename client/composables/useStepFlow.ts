import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { GenerateResult, ValidationResult } from '../../src/shared'
import type { MemberView } from './useBundleDraft'

export type StepKey = 'project' | 'members' | 'config' | 'validate' | 'release'
export type StepState = 'done' | 'current' | 'error' | 'pending'
export type PrimaryActionKind = 'next' | 'validate' | 'generate'

export interface StepDef {
  key: StepKey
  label: string
  description: string
  blockReason?: () => string | null
}

interface StepFlowDeps {
  packageNameOk: ComputedRef<boolean>
  members: MemberView[]
  errorCount: ComputedRef<number>
  validation: Ref<ValidationResult | undefined>
  generated: Ref<GenerateResult | undefined>
}

export function useStepFlow(deps: StepFlowDeps) {
  const steps: StepDef[] = [
    {
      key: 'project',
      label: '项目',
      description: '定义插件包 npm 信息、关键词、dist-tag 和本地项目目录。',
      blockReason: () => deps.packageNameOk.value ? null : '包名格式不合法,需要 koishi-plugin-pa-*',
    },
    {
      key: 'members',
      label: '成员',
      description: '选择要打包的成员插件,声明版本范围、插件键和 required/optional。',
      blockReason: () => deps.members.length ? null : '至少添加一个成员插件',
    },
    {
      key: 'config',
      label: '配置',
      description: '审查每个成员的预设配置,检查敏感字段。',
    },
    {
      key: 'validate',
      label: '校验',
      description: '通过 npm 和清单规则检查插件包是否可以安全发布。',
    },
    {
      key: 'release',
      label: '发布',
      description: '下载 npm 发布包或源码 zip,也可以写入本地项目后 dry-run。',
    },
  ]

  const activeStep = ref<StepKey>('project')

  function indexOf(key: StepKey) {
    return steps.findIndex(step => step.key === key)
  }

  const currentStep = computed(() => steps[indexOf(activeStep.value)] ?? steps[0])

  const stepStates = computed<Record<StepKey, StepState>>(() => {
    const active = activeStep.value
    const activeIdx = indexOf(active)
    const result: Record<StepKey, StepState> = {
      project: 'pending',
      members: 'pending',
      config: 'pending',
      validate: 'pending',
      release: 'pending',
    }
    for (const step of steps) {
      const stepIdx = indexOf(step.key)
      if (step.key === active) {
        result[step.key] = 'current'
        continue
      }
      // Step-specific finish/error state.
      if (step.key === 'project') {
        if (deps.packageNameOk.value) result[step.key] = 'done'
        else if (stepIdx < activeIdx) result[step.key] = 'error'
      } else if (step.key === 'members') {
        if (deps.members.length) result[step.key] = 'done'
        else if (stepIdx < activeIdx) result[step.key] = 'error'
      } else if (step.key === 'config') {
        if (stepIdx < activeIdx) result[step.key] = 'done'
      } else if (step.key === 'validate') {
        if (deps.validation.value) {
          result[step.key] = deps.errorCount.value === 0 ? 'done' : 'error'
        }
      } else if (step.key === 'release') {
        if (deps.generated.value) result[step.key] = 'done'
      }
    }
    return result
  })

  const primaryActionKind = computed<PrimaryActionKind>(() => {
    if (activeStep.value === 'validate') return 'validate'
    if (activeStep.value === 'release') return 'generate'
    return 'next'
  })

  const blockReason = computed(() => currentStep.value.blockReason?.() ?? null)

  const primaryDisabled = computed(() => {
    if (primaryActionKind.value === 'next') return blockReason.value !== null
    return false
  })

  const footerHint = computed(() => {
    if (blockReason.value) return blockReason.value
    if (activeStep.value === 'validate') {
      if (!deps.validation.value) return '点击运行校验。'
      return deps.errorCount.value === 0
        ? '校验通过,可以进入下一步。'
        : `仍有 ${deps.errorCount.value} 个错误需要处理。`
    }
    if (activeStep.value === 'release') {
      return deps.generated.value ? '生成完毕,可下载或写入项目。' : '可直接下载,或先生成文件。'
    }
    const nextStep = steps[indexOf(activeStep.value) + 1]
    return nextStep ? `下一步:${nextStep.description}` : ''
  })

  function next() {
    const idx = indexOf(activeStep.value)
    if (idx < steps.length - 1) activeStep.value = steps[idx + 1].key
  }

  function prev() {
    const idx = indexOf(activeStep.value)
    if (idx > 0) activeStep.value = steps[idx - 1].key
  }

  function go(key: StepKey) {
    activeStep.value = key
  }

  const isFirst = computed(() => indexOf(activeStep.value) === 0)
  const isLast = computed(() => indexOf(activeStep.value) === steps.length - 1)

  return {
    steps,
    activeStep,
    currentStep,
    stepStates,
    primaryActionKind,
    primaryDisabled,
    blockReason,
    footerHint,
    isFirst,
    isLast,
    next,
    prev,
    go,
  }
}

export type StepFlowApi = ReturnType<typeof useStepFlow>

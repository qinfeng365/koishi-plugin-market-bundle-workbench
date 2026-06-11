import { Context, store } from '@koishijs/client'
import Workbench from './workbench.vue'
import './icons'

function findWorkbenchConfig(plugins: any): any {
  let fallback: any

  function visit(object: any): any {
    if (!object || typeof object !== 'object') return
    for (const rawKey of Object.keys(object)) {
      if (rawKey.startsWith('$')) continue
      const value = object[rawKey]
      if (!value || typeof value !== 'object') continue
      const disabled = rawKey.startsWith('~')
      const key = disabled ? rawKey.slice(1) : rawKey
      const name = key.split(':', 1)[0]
      if (name === 'market-bundle-workbench' || name === 'koishi-plugin-market-bundle-workbench') {
        if (!disabled) return value
        fallback ||= value
      }
      const nested = visit(value)
      if (nested) return nested
    }
  }

  return visit(plugins) ?? fallback
}

export function isWorkbenchEnabled() {
  return findWorkbenchConfig((store as any).config?.plugins)?.enableWorkbench === true
}

export default (ctx: Context) => {
  ctx.page({
    id: 'bundle-workbench',
    path: '/bundle-workbench',
    name: '插件包工作台',
    icon: 'activity:bundle-workbench',
    order: 760,
    authority: 4,
    fields: ['config', 'packages'],
    disabled: () => !isWorkbenchEnabled(),
    component: Workbench,
  })
}

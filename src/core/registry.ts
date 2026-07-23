import type { LauncherAdapter } from '../index.type'
import { presets } from '../adapters'

const registry = new Map<string, LauncherAdapter>()
for (const adapter of presets) registry.set(adapter.platform, adapter)

/** 运行时持久注册额外适配器（扩展点，无需修改本文件） */
export function registerAdapter(adapter: LauncherAdapter): void {
  registry.set(adapter.platform, adapter)
}

/** 根据平台获取适配器；extra 中的适配器优先匹配。 */
export function getAdapter(platform: string) {
  return registry.get(platform)
}

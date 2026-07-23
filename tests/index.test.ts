import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolve } from 'node:path'
import type { LauncherAdapter, OpenScriptContext } from '../src/index.type'
import type { PathLike } from 'node:fs'

// 隔离 zx（命令执行器）与 fs.existsSync（路径存在性）
vi.mock('zx', () => ({
  $: vi.fn<(strings: TemplateStringsArray, ...values: string[]) => Promise<unknown>>(),
}))
vi.mock('node:fs', () => ({ existsSync: vi.fn<(path: PathLike) => boolean>(() => true) }))
// 隔离重依赖：index → registry → adapters 会间接导入 tt-ide-cli，
// 它在测试环境求值时本身会抛错，用桩替代（minidev 已不再被 src 使用，无需 mock）
vi.mock('tt-ide-cli', () => ({
  open: vi.fn<(opts: { project: { path: string } }) => Promise<unknown>>(),
}))

import VitePlugin from '../src/index'
import { registerAdapter } from '../src/core/registry'

// VitePlugin 标注返回 vite 的 Plugin，其 apply/configResolved/closeBundle 在类型上
// 是「可能未定义 / 联合类型」，无法直接调用。这里用结构化类型描述测试实际用到的
// 返回对象形状，便于在用例中安全地调用与断言。
type TestPlugin = {
  name: string
  apply: () => boolean
  configResolved: (config: { root: string; mode: string }) => void
  closeBundle: () => void | Promise<void>
}

// 用可控的伪适配器验证「打开项目」链路，避免真正拉起开发工具
const fakeAdapter: LauncherAdapter = {
  platform: 'mp-fake',
  name: 'FakeTool',
  envKey: 'FAKE_DEVTOOLS',
  resolveAppPath: () => ({ path: ['/fake/app'] }),
  runOpenScript: vi.fn<(ctx: OpenScriptContext) => Promise<void>>(async () => {}),
}

describe('VitePlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('UNI_PLATFORM', '')
    vi.stubEnv('FAKE_DEVTOOLS', '')
    registerAdapter(fakeAdapter)
  })

  afterEach(() => vi.unstubAllEnvs())

  it('返回带有固定名称的 Vite 插件', () => {
    const plugin = VitePlugin() as unknown as TestPlugin
    expect(plugin.name).toBe('vite-plugin-uni-launcher')
  })

  it('无适配器且未启用时 apply() 为 false', () => {
    const plugin = VitePlugin() as unknown as TestPlugin
    expect(plugin.apply()).toBe(false)
  })

  it('显式 enabled 时 apply() 为 true', () => {
    const plugin = VitePlugin({ enabled: true }) as unknown as TestPlugin
    expect(plugin.apply()).toBe(true)
  })

  it('UNI_PLATFORM 命中适配器时 apply() 为 true', () => {
    vi.stubEnv('UNI_PLATFORM', 'mp-fake')
    vi.stubEnv('FAKE_DEVTOOLS', '/fake/app')
    const plugin = VitePlugin() as unknown as TestPlugin
    expect(plugin.apply()).toBe(true)
  })

  it('显式 enabled:false 时即使命中适配器 apply() 也为 false', () => {
    vi.stubEnv('UNI_PLATFORM', 'mp-fake')
    const plugin = VitePlugin({ enabled: false }) as unknown as TestPlugin
    expect(plugin.apply()).toBe(false)
  })

  it('configResolved + closeBundle 后通过适配器打开项目', async () => {
    vi.stubEnv('UNI_PLATFORM', 'mp-fake')
    vi.stubEnv('FAKE_DEVTOOLS', '/fake/app')

    const plugin = VitePlugin({ maxWait: 1000 }) as unknown as TestPlugin
    expect(plugin.apply()).toBe(true)

    // root 与 process.cwd() 一致时 isHbx 为 false，才会真正触发打开
    plugin.configResolved({ root: process.cwd(), mode: 'development' } as any)
    await plugin.closeBundle()

    expect(fakeAdapter.runOpenScript).toHaveBeenCalledTimes(1)
    const ctx = (fakeAdapter.runOpenScript as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(ctx.appPath).toBe('/fake/app')
    expect(ctx.project).toBe(resolve(process.cwd(), 'dist', 'dev', 'mp-fake'))
  })
})

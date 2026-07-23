import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LauncherAdapter } from '../src/index.type'

describe('registry', () => {
  // 每个用例重新加载模块，得到干净的注册表，避免用例间相互影响
  beforeEach(() => {
    vi.resetModules()
  })

  it('能按平台取到预设适配器', async () => {
    const { getAdapter } = await import('../src/core/registry')
    expect(getAdapter('mp-weixin')?.name).toBe('微信开发者工具')
    expect(getAdapter('mp-alipay')?.name).toBe('支付宝小程序开发者工具')
  })

  it('未知平台返回 undefined', async () => {
    const { getAdapter } = await import('../src/core/registry')
    expect(getAdapter('mp-unknown')).toBeUndefined()
  })

  it('registerAdapter 覆盖已存在的平台', async () => {
    const { getAdapter, registerAdapter } = await import('../src/core/registry')
    const custom: LauncherAdapter = {
      platform: 'mp-weixin',
      name: 'CustomTool',
      envKey: 'X',
      resolveAppPath: () => ({}),
      runOpenScript: async () => {},
    }
    registerAdapter(custom)
    expect(getAdapter('mp-weixin')).toBe(custom)
  })

  it('registerAdapter 注册新平台', async () => {
    const { getAdapter, registerAdapter } = await import('../src/core/registry')
    const custom: LauncherAdapter = {
      platform: 'mp-baidu',
      name: 'BaiduTool',
      envKey: 'X',
      resolveAppPath: () => ({}),
      runOpenScript: async () => {},
    }
    registerAdapter(custom)
    expect(getAdapter('mp-baidu')).toBe(custom)
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { join } from 'node:path'
import type { LauncherAdapter } from '../src/index.type'

// 隔离 fs.existsSync，便于控制「路径是否存在」
vi.mock('node:fs', () => ({
  existsSync: vi.fn<(path: PathLike) => boolean>(),
}))

import { existsSync, type PathLike } from 'node:fs'
import { buildWindowsPath, resolveFinalAppPath } from '../src/utils'

const mockExists = (predicate: (p: PathLike) => boolean) => {
  vi.mocked(existsSync).mockImplementation((p: PathLike) => predicate(p))
}

describe('buildWindowsPath', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('按「环境变量目录 → D 盘兜底目录」拼接候选路径', () => {
    vi.stubEnv('LOCALAPPDATA', 'C:/Users/me/AppData/Local')
    vi.stubEnv('PROGRAMFILES', 'C:/Program Files')
    vi.stubEnv('PROGRAMFILES(X86)', '')

    const result = buildWindowsPath('Tencent/tool.exe')
    expect(result).toEqual([
      join('C:/Users/me/AppData/Local', 'Programs', 'Tencent/tool.exe'),
      join('C:/Program Files', 'Tencent/tool.exe'),
      join('D:/Programs', 'Tencent/tool.exe'),
      join('D:/Program Files', 'Tencent/tool.exe'),
      join('D:/Program Files (x86)', 'Tencent/tool.exe'),
    ])
  })

  it('PROGRAMFILES(X86) 存在时追加其候选路径', () => {
    vi.stubEnv('LOCALAPPDATA', '')
    vi.stubEnv('PROGRAMFILES', '')
    vi.stubEnv('PROGRAMFILES(X86)', 'C:/Program Files (x86)')

    const result = buildWindowsPath('tool.exe')
    expect(result).toContain(join('C:/Program Files (x86)', 'tool.exe'))
  })

  it('D 盘兜底路径无论环境变量是否存在都会被追加', () => {
    vi.stubEnv('LOCALAPPDATA', '')
    vi.stubEnv('PROGRAMFILES', '')
    vi.stubEnv('PROGRAMFILES(X86)', '')

    const result = buildWindowsPath('x.exe')
    expect(result).toEqual([
      join('D:/Programs', 'x.exe'),
      join('D:/Program Files', 'x.exe'),
      join('D:/Program Files (x86)', 'x.exe'),
    ])
  })
})

describe('resolveFinalAppPath', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('适配器不存在时返回 undefined', () => {
    expect(resolveFinalAppPath(undefined)).toBeUndefined()
  })

  it('环境变量路径存在时优先返回它', () => {
    const adapter = {
      envKey: 'MY_TOOL',
      resolveAppPath: () => ({ path: ['/nope'] }),
    } as unknown as LauncherAdapter
    vi.stubEnv('MY_TOOL', '/env/path')
    mockExists(p => p === '/env/path')
    expect(resolveFinalAppPath(adapter)).toBe('/env/path')
  })

  it('环境变量路径不存在时回退到 resolveAppPath', () => {
    const adapter = {
      envKey: 'MY_TOOL',
      resolveAppPath: () => ({ path: ['/a', '/b'] }),
    } as unknown as LauncherAdapter
    vi.stubEnv('MY_TOOL', '')
    mockExists(p => p === '/a')
    expect(resolveFinalAppPath(adapter)).toBe('/a')
  })

  it('按当前平台选择 Windows / macOS 候选路径', () => {
    const spy = vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin')
    const adapter = {
      envKey: '',
      resolveAppPath: () => ({ macOS: ['/mac1', '/mac2'], Windows: ['/win'] }),
    } as unknown as LauncherAdapter
    mockExists(p => p === '/mac2')
    expect(resolveFinalAppPath(adapter)).toBe('/mac2')
    spy.mockRestore()
  })

  it('所有候选都不存在时返回 undefined', () => {
    const adapter = {
      envKey: '',
      resolveAppPath: () => ({ path: ['/x'] }),
    } as unknown as LauncherAdapter
    mockExists(() => false)
    expect(resolveFinalAppPath(adapter)).toBeUndefined()
  })
})

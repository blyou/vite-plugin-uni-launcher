import { describe, it, expect, vi } from 'vitest'
import { join } from 'node:path'
import { wechatAdapter } from '../src/adapters/wechat'
import { alipayAdapter } from '../src/adapters/alipay'

// zx 的 $ 仅作为命令执行器，这里用桩函数替代，捕获其调用
const $ = vi
  .fn<
    (
      strings: TemplateStringsArray,
      ...values: string[]
    ) => Promise<{ stdout: string; stderr: string }>
  >()
  .mockResolvedValue({ stdout: '', stderr: '' })

describe('wechatAdapter', () => {
  it('resolveAppPath 返回 Windows 候选路径', () => {
    const buildWindowsPath = vi.fn<(path: string) => string[]>().mockReturnValue(['/candidate'])
    const result = wechatAdapter.resolveAppPath({ buildWindowsPath })
    expect(result.Windows).toEqual(['/candidate', '/candidate'])
  })

  it('runOpenScript 以 cli 命令打开项目', async () => {
    $.mockClear()
    await wechatAdapter.runOpenScript({
      $,
      appDir: '/app',
      appPath: '/app/cli.bat',
      cliName: 'cli.bat',
      project: '/proj',
    } as any)

    expect($).toHaveBeenCalledTimes(1)
    const call = $.mock.calls[0]
    // 模板标签调用：第 0 参数是字符串数组，后续是插值变量
    expect(call[0]).toEqual(['', ' open --project ', ''])
    expect(call[1]).toBe(join('/app', 'cli.bat'))
    expect(call[2]).toBe('/proj')
  })
})

describe('alipayAdapter', () => {
  it('resolveAppPath 返回 Windows 候选路径', () => {
    const buildWindowsPath = vi.fn<(path: string) => string[]>().mockReturnValue(['/candidate'])
    const result = alipayAdapter.resolveAppPath({ buildWindowsPath })
    expect(result.Windows).toEqual(['/candidate', '/candidate'])
  })

  it('runOpenScript 以 npx minidev 命令打开项目', async () => {
    $.mockClear()
    await alipayAdapter.runOpenScript({
      $,
      appDir: '/app',
      appPath: '/app',
      cliName: 'cli.bat',
      project: '/proj',
    } as any)

    expect($).toHaveBeenCalledTimes(1)
    const call = $.mock.calls[0]
    expect(call[0]).toEqual(['npx minidev ide --app-path ', ' --project ', ''])
    expect(call[1]).toBe('/app')
    expect(call[2]).toBe('/proj')
  })
})

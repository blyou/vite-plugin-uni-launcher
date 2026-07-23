import { normalizePath, type Plugin } from 'vite'
import { existsSync } from 'node:fs'
import path, { resolve } from 'node:path'
import { $ } from 'zx'
import { getAdapter, registerAdapter } from './core/registry'
import type { LauncherAdapter, UniLauncherOptions } from './index.type'
import { resolveFinalAppPath } from './utils'

const PREFIX = '[vite-plugin-uni-launcher]'

/**
 * 阻止 zx 的默认行为：zx 会探测 PATH 里的 shell（如 WSL/git-bash），
 * 并在每条命令前注入 bash 前缀 `set -euo pipefail;`，在 Windows 上会导致
 * `.bat` 跑不起来、中文输出乱码。这里在模块顶层（任何 `$` 执行前）无条件覆盖，
 * 优先级高于 zx 的自动探测；随后把配置好的 `$` 透传给适配器。
 */
if (process.platform === 'win32') {
  $.shell = process.env.comspec || 'cmd.exe' // 强制 cmd.exe，绕过 WSL/bash 探测
  $.prefix = 'chcp 65001 >nul && ' // 切到 UTF-8 代码页，解决中文路径/输出乱码，且替换掉 bash 前缀
  $.quote = s => `"${s}"`
}

/**
 * 核心配置层：Vite 插件工厂。
 *
 * 职责：
 *  1. 解析目标平台（options.platform ?? UNI_PLATFORM）
 *  2. 通过注册表取得对应适配器（平台适配层）
 *  3. 等待产物资源就绪后，以「一次」原则调用适配器的打开命令
 *
 * 本函数不感知任何具体开发工具——所有工具差异都封在 LauncherAdapter 实现里。
 */
export default function VitePlugin(options: UniLauncherOptions = {}): Plugin {
  options.adapters?.forEach(adapter => registerAdapter(adapter))
  const platform = process.env.UNI_PLATFORM ?? ''
  const adapter = getAdapter(platform)

  let isHbx: boolean

  const enabled = options.enabled ?? !!adapter
  const maxWait = options.maxWait ?? 30_000
  let opened = false

  const appPath = resolveFinalAppPath(adapter)
  let projectPath = ''

  /** 执行适配器的打开命令（脚本由适配器用透传的 $ 自行运行） */
  async function openWith(options: {
    adapter: LauncherAdapter
    appDir: string
    appPath: string
    cliName: string
    project: string
  }): Promise<void> {
    // $.shell / $.prefix / $.quote 已在模块顶层强制设置（绕过 zx 对 WSL/bash 的自动探测）；
    // 若适配器显式指定了 shell 则再覆盖一次。
    if (options.adapter.shell) $.shell = options.adapter.shell
    // $.verbose = true
    try {
      await options.adapter.runOpenScript({ $, ...options })
      process.stdout.write(`${PREFIX} 已用${options.adapter.name}打开项目：${options.project}\n`)
    } catch (err) {
      console.error(`${PREFIX} 启动${options.adapter.name}失败：${(err as Error).message}`)
    }
  }

  /** 等待资源就绪后再打开，避免目录尚未生成时拉起失败 */
  async function tryOpen(waitStart = Date.now()): Promise<void> {
    if (isHbx || !enabled || opened || !adapter) return
    if (!appPath) {
      console.warn(
        `${PREFIX} 未找到${adapter.name}，已跳过自动打开。` +
          `请确认已安装该工具，或通过 ${adapter.envKey} 环境变量指定工具路径。`,
      )
      return
    }
    if (!existsSync(projectPath)) {
      if (Date.now() - waitStart > maxWait) {
        console.warn(`${PREFIX} 等待项目资源超时（${maxWait}ms），未找到：${projectPath}`)
        return
      }
      setTimeout(() => tryOpen(waitStart), 1000)
      return
    }
    opened = true
    await openWith({
      adapter,
      appPath,
      appDir: path.dirname(appPath),
      cliName: adapter.cliName || '',
      project: projectPath,
    })
  }

  return {
    name: 'vite-plugin-uni-launcher',
    apply() {
      return enabled
    },
    configResolved(config) {
      isHbx = normalizePath(config.root) !== normalizePath(process.cwd())
      const distMode = config.mode === 'development' ? 'dev' : 'build'
      const subDir = adapter?.platform ?? platform
      projectPath = resolve(config.root, 'dist', distMode, subDir)
    },
    closeBundle() {
      tryOpen()
    },
  }
}

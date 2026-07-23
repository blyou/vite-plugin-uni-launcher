import type { $ as ZxShell } from 'zx'
import type { buildWindowsPath } from './utils'

/** 核心插件配置项（核心配置层，与具体小程序工具解耦） */
export interface UniLauncherOptions {
  /**
   * 是否启用（只在 uniapp cli 项目下生效）
   * @default 能匹配到对应适配器时自动启用
   */
  enabled?: boolean
  /** 注册额外适配器 */
  adapters?: LauncherAdapter[]
  /**
   * 资源未就绪时轮询等待的最大时长（毫秒）
   * @default 30000
   */
  maxWait?: number
}

/**
 * 执行「打开项目」时透传给适配器的上下文：
 * 核心层已按当前平台配好 shell / prefix（Windows 为 cmd.exe + UTF-8 代码页）与 quote，
 * 适配器直接用 $ 写脚本即可，无需关心平台差异与中文乱码。
 */
export interface OpenScriptContext {
  /** zx 的 $ 函数（已配置好 shell / prefix / quote） */
  $: ZxShell
  /** 开发工具目录路径 */
  appDir: string
  /** 探测到的开发工具路径（或环境变量指定的路径） */
  appPath: string
  /** cli名称 例：cli.bat */
  cliName: string
  /** 待打开的小程序项目目录 */
  project: string
}

/**
 * 平台适配层统一接口：核心配置层仅依赖此接口，不感知任何具体工具。
 * 新增平台 = 新增一个实现该接口的适配器，核心代码零改动。
 */
export interface LauncherAdapter {
  /** uni-app 平台标识，同时作为产物子目录名（如 mp-weixin / mp-alipay） */
  readonly platform: string
  /** 工具显示名称，仅用于日志 */
  readonly name: string
  /** 开发者工具路径环境变量名 */
  readonly envKey: string
  /** zx 执行命令时使用的 shell，Windows 一般默认为 cmd.exe */
  readonly shell?: string
  /** 开发者工具命令行工具文件名 */
  readonly cliName?: string
  /** 探测开发者工具路径 */
  resolveAppPath(ctx: { buildWindowsPath: typeof buildWindowsPath }): {
    /** 优先级最高，覆盖其他 */
    path?: string[]
    macOS?: string[]
    Windows?: string[]
  }
  /** 执行「打开项目」：适配器自行用传入的 $ 运行命令，核心层不再拼接/执行 */
  runOpenScript(ctx: OpenScriptContext): Promise<unknown>
}

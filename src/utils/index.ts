import { join } from 'node:path'
import type { LauncherAdapter } from '../index.type'
import { existsSync } from 'node:fs'

/**
 * 拼接 Windows 下某工具的候选安装路径。
 *
 * 优先探测用户默认安装位置 (process.env.PROGRAMFILES 等环境变量目录)，再补充常见的 D 盘兜底路径，
 * 供适配器按顺序逐个尝试，命中存在的开发者工具路径即止。
 *
 * @param path 相对子路径片段（如 `Tencent/微信web开发者工具/微信开发者工具.exe`），会拼接到各安装根目录之后
 * @returns 候选绝对路径数组，按「环境变量目录 → 常见 D 盘目录」的优先级排列
 */
export function buildWindowsPath(path: string): string[] {
  const list: string[] = []
  // 当前用户局部安装目录：C:\Users\<user>\AppData\Local\Programs
  if (process.env.LOCALAPPDATA) list.push(join(process.env.LOCALAPPDATA, 'Programs', path))
  // 系统级 64 位程序目录：C:\Program Files
  if (process.env.PROGRAMFILES) list.push(join(process.env.PROGRAMFILES, path))
  // 系统级 32 位程序目录：C:\Program Files (x86)
  if (process.env['PROGRAMFILES(X86)']) list.push(join(process.env['PROGRAMFILES(X86)'], path))
  // 常见 D 盘兜底路径（部分用户习惯将工具安装到 D 盘）
  list.push(join('D:/Programs', path))
  list.push(join('D:/Program Files', path))
  list.push(join('D:/Program Files (x86)', path))
  return list
}

export function resolveFinalAppPath(adapter: LauncherAdapter | undefined) {
  if (!adapter) return undefined
  const fromEnv = adapter.envKey ? process.env[adapter.envKey] : undefined
  if (fromEnv && existsSync(fromEnv)) return fromEnv

  const resolved = adapter.resolveAppPath({ buildWindowsPath })
  let appPaths: string[]
  if (resolved.path) appPaths = resolved.path
  else if (process.platform === 'win32' && resolved.Windows) appPaths = resolved.Windows
  else if (process.platform === 'darwin' && resolved.macOS) appPaths = resolved.macOS
  else appPaths = []

  return appPaths.find(p => existsSync(p))
}

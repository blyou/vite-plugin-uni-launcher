import { join } from 'node:path'
import type { LauncherAdapter } from '../index.type'

/**
 * 微信小程序开发者工具适配器
 * 命令：cli open --project <path>
 * 文档：需在「设置 → 安全」中开启服务端口
 */
export const wechatAdapter: LauncherAdapter = {
  platform: 'mp-weixin',
  name: '微信开发者工具',
  envKey: 'WEIXIN_IDE_PATH',
  cliName: 'cli.bat',
  resolveAppPath({ buildWindowsPath }) {
    return {
      Windows: [
        ...buildWindowsPath('Tencent/微信web开发者工具/微信开发者工具.exe'),
        ...buildWindowsPath('微信web开发者工具/微信开发者工具.exe'),
      ],
    }
  },
  async runOpenScript({ $, appDir, cliName, project }) {
    await $`${join(appDir, cliName)} open --project ${project}`
  },
}

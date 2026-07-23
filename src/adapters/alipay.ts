import type { LauncherAdapter } from '../index.type'

/**
 * 支付宝（蚂蚁）小程序开发者工具适配器
 * 命令：npx minidev ide --app-path <cli> --project <path>
 * 说明：支付宝 IDE 安装目录与可执行文件名因版本而异，
 *   若自动探测失败，请用环境变量 ALIPAY_DEVTOOLS 指定开发者工具绝对路径。
 */
export const alipayAdapter: LauncherAdapter = {
  platform: 'mp-alipay',
  name: '支付宝小程序开发者工具',
  envKey: 'ALIPAY_IDE_PATH',
  resolveAppPath({ buildWindowsPath }) {
    return {
      Windows: [
        ...buildWindowsPath('小程序开发者工具/小程序开发者工具.exe'),
        ...buildWindowsPath('alipay/小程序开发者工具/小程序开发者工具.exe'),
      ],
    }
  },
  async runOpenScript({ $, appDir, project }) {
    await $`npx minidev ide --app-path ${appDir} --project ${project}`
  },
}

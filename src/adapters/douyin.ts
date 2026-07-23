import type { LauncherAdapter } from '../index.type'

export const douyinAdapter: LauncherAdapter = {
  platform: 'mp-toutiao',
  name: '抖音开发者工具',
  envKey: 'TT_IDE_PATH',
  resolveAppPath({ buildWindowsPath }) {
    return {
      Windows: buildWindowsPath('@bytedminiprogram-ide'),
    }
  },
  async runOpenScript({ $, project }) {
    await $`npx tma open ${project}`
  },
}

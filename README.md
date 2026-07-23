# vite-plugin-uni-launcher

一个用于 **uni-app（cli 工程）** 的 Vite 插件：构建/开发完成后，**自动拉起对应小程序开发者工具并打开当前项目**，省去手动在 IDE 里定位 `dist` 目录的重复操作。

> 适用场景：使用 `@vue/cli-plugin-uni` / `vite` 的 uni-app 项目，需要「打包完成即打开微信/支付宝/抖音开发者工具」。

## 特性

- 🚀 资源就绪后**自动打开**对应平台的开发者工具，无需手动操作
- 🧩 **平台适配层**：新增平台只需实现一个 `LauncherAdapter`，核心逻辑零改动
- 🔌 支持运行时通过 `adapters` 选项注册自定义适配器（扩展点）
- ⏱ 资源未就绪时按 `maxWait` 轮询等待，超时自动跳过

## 安装

npm

```bash
npm i -D vite-plugin-uni-launcher
```

pnpm

```bash
pnpm add -D vite-plugin-uni-launcher
```

## 快速上手

插件会读取 `process.env.UNI_PLATFORM`（uni-app 在构建时自动注入，如 `mp-weixin`），
据此匹配内置适配器并自动启用，因此**通常无需任何配置**：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import UniLauncher from 'vite-plugin-uni-launcher'

export default defineConfig({
  plugins: [UniLauncher()],
})
```

启动开发/构建后，产物资源生成即会自动打开对应开发者工具：

```bash
# 以微信小程序为例（UNI_PLATFORM 由 uni-app 注入）
npm run dev:mp-weixin
```

## 配置项

`UniLauncher(options?: UniLauncherOptions)`

| 选项       | 类型                | 默认值                    | 说明                                             |
| ---------- | ------------------- | ------------------------- | ------------------------------------------------ |
| `enabled`  | `boolean`           | 匹配到适配器时自动 `true` | 是否启用。仅在 uni-app cli 项目下有意义          |
| `adapters` | `LauncherAdapter[]` | `[]`                      | 额外注册的自定义适配器（扩展点）                 |
| `maxWait`  | `number`            | `30000`                   | 资源未就绪时轮询等待的最长毫秒数，超时则跳过打开 |

```ts
UniLauncher({
  enabled: true,
  maxWait: 60_000,
  adapters: [myCustomAdapter],
})
```

## 支持的平台

内置以下适配器；当 `UNI_PLATFORM` 命中对应 `platform` 时自动启用。

| 平台         | `platform`   | 开发者工具             | 路径环境变量      | 打开方式                           |
| ------------ | ------------ | ---------------------- | ----------------- | ---------------------------------- |
| 微信小程序   | `mp-weixin`  | 微信开发者工具         | `WEIXIN_IDE_PATH` | `cli.bat open --project <project>` |
| 支付宝小程序 | `mp-alipay`  | 支付宝小程序开发者工具 | `ALIPAY_IDE_PATH` | `minidev.startIde(...)`            |
| 抖音小程序   | `mp-toutiao` | 抖音开发者工具         | `TT_IDE_PATH`     | `tt-ide-cli open(...)`             |

若自动探测失败，请用对应的**环境变量**指定开发者工具的绝对路径，优先级最高。

## 工作原理

1. `configResolved` 阶段根据 `config.root` 与当前 `mode`（development → `dev`，build → `build`）及平台，算出待打开的项目目录：

   ```
   <root>/dist/<mode>/<platform>
   ```

2. `closeBundle` 阶段若已启用且匹配到适配器，则轮询等待上述目录生成（最多 `maxWait` 毫秒）。
3. 目录就绪后，调用适配器 `runOpenScript`，由适配器用已配置好 `shell` / `prefix` 的 `$` 拉起开发者工具。

## 自定义适配器（扩展点）

实现 `LauncherAdapter` 接口，再通过 `adapters` 选项注册即可，无需改动库源码：

```ts
import type { LauncherAdapter } from 'vite-plugin-uni-launcher'

const myAdapter: LauncherAdapter = {
  platform: 'mp-myplatform',
  name: '我的开发者工具',
  envKey: 'MY_DEVTOOLS', // 可选：用环境变量指定工具路径
  resolveAppPath({ buildWindowsPath }) {
    // 返回候选路径；path 优先级最高，其次按平台用 Windows / macOS
    return { Windows: buildWindowsPath('MyTool/MyTool.exe') }
  },
  async runOpenScript({ $, appDir, project }) {
    // 用透传的 $ 执行打开命令 或者调用 Node.JS API
    await $`${appDir}/cli open --project ${project}`
  },
}

UniLauncher({ adapters: [myAdapter] })
```

## 开发

```bash
pnpm install        # 安装依赖
pnpm test           # 运行单元测试（vitest，监听模式）
pnpm run build      # 构建库（tsdown，输出 dist/）
pnpm run typecheck  # 类型检查
pnpm run lint       # 代码检查（oxlint + eslint）
```

## License

[MIT](./LICENSE)

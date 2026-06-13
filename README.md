# koishi-plugin-market-bundle-workbench

Koishi 插件包制作与发布工作台。它面向插件作者，用一个固定向导完成 `koishi-plugin-pa-*` 插件包的创建、成员选择、预设配置审查、npm 校验、文件生成、压缩包下载和发布命令生成。

这个插件只负责“制作与发布准备”。插件包的识别、安装、成员配置分组和卸载管理由 [koishi-plugin-market-next](https://github.com/qinfeng365/koishi-plugin-market-next) 负责。

## 为什么需要它

Market NEXT 的插件包允许开发者把一组 Koishi 插件作为一个独立 npm 插件发布到市场中。典型场景包括：

- 整理一套实用插件，用户安装插件包后即可一次性安装全部成员。
- 发布小型插件生态，例如核心插件加多个外围插件。
- 为新用户提供预设组合，同时让高级用户在安装前选择成员和审查配置。

手写插件包容易出错：npm 包名必须小写、成员版本不能缺省、`market:package` keyword 容易忘、预设配置存在安全风险、版本是否已发布需要反复查。工作台把这些步骤收进一条可检查的发布流。

## 特性

- 分步发布向导：项目、成员、配置审计、校验、生成与发布。
- 支持 `koishi-plugin-pa-*` 和 `@scope/koishi-plugin-pa-*` 插件包命名。
- 可从已安装插件选择成员，也可手动输入 npm 包名。
- 每个成员可设置包名、插件键、版本范围、必选/可选和预设配置。
- 预设配置支持 JSON 预览，并提示敏感字段。
- 校验 npm 包存在性、版本占用、成员版本范围、自引用、重复成员、直接循环和缺少 `market:package`。
- 生成 `package.json`、`koishi.bundle`、`README.md` 和 `lib/index.js`。
- 支持下载 npm-ready `.tgz`，由 `npm pack` 真实生成。
- 支持下载源码 `.zip`，便于开发者本地审查和二次编辑。
- 支持写入本地项目目录、预览覆盖差异和运行 `npm pack --dry-run`。
- 不保存 npm token，不代替用户执行 `npm publish`。

## 安装

在 Koishi 中安装：

```bash
npm install koishi-plugin-market-bundle-workbench@alpha
```

如果你希望在 Koishi 控制台的插件市场里安装，推荐同时安装 Market NEXT：

```bash
npm install koishi-plugin-market-next@alpha
npm install koishi-plugin-market-bundle-workbench@alpha
```

启用插件后，在配置页打开：

```yaml
enableWorkbench: true
```

默认不开启工作台页面，避免普通用户的控制台出现开发者工具入口。

## 使用流程

1. 打开 Koishi 控制台中的“插件包工作台”。
2. 在“项目”步骤填写插件包名、版本、显示名、描述、keywords、dist-tag 和可选项目目录。
3. 在“成员”步骤选择已安装插件，或手动输入成员 npm 包名。
4. 在“配置审计”步骤检查每个成员的预设配置。含 `command`、`script`、`exec`、`path`、`token`、`sql`、`url` 等字段时应特别审查。
5. 在“校验”步骤运行 npm 与清单校验，确认没有 error。
6. 在“生成与发布”步骤生成文件，并选择一种发布方式。

## 推荐发布方式

### 下载 npm 发布包

这是推荐方式。工作台会创建临时目录，写入生成文件，执行真实的：

```bash
npm pack --json
```

然后把生成的 `.tgz` 返回给浏览器下载。开发者在本机执行：

```bash
npm publish ./koishi-plugin-pa-example-0.1.0.tgz --tag alpha
```

scoped 包需要公开发布：

```bash
npm publish ./scope-koishi-plugin-pa-example-0.1.0.tgz --tag alpha --access public
```

这种方式最接近真实 npm 产物，适合确认后直接发布。

### 下载源码 zip

源码 zip 包含同样的生成文件：

- `package.json`
- `README.md`
- `lib/index.js`

下载后可以解压、审查、修改，再在本机运行：

```bash
npm pack --dry-run
npm publish --tag alpha
```

### 写入本地项目

如果你已经准备了一个本地插件包项目，可以填写项目目录并使用“写入项目”。工作台默认不会覆盖已有文件，除非显式勾选允许覆盖。写入后可直接在该目录运行：

```bash
npm pack --dry-run
npm publish --tag alpha
```

## 插件包格式

真实 npm 包名必须使用小写：

- `koishi-plugin-pa-xxx`
- `@scope/koishi-plugin-pa-xxx`

`koishi-plugin-PA-xxx` 只能作为概念写法，不是合法 npm 包名。

推荐添加 keyword：

```json
{
  "keywords": ["koishi", "plugin", "market:package"]
}
```

核心清单位于 `package.json` 的 `koishi.bundle`：

```json
{
  "koishi": {
    "bundle": {
      "label": "Dialogue 插件包",
      "description": "一组对话系统相关插件。",
      "members": [
        {
          "package": "koishi-plugin-dialogue",
          "plugin": "dialogue",
          "version": "^1.0.0",
          "required": true,
          "config": {}
        }
      ]
    }
  }
}
```

`members[].version` 必填。工作台不会默认使用 `latest`，因为这会让用户安装到插件包作者没有确认过的破坏性版本。

## 生成的包会做什么

插件包自身是一个很薄的 Koishi 插件入口：

```js
'use strict'

exports.name = 'pa-example'

exports.apply = function apply() {
  // This package is a Market NEXT plugin bundle manifest.
  // Runtime behavior is provided by the bundle members.
}
```

也就是说，插件包本身不应该承载业务逻辑。它的职责是把成员清单和版本约束发布到 npm，并交给 Market NEXT 展开安装和管理。

## 安全边界

工作台刻意不做这些事：

- 不保存 npm token。
- 不在服务器端执行 `npm publish`。
- 不绕过 npm 登录态和二次确认。
- 不默认启用成员插件。
- 不把预设配置静默注入用户环境。

原因很简单：插件包可能包含多个成员和预设配置，发布动作也会影响公开 npm 包。最终发布应该发生在开发者自己的本机 npm 环境中。

## 配置项

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `enableWorkbench` | `false` | 是否启用控制台“插件包工作台”页面。 |
| `npmRegistry` | `https://registry.npmjs.org` | 用于校验 npm 包信息的 registry。 |
| `defaultDistTag` | `alpha` | 生成发布命令时使用的默认 dist-tag。 |
| `allowPublishCommand` | `false` | 是否显示 `npm publish` 命令。插件仍不会代为执行发布。 |

## Console 事件

工作台注册以下只面向控制台的事件：

| 事件 | 作用 |
| --- | --- |
| `bundle-workbench/npm-info(name)` | 查询 npm 包是否存在、版本、作者、维护者和 keywords。 |
| `bundle-workbench/validate(draft)` | 校验插件包草稿，返回 error / warning / info。 |
| `bundle-workbench/generate(draft)` | 生成 `package.json`、`koishi.bundle`、`lib/index.js`、README 和发布命令。 |
| `bundle-workbench/download-archive(draft, type)` | 生成并下载 `npm-tgz` 或 `source-zip`。 |
| `bundle-workbench/write-files(projectPath, draft, options)` | 写入本地项目目录，支持 dry-run 和覆盖控制。 |
| `bundle-workbench/pack-dry-run(projectPath)` | 在项目目录运行 `npm pack --dry-run`。 |

## 本地开发

```bash
npm install
npm run build
npm run check:package
```

脚本说明：

- `npm run build`：构建 TypeScript、后端入口和控制台前端产物。
- `npm run check:package`：运行 `npm pack --dry-run`，确认发布包内容。

## CI 与发布

仓库包含两个 GitHub Actions workflow：

- `CI`：在 push / pull request 时运行安装、构建和打包检查。
- `Publish`：在 `v*` tag 或手动触发时发布 npm，发布前检查 tag/input 版本必须等于 `package.json`。

发布 alpha 版本时建议：

```bash
npm version 0.2.0-alpha.2 --no-git-tag-version
npm run build
npm run check:package
npm publish --tag alpha
```

## License

AGPL-3.0

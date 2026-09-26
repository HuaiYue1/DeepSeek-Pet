# DeepSeek-Pet

[![Built with Claude Code](https://img.shields.io/badge/Built_with-Claude_Code-D97757)](https://claude.com/claude-code)
[![Art by ChatGPT](https://img.shields.io/badge/Art_by-ChatGPT-10A37F)](https://chatgpt.com)
[![Release](https://img.shields.io/github/v/release/HuaiYue1/DeepSeek-Pet)](https://github.com/HuaiYue1/DeepSeek-Pet/releases/latest)

一只以 DeepSeek 为原型的桌面宠物：鲸鱼娘 DeepSeek-Pet，外号大肥鱼。

**这是一个 AI 编程作品。** 仓库里的每一行代码都是 AI 编程工具 [Claude Code](https://claude.com/claude-code) 写的，立绘是 ChatGPT 画的。作者一行代码也没写，只负责出主意、生图、挑图、试用和提意见。从第一版草图到 v1.0.0 发布，前后不到一天。

![DeepSeek-Pet 角色设定图](art/character-sheet.png)

## AI 编程

整个项目是在和 Claude Code 的对话里做出来的：人说想要什么、哪里不满意，AI 写代码、测试、提交、打包、发布。

| 谁 | 做了什么 |
| --- | --- |
| 作者 | 出主意，给参考图，用 ChatGPT 按提示词生图，试用，提意见 |
| Claude Code | 设计角色，写出图提示词；写桌宠程序（Electron）、拖动的物理模拟、对齐立绘和写字的脚本；在虚拟屏幕里跑测试；搭 GitHub Actions 打包发布；写文档 |
| ChatGPT | 按提示词画出 9 个状态的立绘 |

几个来回的例子：

- **「能不能做一个 DeepSeek 大肥鱼形象的桌面宠物？」** AI 先自己画了两版矢量立绘，作者都不满意，要和参考图一样的画风。于是 AI 写好提示词，作者用 ChatGPT 按参考图的画风出图，AI 再用脚本统一身高、按脚底对齐，把「服务器繁忙」「嗯，用户说……」这些梗写进牌子和思考泡泡。
- **「我的屏幕是 4K 的，图片够清楚吗？」** 作者用 ChatGPT 出了一组高清透明图，AI 把它们接进出图流程，还加了「特大」档。
- **「挪宠物的时候感觉动作不太真实」** AI 把拖动时固定的摆动动画换成物理模拟（[`app/swing.js`](app/swing.js)）：先离线模拟调参数，再在虚拟屏幕里用真实的鼠标事件测摆动、落地，以及她会不会被窗口边缘切掉。

每个提交都是 AI 写的，提交信息末尾有 Claude 的署名（`Co-Authored-By`），整个过程可以在[提交记录](https://github.com/HuaiYue1/DeepSeek-Pet/commits/main)里一步步看到。

## 下载

到 [Releases](https://github.com/HuaiYue1/DeepSeek-Pet/releases/latest) 下载最新版：

- **Windows**：`DeepSeek-Pet-Setup-*.exe` 是安装版，`DeepSeek-Pet-*-portable.exe` 是免安装版，双击就能用。
- **macOS**：`*-arm64.dmg` 给 M 系列芯片，`*-x64.dmg` 给 Intel 芯片。

安装包没有做代码签名：

- **Windows**：弹出「Windows 已保护你的电脑」时，点「更多信息 → 仍要运行」。
- **macOS**：第一次右键点 App 选「打开」。如果提示「已损坏」，在终端执行 `xattr -cr /Applications/DeepSeek-Pet.app`。

## 从源码运行

```bash
npm install
npm start
```

## 怎么玩

| 操作 | 反应 |
| --- | --- |
| 按住拖动 | 把她拎到任何地方，位置会记住。她挂在你抓住的地方，跟着鼠标晃，放下时轻轻一蹲 |
| 单击 | 开心：「全部开源，MIT 协议，随便用～」 |
| 连点 3 下 | 无语：「……这题问过 128K 遍了。」 |
| 连点 5 下 | 服务器繁忙，请稍后再试。 |
| 双击 | 吃 Token |
| 右键 | 菜单：说点什么、喂 Token、深度思考、切换状态、大小、总在最前、开机启动、隐藏、退出 |
| 托盘图标 | 显示 / 隐藏、退出 |

放着不管时，她会自己找事做：深度思考（一边打字一边计时「已深度思考（用时 N 秒）」，然后顿悟）、打招呼、吃 Token、偶尔翻个白眼。两分钟没人理她就睡着；北京时间 00:30–08:30 是 DeepSeek 的错峰优惠时段，这时她更容易犯困。鼠标移到她身上就会醒。

只有她身上的像素能点到，旁边的透明区域不挡鼠标，照常点下面的桌面。

大小有小、中、大、特大四档，默认是「中」。状态图约 1300 像素高，4K 屏开 200% 缩放时，连「特大」都是清晰的。

## 发布新版本

每个 PR 和推到 `main` 的提交都会由 GitHub Actions 打包，在 **Actions → build** 的运行页面底部 Artifacts 里能下到还没发布的版本。`main` 分支受保护：改动要走 PR，Windows 和 macOS 都打包成功才能合并。

要发布到 Releases：改 `package.json` 里的 `version`，把这一版的说明写进 [`.github/release-notes.md`](.github/release-notes.md)，然后推一个同名的 tag（比如 `v1.0.1`），或者在 **Actions → build** 里点 **Run workflow** 并勾选 release。它会打好 Windows 和 macOS 版，打上 tag 并发布。

## 目录

| 路径 | 内容 |
| --- | --- |
| `app/` | 桌宠程序（Electron）：主进程、页面、交互逻辑、图标 |
| `art/` | 立绘、状态图和出图工具，见 [`art/README.md`](art/README.md) |

粉丝二创作品，和 DeepSeek 官方没有关系。

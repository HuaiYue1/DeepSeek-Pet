# DeepSeek-Pet

[![Built with Claude Code](https://img.shields.io/badge/Built_with-Claude_Code-D97757)](https://claude.com/claude-code)
[![Art by ChatGPT](https://img.shields.io/badge/Art_by-ChatGPT-10A37F)](https://chatgpt.com)
[![Release](https://img.shields.io/github/v/release/HuaiYue1/DeepSeek-Pet)](https://github.com/HuaiYue1/DeepSeek-Pet/releases/latest)

一只以 DeepSeek 为原型的桌面宠物：鲸鱼娘 DeepSeek-Pet，外号大肥鱼。

![DeepSeek-Pet 角色设定图](art/character-sheet.png)

## AI 编程

这是一个 AI 编程作品：代码由 Claude Code 编写，立绘由 ChatGPT 生成，作者负责提想法、挑图和试用反馈。

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
| 按住拖动 | 把她拎到任何地方，位置会记住。拎着走时她会随着动作轻轻倾斜，头发和裙摆被甩起来，两只脚乱蹬；放下时轻轻一蹲 |
| 单击 | 开心，冒小爱心：「全部开源，MIT 协议，随便用～」 |
| 连点 3 下 | 无语：「……这题问过 128K 遍了。」 |
| 连点 5 下 | 服务器繁忙，请稍后再试。 |
| 双击 | 吃 Token，金币飞进嘴里 |
| 鼠标靠近 | 转过身来看你；鼠标放到她身上，走着路也会停下来 |
| 右键 | 菜单：说点什么、喂 Token、深度思考、切换状态、大小、自己走动、跨屏幕走动、总在最前、开机启动、检查更新、隐藏、退出 |
| 托盘图标 | 显示 / 隐藏、退出 |

放着不管时，她会自己动起来：

- 沿着屏幕左右溜达，两只脚轮流迈步，有时小跑、蹦一下；走到屏幕边上就掉头。不想让她乱跑，右键取消「自己走动」。
- 有好几块屏幕时，她会走到隔壁屏幕去玩；两块屏幕高低不一样，她就跳上跳下。只想让她待在一块屏幕上，右键取消「跨屏幕走动」。
- 站在任务栏（或 Dock）上时，她会走过去假装点一下任务栏上的图标，任务栏上会冒出一圈点击的波纹：「帮你点一下这个图标～（假装的）」「打开了！（其实没有）」。只是假装，不会真的点。
- 看一眼时间，顺便算算离 DeepSeek 夜间错峰优惠还有多久。
- 深度思考：一边打字一边计时「已深度思考（用时 N 秒）」，然后顿悟。
- 跳舞、伸懒腰、东张西望、吃 Token、挥手打招呼、「服务器繁忙」急得冒汗，偶尔翻个白眼。
- 两分钟没人理就睡着，头上冒 Z；北京时间 00:30–08:30 是 DeepSeek 的错峰优惠时段，这时她更容易犯困。鼠标移到她身上就会醒。

走路和小跑共用 8 张逐帧立绘，脚步跟着窗口实际移动的距离走。挥手和吃 Token 各有 4 张立绘，能看见手掌翻动，以及举起金币、咬一口、放下的过程。WebGL2 会在立绘上叠加头发、裙摆和尾巴的摆动。跳跃也有 4 张逐帧立绘，覆盖屈膝蓄力、蹬地、腾空收腿和落地缓冲。没有 WebGL2 的电脑也能播放逐帧立绘，其余动作由 CSS 播放。

她说的话都在台词本 [`art/states.mjs`](art/states.mjs) 里，满是 DeepSeek 的梗。想改台词，改这个文件就行。

只有她身上的像素能点到，旁边的透明区域不挡鼠标，照常点下面的桌面。

大小有小、中、大、特大四档，默认是「中」。状态图约 1300 像素高，4K 屏开 200% 缩放时，连「特大」都是清晰的。

## 更新

在 **Windows 安装版**中，右键点「检查更新」。有新版本时，大肥鱼会下载并校验安装包，安装后自动重启。更新会保留设置和桌面位置。

Windows 免安装版和当前未签名的 macOS 版会打开新版本的下载页。已有的 1.4.0 需要手动换成含此功能的版本一次。

启动后和每隔 12 小时的后台检查只提示新版本。下载安装由你点击「检查更新」触发。

## 发布新版本

每个 PR 和推到 `main` 的提交都会由 GitHub Actions 打包，在 **Actions → build** 的运行页面底部 Artifacts 里能下到还没发布的版本。`main` 分支受保护：改动要走 PR，Windows 和 macOS 都打包成功才能合并。

要发布到 Releases：改 `package.json` 里的 `version`，把这一版的说明写进 [`.github/release-notes.md`](.github/release-notes.md)，然后推一个同名的 tag（比如 `v1.0.1`），或者在 **Actions → build** 里点 **Run workflow** 并勾选 release。它会打好 Windows 和 macOS 版，打上 tag 并发布。

## 目录

| 路径 | 内容 |
| --- | --- |
| `app/` | 桌宠程序（Electron）：主进程、页面、交互逻辑、图标 |
| `art/` | 立绘、状态图和出图工具，见 [`art/README.md`](art/README.md) |

粉丝二创作品，和 DeepSeek 官方没有关系。

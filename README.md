# DeepSeek-Pet

一只以 DeepSeek 为原型的桌面宠物：鲸鱼娘 DeepSeek-Pet，外号大肥鱼。

![DeepSeek-Pet 角色设定图](art/character-sheet.png)

## 下载

每次推送后 GitHub Actions 会自动打包。打开仓库的 **Actions → build**，点进最近一次成功的运行，在页面底部的 Artifacts 里下载：

- **DeepSeek-Pet-Windows**：`DeepSeek-Pet-Setup-*.exe` 是安装版，`DeepSeek-Pet-*-portable.exe` 是免安装版，双击就能用。
- **DeepSeek-Pet-macOS**：`*-arm64.dmg` 给 M 系列芯片，`*-x64.dmg` 给 Intel 芯片。

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
| 按住拖动 | 把她拎到任何地方，位置会记住 |
| 单击 | 开心：「全部开源，MIT 协议，随便用～」 |
| 连点 5 下 | 服务器繁忙，请稍后再试。 |
| 双击 | 吃 Token |
| 右键 | 菜单：说点什么、喂 Token、深度思考、切换状态、大小、总在最前、开机启动、隐藏、退出 |
| 托盘图标 | 显示 / 隐藏、退出 |

放着不管时，她会自己找事做：深度思考（一边打字一边计时「已深度思考（用时 N 秒）」，然后顿悟）、打招呼、吃 Token。两分钟没人理她就睡着；北京时间 00:30–08:30 是 DeepSeek 的错峰优惠时段，这时她更容易犯困。鼠标移到她身上就会醒。

只有她身上的像素能点到，旁边的透明区域不挡鼠标，照常点下面的桌面。

大小有小、中、大三档，默认是「中」。状态图是 644 像素高，在 4K 屏 150%–200% 缩放下，「中」号正好清晰，「大」号会稍微发虚。

## 目录

| 路径 | 内容 |
| --- | --- |
| `app/` | 桌宠程序（Electron）：主进程、页面、交互逻辑、图标 |
| `art/` | 立绘、状态图和出图工具，见 [`art/README.md`](art/README.md) |

粉丝二创作品，和 DeepSeek 官方没有关系。

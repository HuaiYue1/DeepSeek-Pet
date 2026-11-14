以 DeepSeek 为原型的桌面宠物：鲸鱼娘 DeepSeek-Pet，外号大肥鱼。

## 下载哪个

| 系统 | 文件 |
| --- | --- |
| Windows | `DeepSeek-Pet-Setup-*.exe` 是安装版；`DeepSeek-Pet-*-portable.exe` 是免安装版，双击就能用 |
| macOS（M 系列芯片） | `DeepSeek-Pet-*-arm64.dmg` |
| macOS（Intel 芯片） | `DeepSeek-Pet-*-x64.dmg` |

安装包没有做代码签名，第一次打开时：

- **Windows**：弹出「Windows 已保护你的电脑」时，点「更多信息 → 仍要运行」。
- **macOS**：右键点 App 选「打开」。如果提示「已损坏」，在终端执行 `xattr -cr /Applications/DeepSeek-Pet.app`。

## 这一版改了什么

- 走路、小跑、跳跃、挥手和吃 Token 使用重新绘制的透明 GIF。脚步跟随桌面移动距离，透明区域仍可点穿。
- Windows 安装版支持一键更新。右键点「检查更新」，有新版本时会下载、校验、安装并重启。旧版需手动安装一次，设置和桌面位置会保留。
- Windows 免安装版和 macOS 版通过下载页更新。

粉丝二创作品，和 DeepSeek 官方没有关系。

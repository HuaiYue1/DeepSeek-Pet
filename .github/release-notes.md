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

- **走路和小跑**共用 8 张逐帧立绘，脚步跟着窗口实际移动的距离走。
- **跳跃、挥手和吃 Token**各有 4 张新立绘。她会屈膝起跳、腾空收腿、落地缓冲，也会翻动手掌、举起金币咬一口。
- **拖放与转身**时，腿部会踢动或屈膝，头发、裙摆和尾巴会跟随动作轻摆。
- 没有 WebGL2 的电脑也可以播放新增的逐帧动画。

粉丝二创作品，和 DeepSeek 官方没有关系。

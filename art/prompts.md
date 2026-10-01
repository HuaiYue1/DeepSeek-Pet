# DeepSeek-Pet · AI 绘图提示词

目标风格：和参考图一致的日系二次元萌系立绘——细线条、柔和上色、5 头身左右、全身站姿、纯白背景。

先出一张满意的主立绘，再用**局部重绘（inpaint）只改脸和手**做其他表情，这样衣服、发型、比例都能保持一致。

AI 画中文字经常出错，所以牌子、气泡里的字都留空，之后由我统一加上（「服务器繁忙」「嗯，用户说……」「R1」等）。

## ChatGPT（GPT 图像生成）

### 第 1 步：主立绘

可选：把参考图一起发过去，并在提示词最前面加一句「参考附图的画风、线条和上色质感，但角色按下面的描述来画。」

```
画一张日系二次元萌系少女的全身立绘，竖版 2:3，纯白背景，人物完整入画，四周留一点空白。
画风：精致细腻的动漫插画，干净的细线条，柔和的赛璐璐上色加一点柔光，清透明亮的配色，像 Pixiv 上的高质量角色立绘。

角色是一个鲸鱼娘，正面站立，开心地挥手打招呼：
- 头部两侧各长着一片深蓝色的鲸鱼鳍当耳朵，向外斜伸，鳍的下侧是浅灰蓝色。
- 身后有一条粗粗的深蓝色鲸鱼尾巴，从腰后绕到身体右侧垂下，末端是分成两片的鲸鱼尾鳍，尾巴下侧颜色较浅。
- 蓝色超长微卷发，头顶是深蓝色，往下渐变到发梢的浅天蓝色，头顶有一根弯弯的呆毛。
- 戴白色荷叶边女仆头饰；头发右侧别着一个天蓝色蝴蝶结；左侧刘海别着一个小小的金色长方形发卡。
- 大大的蓝色眼睛闪着高光，张嘴开心地笑，露出一颗小虎牙，脸颊有淡淡的红晕。
- 一只手举到肩膀旁边挥手，另一只手自然张开放在身侧，手指要画准确。
- 服装：深蓝色长袖女仆连衣裙，泡泡袖，白色荷叶边袖口；白色衬衫前襟配深蓝色小纽扣；白色荷叶边立领，系深蓝色领结，领结中间一颗蓝宝石胸针；深蓝色束腰上有四颗金色纽扣；白色荷叶边围裙，围裙右下角绣着一只喷水的小蓝鲸；深蓝色裙摆上有金色海浪纹刺绣，下面露出白色荷叶边衬裙。
- 白色荷叶边短袜，深蓝色玛丽珍鞋，金色鞋扣。

画面里不要出现任何文字、水印或签名。
```

可以多生成几次挑一张最满意的：手指正常、鲸鳍和尾巴清楚、全身完整。

### 第 2 步：表情差分

在**同一个对话**里接着发，每次一条。开头都带上这句，保证除了表情和手以外都不变：

```
在上一张图的基础上修改：角色、服装、发型、鲸鳍、尾巴、画风、人物大小位置和白色背景都保持完全一致，只改下面说的部分。
```

然后接上对应表情的描述：

| 表情 | 描述 |
| --- | --- |
| 待机 | 表情改成温柔的微笑，闭着嘴；双手自然垂在身体两侧。 |
| 深度思考 | 表情改成认真思考：眼睛往上看，嘴巴微微嘟起；一只手的食指轻轻抵着下巴，另一只手自然垂下。头顶左上方加一个空白的白色思考气泡，里面不要写字。 |
| 服务器繁忙 | 表情改成晕头转向：眼睛变成蚊香一样的螺旋圈，额头冒冷汗，嘴巴是波浪形；双手在胸前举着一块空白的白色长方形牌子，牌子上不要写字；头顶冒两小团白烟。 |
| 开源啦 | 表情改成超开心：眼睛笑成弯弯的月牙，张大嘴笑，脸颊更红；继续挥手，身边飘着几颗金色小星星和粉色小爱心。 |
| 顿悟 | 表情改成突然惊讶：眼睛睁得圆圆的、瞳孔变小，眉毛上扬，嘴巴张成小小的 O 形；头顶右上方加一个红色感叹号；双手自然垂下。 |
| 吃 Token | 改成吃东西的样子：双手捧着一枚金色大硬币放在嘴边，硬币正面印着一个大写字母 T，边缘被咬掉一小口；眼睛亮晶晶的，脸颊鼓鼓的，旁边掉着几粒金色碎屑。 |
| 睡觉 | 改成站着打瞌睡：闭着眼睛，头微微歪向一边，嘴巴小小张开，鼻子上挂着一个透明的鼻涕泡泡，头顶飘着三个大小不一的白色字母 Z；双手自然垂下。 |
| 无语 | 表情改成无语：半眯着眼睛斜着看向一边，嘴巴抿成一条直线，额角挂着一滴汗，头顶右边飘着三个小黑点；双手自然垂下。 |

如果角色走样了（脸、衣服变了），把第 1 步的主立绘重新上传，再发一次这条修改要求。ChatGPT 里也可以用图片的编辑工具把脸或手圈出来，只让它改圈中的部分，一致性更好。

## 动作帧：让她像真人一样动

只靠一张图做动作，要么整张图晃来晃去像纸片，要么把图局部拉伸变形，看着很诡异。所以改用动画片的做法：多画几帧，程序按顺序切换。

ChatGPT 改图时会把整张图重画一遍，动作改得越大，脸、衣服、比例就跑得越多，帧和帧之间也对不上。所以每一帧**只改一小块**：眼睛、嘴巴、举起的手，或者裙摆下面的腿。我这边只取改动的那一块，对齐后贴回原图，播放时才不会抖。

### 每一帧的做法

1. 在 ChatGPT 新开一个对话（每帧都新开），只上传表格里写的那一张原图（`art/raw/hd/` 里的同名图）。
2. 推荐用 ChatGPT 的「选择」编辑：点开图片，用画笔只涂抹表格里写的那一块，再发送提示词。没有这个功能的话，直接把图和提示词一起发送。
3. 提示词是「通用部分」加上这一帧的「改动」，用英文，ChatGPT 对英文的限制条件执行得更严格。
4. 挑图只看改的那一块对不对、画风一不一致。别处有一点变化没关系。

通用部分（`{area}` 换成表格里的英文区域）：

```
Edit the attached image. This is one frame of an animation of the same character, so it must stay aligned with the original. Change ONLY {area}. Everything else must stay exactly as it is: the same canvas size and 2:3 portrait aspect ratio, the same framing, the character at the same size and in the same position, and the same pose, face, hair, whale-fin ears, tail, outfit, colours, line art and shading. Do not redraw, restyle, crop, zoom, shift or re-pose anything. Keep the transparent background; if you cannot, use a plain white background, never a checkerboard pattern. No text, no other people, no hands holding her.
```

| 文件名 | 原图 | 涂抹的区域 | 英文区域 `{area}` | 改动（接在通用部分后面，前面加 `The change: `） |
| --- | --- | --- | --- | --- |
| `idle-blink.png` | idle | 两只眼睛 | both eyes | Close both eyes, as at the instant of a blink: the upper eyelids come all the way down to meet the lower eyelids, so each eye becomes a single soft dark lash line that curves slightly downward, in the same colour and line style as her lashes. Keep the eyebrows, the skin tone and the blush under the eyes. |
| `idle-half.png` | idle | 两只眼睛 | both eyes | Half-close both eyes, as halfway through a blink: the upper eyelids come down to cover the upper half of each iris, and the lower half of each blue iris is still visible. Same lashes, same eye shape at the corners. |
| `hello-blink.png`、`think-blink.png`、`aha-blink.png`、`eat-blink.png` | hello、think、aha、eat | 两只眼睛 | both eyes | 同 `idle-blink` |
| `idle-look.png` | idle | 两只眼睛 | both eyes | Move only her irises and pupils so that she glances toward the right side of the image. The eyelids, lashes, eye shape and highlights stay the same. |
| `idle-talk.png` | idle | 嘴巴 | the mouth | Open her mouth slightly, as if in the middle of saying something: a small, softly open mouth showing a little of the inside, in the same gentle smiling shape and the same lip colour. |
| `walk-a.png` | idle | 裙摆下面的腿和鞋 | the legs and feet below the hem of the skirt | Bend the knee of the leg on the LEFT side of the image and lift that foot about one shoe-height off the ground, toes pointing slightly down, as in a walking step. The leg on the RIGHT side of the image stays straight with its foot flat on the ground. Same socks and same shoes. |
| `walk-b.png` | idle | 裙摆下面的腿和鞋 | the legs and feet below the hem of the skirt | 同 `walk-a`，把 LEFT 和 RIGHT 对调 |
| `carry-a.png` | aha | 裙摆下面的腿和鞋 | the legs and feet below the hem of the skirt | She is being lifted off the ground, so both feet dangle in the air with the toes pointing down. Bend the knee of the leg on the LEFT side of the image and raise it a little, as if kicking; the leg on the RIGHT side of the image hangs straight down. Same socks and same shoes. |
| `carry-b.png` | aha | 裙摆下面的腿和鞋 | the legs and feet below the hem of the skirt | 同 `carry-a`，把 LEFT 和 RIGHT 对调 |
| `hello-wave.png`、`happy-wave.png` | hello、happy | 举起的那只手 | the raised hand | Tilt the raised open hand at the wrist about 25 degrees toward her face, fingers still spread, as the other end of a waving motion. Same hand size, same skin colour, the sleeve cuff unchanged. |
| `eat-chew.png` | eat | 嘴巴和两颊 | the mouth and cheeks | Close her mouth and puff out her cheeks as if chewing a mouthful. The coin, her hands and her eyes stay exactly the same. |

画好以后传到 GitHub 上 `claude/deepseek-fat-fish-pet-07ov0e` 分支的 `art/raw/` 文件夹，或者直接在对话里发给我。

## 其他工具

### 主立绘：中文（即梦 / 豆包 / 通义万相 / 可灵等）

```
日系二次元萌系少女全身立绘，纯白背景，正面站姿，精致细腻的线条，柔和的赛璐璐上色，高清。
她是鲸鱼娘：头部两侧各有一片深蓝色的鲸鱼鳍当作耳朵，鳍的下侧是浅灰蓝色；身后垂下一条深蓝色的鲸鱼尾巴，尾巴末端是分成两片的鲸鱼尾鳍，尾巴下侧颜色较浅。
蓝色超长微卷发，从头顶的深蓝色渐变到发梢的浅天蓝色，头顶翘着一根呆毛；戴白色荷叶边女仆头饰，头发右侧别一个蓝色蝴蝶结，左侧刘海别一个小小的金色长方形发卡。
蓝色大眼睛闪闪发亮，张嘴开心地笑，露出一颗小虎牙，脸颊微红；一只手举到肩膀旁挥手打招呼，另一只手自然张开放在身侧。
穿深蓝色长袖女仆连衣裙，泡泡袖，白色荷叶边袖口；白色衬衫前襟，领口是白色荷叶边立领和蓝色领结，领结中间有一颗蓝宝石胸针；深蓝色束腰上有四颗金色纽扣；白色荷叶边围裙，围裙右下角绣着一只小小的蓝色鲸鱼；深蓝色裙摆绣着金色海浪花纹，下面露出白色荷叶边衬裙。
白色荷叶边短袜，深蓝色玛丽珍鞋。
```

### 主立绘：标签式（Stable Diffusion / NovelAI / Illustrious 等二次元模型）

```
masterpiece, best quality, highly detailed, anime illustration, 1girl, solo, full body, standing, looking at viewer, white background, simple background,
whale girl, whale tail, whale fin ears, dark blue fins on head, tail fluke,
very long hair, wavy hair, blue hair, gradient hair, light blue hair tips, ahoge, blue eyes, sparkling eyes, blush, smile, open mouth, fang, waving, hand up,
maid headdress, frilled hairband, blue hair bow, gold hair clip,
maid, navy blue dress, long sleeves, puffy sleeves, frilled cuffs, frilled collar, blue bowtie, brooch, white shirt, underbust corset, gold buttons,
white apron, frilled apron, whale print, gold embroidery, frilled petticoat, white frilled socks, navy mary janes
```

负面提示词：

```
lowres, bad anatomy, bad hands, extra fingers, missing fingers, fused fingers, extra limbs, deformed, text, watermark, signature, username, blurry, jpeg artifacts, cropped, out of frame
```

### 主立绘：Midjourney（英文）

```
full-body anime illustration of a cute whale girl, pure white background, front view standing and waving, dark blue whale fins on both sides of her head as ears, a dark blue whale tail with a two-lobed fluke behind her, very long wavy blue hair fading to light sky-blue tips, ahoge, white frilled maid headdress, blue hair bow, small gold hair clip, big sparkling blue eyes, open-mouth smile with a small fang, navy long-sleeve maid dress with puffy sleeves and frilled cuffs, blue bowtie with a sapphire brooch, navy corset with gold buttons, white frilled apron with a tiny blue whale embroidered on it, gold wave embroidery on the skirt hem, white petticoat, frilled socks, navy mary janes, delicate lineart, soft cel shading --niji 6 --ar 9:16
```

建议竖图 9:16 或 2:3，尽量高分辨率。挑图时最要紧的是：手指正常、鲸鳍和尾巴清楚、整体干净。

### 表情差分（在主立绘上局部重绘脸和手）

| 表情 | 重绘区域 | 追加的中文描述 | 追加的标签 |
| --- | --- | --- | --- |
| 待机 | 脸、双手 | 温柔地微笑，闭着嘴，双手自然垂在身侧 | gentle smile, closed mouth, arms at sides |
| 深度思考 | 脸、一只手 | 抬眼向上看，一根手指抵着下巴在思考，嘴巴微微嘟起；头顶留一个空白的思考气泡 | thinking, finger to chin, looking up, pout, empty thought bubble |
| 服务器繁忙 | 脸、双手、胸前 | 眼睛变成蚊香圈晕乎乎的，冒冷汗，双手在胸前举着一块空白的白色牌子 | @_@, dizzy, spiral eyes, sweatdrop, holding blank sign |
| 开源啦 | 脸 | 开心得眯成 ^ ^ 的笑眼，张大嘴笑，周围有小星星 | ^_^, closed eyes, happy, open mouth, sparkles |
| 顿悟 | 脸 | 眼睛睁得圆圆的，瞳孔变小，嘴巴张成 O 形，头顶一个感叹号 | surprised, wide eyes, small pupils, :o, exclamation mark |
| 吃 Token | 脸、双手 | 双手捧着一枚金币送到嘴边啃，眼睛亮晶晶的 | eating, holding gold coin, biting coin, sparkling eyes |
| 睡觉 | 脸 | 闭着眼睛打瞌睡，鼻子上挂着一个鼻涕泡，头顶飘着 Z | sleeping, closed eyes, snot bubble, zzz |
| 无语 | 脸 | 半眯着眼斜着看旁边，嘴巴抿成一条线，额角挂一滴汗 | jitome, half-closed eyes, looking to the side, sweatdrop, flat mouth |

## 出好图以后

把主立绘和各个表情的原图（最好是 PNG、同样尺寸）发给我。我会：

1. 去掉白底，统一对齐和尺寸。
2. 加上梗文字：牌子上的「服务器繁忙，请稍后再试。」、思考气泡里的「嗯，用户说……」、「已深度思考（用时 32 秒）」、发卡上的「R1」等。
3. 重做角色设定图，然后开始写桌宠程序。

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

只靠一张图做动作，要么整张图晃来晃去像纸片，要么把图局部拉伸变形，看着很诡异。所以改用动画片的做法：每个动作画几张单独的帧，程序按顺序快速切换。下面每一条出一张图。

### 通用做法

1. 在 ChatGPT 里新开一个对话，上传表格里写的原图（`art/raw/hd/` 里的同名图），然后发「通用开头」加上这一帧的描述。
2. 一次只出一张。不满意就重新生成；人物走样了，就把原图重新上传再发一次。
3. 挑图看三点：人物没变样（脸、衣服、鲸鳍、尾巴、发饰都对）；手指和脚正常；人物大小和站的位置跟原图差不多。
4. 存成 PNG，按表格里的文件名命名。

通用开头（每次都放在最前面）：

```
编辑这张图，画同一个角色的一帧动画。角色的脸、发型、鲸鱼鳍耳朵、尾巴、衣服的每一个细节、配色、画风和线条都和原图保持一致；人物的大小、在画面中的位置、脚踩的高度也和原图一样。只改下面说的部分。竖版 2:3，透明背景，人物完整入画，画面里不要有文字。
```

### 第一批：效果最明显，先做这些

**眨眼（5 张）**：每个睁着眼的表情各出一张闭眼版，上传对应的原图。这一组我只取眼睛那一小块贴回原图，别处有细微变化也没关系，眼睛画对就行。

```
只改眼睛：两只眼睛都自然地闭上，像眨眼时眼睛刚好合上的那一瞬间——上眼睑垂下来和下眼睑合在一起，闭合处是一条带睫毛、微微向下弯的弧线。眉毛、嘴巴、脸颊红晕、头发和其他所有地方都不要变。
```

| 文件名 | 上传的原图 |
| --- | --- |
| `idle-blink.png` | idle.png |
| `hello-blink.png` | hello.png |
| `think-blink.png` | think.png |
| `aha-blink.png` | aha.png |
| `eat-blink.png` | eat.png |

可选，眨眼更顺滑：`idle-blink-half.png`，上传 idle.png：

```
只改眼睛：两只眼睛半闭，上眼睑垂下来盖住瞳孔的上半部分，像眨眼眨到一半。其他所有地方都不要变。
```

**走路（4 张）**：上传 idle.png。她朝画面左边走（往右走时程序会镜像翻转），4 张连起来是一个完整的步子循环。四张在同一个对话里按顺序连着出，后一张才知道「上一帧」是什么。

`walk-1.png`：

```
把她改成正在朝画面左边走路的样子：身体转成 3/4 侧身面向画面左边，表情是轻松的微笑。这一帧是迈步：离观众近的那条腿向前（画面左边）迈出、脚跟着地，另一条腿在后面、脚尖点地，两腿前后分开；两只手臂自然地前后摆动，和腿的方向相反；头发和裙摆随着走路轻轻摆动。
```

`walk-2.png`：

```
同一个走路动作的下一帧：两条腿交错靠拢，后面那只脚抬起、膝盖弯曲，正从后往前收；身体比迈步时略高一点；手臂摆回身体两侧。其他和上一帧一致。
```

`walk-3.png`：

```
走路的下一帧：和第一帧左右腿互换——离观众远的那条腿向前迈出、脚跟着地，近的那条腿在后面、脚尖点地；手臂摆动的方向也和第一帧相反。其他和上一帧一致。
```

`walk-4.png`：

```
走路的下一帧：和第二帧一样两腿交错靠拢，但这次抬起来往前收的是另一只脚（离观众近的那只）。其他和上一帧一致。
```

如果一张张出的四帧对不上，可以试试一次出一整张：「画这个角色朝画面左边走路的 4 帧动画，一行排 4 个，每帧人物大小和脚的高度一致，透明背景」，存成 `walk-sheet.png`。

**转身（1 张）**：`turn.png`，上传 idle.png。转身时在朝左和朝右之间闪过这一帧，看起来就像真的转过身来。

```
改成身体和脸都正对观众站立，左右基本对称，双手自然垂在身体两侧，温柔的微笑。
```

**被拎起来（2 张）**：上传 aha.png，两张在同一个对话里连着出。

`carry-1.png`：

```
改成被人从头顶上方拎起来、悬在半空中的样子：双脚离地，脚尖朝下，两条腿在空中乱蹬——离观众近的那条腿往上抬、膝盖弯曲，另一条腿往下伸直；双手微微张开、慌张地挥动；裙摆、头发和尾巴因为悬空自然地往下垂；表情保持惊讶。
```

`carry-2.png`：

```
同一个动作的下一帧：两条腿换过来——离观众远的那条腿抬起、膝盖弯曲，近的那条往下伸直；手臂换一个挥动的位置。其他和上一帧一致。
```

### 第二批：更多动作

| 文件名 | 上传的原图 | 描述（放在通用开头后面） |
| --- | --- | --- |
| `look.png` | idle.png | 头和眼睛转向画面右边，像在看旁边有什么东西，表情好奇。 |
| `tilt.png` | idle.png | 头微微歪向一边，可爱地歪着头看着观众。 |
| `wave-2.png` | hello.png | 只改举起的那只手：手掌摆到另一边，像挥手动作的另一头；表情和其他地方都不变。 |
| `jump-1.png` | happy.png | 膝盖弯曲、身体下蹲准备起跳，双臂往后摆。 |
| `jump-2.png` | happy.png | 跳到空中：双脚离地往后收起，双手高高举起，头发和裙摆向上飘起来。 |
| `stretch.png` | idle.png | 伸懒腰：双手十指交叉举过头顶往上伸，踮起脚尖，闭着眼睛张嘴打哈欠。 |
| `dance-1.png` | happy.png | 开心地跳舞：一只手举高、另一只手叉腰，身体向画面左边倾斜，离观众远的那只脚抬起。 |
| `dance-2.png` | happy.png | 跳舞的另一个姿势：和上一个反过来，身体向画面右边倾斜，换另一只手举高、另一只脚抬起。 |
| `munch-2.png` | eat.png | 只改嘴巴和脸颊：嘴巴闭上，鼓着腮帮正在嚼，硬币上的缺口再大一点；其他不变。 |
| `tap.png` | idle.png | 弯下腰往前（画面左边）探身，伸出一只手的食指往下点，像在按地上的一个按钮。 |

可选：小跑 4 张（`run-1.png` 到 `run-4.png`），描述照走路的写，再加上「步子更大，身体往前倾，有一瞬间双脚都离地」。

### 出好图以后

把图按上面的文件名传到 GitHub 上 `claude/deepseek-fat-fish-pet-07ov0e` 分支的 `art/raw/` 文件夹（网页上 Add file → Upload files），或者直接在对话里发给我。我来对齐尺寸和位置（眨眼只取眼睛那一块贴回原图，保证不会抖），再接进程序：眨眼、走路、转身这些都按帧切换，不拉伸、不变形。

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

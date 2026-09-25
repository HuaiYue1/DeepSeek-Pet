# 深深 · AI 绘图提示词

目标风格：和参考图一致的日系二次元萌系立绘——细线条、柔和上色、5 头身左右、全身站姿、纯白背景。

先出一张满意的主立绘，再用**局部重绘（inpaint）只改脸和手**做其他表情，这样衣服、发型、比例都能保持一致。

AI 画中文字经常出错，所以牌子、气泡里的字都留空，之后由我统一加上（「服务器繁忙」「嗯，用户说……」「R1」等）。

## 主立绘（打招呼）

### 中文（即梦 / 豆包 / 通义万相 / 可灵等）

```
日系二次元萌系少女全身立绘，纯白背景，正面站姿，精致细腻的线条，柔和的赛璐璐上色，高清。
她是鲸鱼娘：头部两侧各有一片深蓝色的鲸鱼鳍当作耳朵，鳍的下侧是浅灰蓝色；身后垂下一条深蓝色的鲸鱼尾巴，尾巴末端是分成两片的鲸鱼尾鳍，尾巴下侧颜色较浅。
蓝色超长微卷发，从头顶的深蓝色渐变到发梢的浅天蓝色，头顶翘着一根呆毛；戴白色荷叶边女仆头饰，头发右侧别一个蓝色蝴蝶结，左侧刘海别一个小小的金色长方形发卡。
蓝色大眼睛闪闪发亮，张嘴开心地笑，露出一颗小虎牙，脸颊微红；一只手举到肩膀旁挥手打招呼，另一只手自然张开放在身侧。
穿深蓝色长袖女仆连衣裙，泡泡袖，白色荷叶边袖口；白色衬衫前襟，领口是白色荷叶边立领和蓝色领结，领结中间有一颗蓝宝石胸针；深蓝色束腰上有四颗金色纽扣；白色荷叶边围裙，围裙右下角绣着一只小小的蓝色鲸鱼；深蓝色裙摆绣着金色海浪花纹，下面露出白色荷叶边衬裙。
白色荷叶边短袜，深蓝色玛丽珍鞋。
```

### 标签式（Stable Diffusion / NovelAI / Illustrious 等二次元模型）

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

### Midjourney（英文）

```
full-body anime illustration of a cute whale girl, pure white background, front view standing and waving, dark blue whale fins on both sides of her head as ears, a dark blue whale tail with a two-lobed fluke behind her, very long wavy blue hair fading to light sky-blue tips, ahoge, white frilled maid headdress, blue hair bow, small gold hair clip, big sparkling blue eyes, open-mouth smile with a small fang, navy long-sleeve maid dress with puffy sleeves and frilled cuffs, blue bowtie with a sapphire brooch, navy corset with gold buttons, white frilled apron with a tiny blue whale embroidered on it, gold wave embroidery on the skirt hem, white petticoat, frilled socks, navy mary janes, delicate lineart, soft cel shading --niji 6 --ar 9:16
```

建议竖图 9:16 或 2:3，尽量高分辨率。挑图时最要紧的是：手指正常、鲸鳍和尾巴清楚、整体干净。

## 表情差分（在主立绘上局部重绘脸和手）

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

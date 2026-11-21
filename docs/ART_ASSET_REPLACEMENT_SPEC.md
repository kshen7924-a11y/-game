# 《孤山独影》美术资源替换总规范（岩壁 · 岩点 · 人物与皮肤）

> **核心设计原则**：视觉表现层与物理/操作层 100% 解耦。后续无论是整体替换岩壁大板、重绘高精度岩点，还是扩展多套人物皮肤与部件贴图，**均不会改变任何抓握判定半径、IK 骨骼长度、物理重心或拖拽交互手感**。

---

## 一、全局通用美术规范

| 规范项 | 统一标准 | 说明与避坑要点 |
| :--- | :--- | :--- |
| **相机视角** | 2.5D 正视略微俯视（贴壁背面 3/4 透视） | 岩壁正面铺满画面，岩点带有厚度与底部投影，人物背对镜头攀爬，保证岩壁、岩点、四肢三层透视一致 |
| **统一主光源** | **左上方 45° 自然冷暖光** | 受光面在左上，背光面与投影落在右下；岩壁、岩点、人物必须遵循同一光照方向，避免贴图拼合出现“贴纸感” |
| **视觉层级与对比度** | 岩壁低对比 → 岩点中高对比 → 人物高对比高饱和 | 岩壁不要出现过强黑洞或高纯度色块，避免与可抓岩点混淆；人物外套、围巾与护具轮廓清晰、可读性强 |
| **画风与描边** | 手绘高山插画 / 故事书厚涂 + 柔和深炭色描边（`#141820`） | 人物与岩点可保留轻微手绘墨线轮廓；岩壁大板使用无硬黑边绘面，增强纵深空气感 |
| **色彩空间与格式** | **sRGB**；场景大板 RGB 无透明通道 PNG/WebP，岩点与人物部件 RGBA 透明通道 PNG/WebP | 导出前务必检查 Premultiplied Alpha，禁止出现白边或黑边杂色 |
| **性能与体积建议** | 场景大板单张 ≤ 800KB（推荐 WebP / 压缩 PNG）；岩点单张 ≤ 80KB；人物部件 ≤ 40KB | 所有资源均支持浏览器异步解码与离屏缓存，解码前自动平滑兜底 |

---

## 二、模块一：整体岩壁与场景替换规范

对应代码：`src/visual/artPackAssets.ts`、`src/visual/scenePresentation.ts`

### 1. 地形主题包规划（4 套对应全部 4 种路线配色 `palette`）

目前系统已有 **2 套**实装资源包，后续可按相同结构扩充至 **4 套**，实现全路线地形差异化：

| 主题包 ID（`ArtPackId`） | 对应路线 `palette` | 当前状态 | 推荐地貌与色调 |
| :--- | :--- | :--- | :--- |
| `snow-ridge-granite` | `granite` | 已实装 | 暖灰花岗岩 + 阳面残雪，明朗晴空 |
| `frost-crown-ice` | `glacial` | 已实装 | 冷蓝黑冰岩 + 冰瀑覆霜，高寒极境 |
| `ridge-alpine`（预留） | `ridge` | 暂复用 `snow-ridge-granite` | 青褐高山刃脊 + 苔藓风化岩脉，微雾山谷 |
| `slate-cliff`（预留） | `slate` | 暂复用 `snow-ridge-granite` | 深青灰板岩绝壁 + 锋利层理裂隙，阴云硬朗风 |

### 2. 单套主题包 4 张核心大板规格

存放路径：`src/visual/art-packs/<art-pack-id>/`

| 文件名 | 作用与渲染方式 | 现状尺寸 / 推荐升级尺寸 | 比例 & 通道 | 构图与无缝衔接红线（CRITICAL） |
| :--- | :--- | :--- | :--- | :--- |
| `01-起点.png` | 起始岩台与山脚底座 | 现状 `940 × 1672`<br>推荐 `1080 × 1920`（9:16） | 9:16<br>RGB 不透明 | 1. **顶部 0% ~ 18%**：引擎会自动做垂直透明羽化融进 `02-攀爬岩壁`，该区域必须是**纯岩壁纹理**，不可画树木/天空。<br>2. **脚踩平台水平面**位于画面高度约 **`85.5%`** 处（可通过 `startShelfSurfaceRatioY` 校准）。<br>3. 底部 5% 做柔化压暗过渡。 |
| `02-攀爬岩壁.png` | 中段无限垂直平铺攀爬壁 | 现状 `940 × 1672`<br>推荐 `1080 × 1920`（9:16） | 9:16<br>RGB 不透明 | 1. **垂直无缝循环**：引擎会自动取**底部 16% 条带**平滑叠融到顶部，因此**顶部 16% 与底部 16% 的色调、明度、岩纹走向必须接近**。<br>2. **画面中间不可有极端显眼的孤立大标记**（如巨大红岩、独特树丛），否则在长线路循环平铺时会出现明显重复感。<br>3. 画面左右两侧保持自然岩壁延续，避免出现垂直硬边。 |
| `03-登顶近景.png` | 顶峰岩脊 + 高空云海近景 | 现状 `941 × 1672`<br>推荐 `1080 × 1920`（9:16） | 9:16<br>RGB 不透明 | 1. **底部 82% ~ 100%（下 18%）**：引擎会自动羽化融进 `02-攀爬岩壁`，该区域必须是连续岩壁。<br>2. **顶部边缘（0% ~ 4%）**：天空颜色尽量平滑均匀，便于高屏比手机用 `summitSkyTopColor` 向上无缝延展。<br>3. 顶峰站立平脊/鞍部需预留明确落脚点（标注其归一化坐标 `summitStandingRatioX / Y`）。 |
| `04-广角结尾.png` | 登顶拉远史诗广角定格图 | 现状 `941 × 1672`<br>推荐 `1080 × 1920`（9:16） | 9:16<br>RGB 不透明 | 1. 必须与 `03-登顶近景` 共享同一核心山峰剪影/山口地标（如 V 形缺口、雪檐方向），保证登顶镜头从 `03` 叠化拉远至 `04` 时空间连续。<br>2. 标注核心地标中心点 `wideFocalX / wideFocalY`。 |

### 3. 每套岩壁包必须同步提交的 `ArtPackMetrics` 校准表

替换完 4 张大板后，在 `src/visual/artPackAssets.ts` 的 `ART_PACK_MANIFEST[packId].metrics` 中更新以下参数即可 1:1 严丝合缝对齐：

```ts
metrics: {
  startShelfSurfaceRatioY: 0.855, // 01-起点 脚踩平台表面在图片中的纵向比例 (0=顶, 1=底)
  summitStandingRatioX: 0.55,     // 03-登顶近景 顶峰站立点横向比例 (0=左, 1=右)
  summitStandingRatioY: 0.425,    // 03-登顶近景 顶峰站立点纵向比例
  wideFocalX: 0.56,               // 04-广角结尾 与近景共用的核心地标 X 比例
  wideFocalY: 0.365,              // 04-广角结尾 与近景共用的核心地标 Y 比例
  wideDissolveStartScale: 1.34,   // 03→04 叠化瞬间广角图初始放大倍率（通常 1.28 ~ 1.38）
  summitSkyTopColor: '#457FC6',   // 03 顶边天空纯色吸管值（用于超长屏顶部延展）
  fallbackWallColor: '#A6937E',   // 贴图加载前的岩壁底色
  plinthShadowColor: '#5A4F44',   // 起点岩台下方的深岩底座色
}
```

---

## 三、模块二：岩点资源与功能状态规范

对应代码：`src/visual/holdSprites.ts`、`src/visual/artPackAssets.ts`

### 1. 基础 10 张单张透明岩点清单（每套岩壁主题包配套 10 张）

存放路径：`src/visual/art-packs/<art-pack-id>/岩点单张/`

- **尺寸规范**：现状 `396 × 396 px`，推荐升级 **`512 × 512 px`**（1:1 正方形，RGBA 透明 PNG）。
- **构图规范**：
  1. 岩点本体主体占画布宽/高约 **70% ~ 88%**，四周留 **6% ~ 15%** 安全余量容纳底部柔和阴影，避免裁切硬边。
  2. **自带柔和岩体根部阴影（Ambient Occlusion）**，使岩点贴在任何岩壁纹理上都能自然“长”在岩壁里。
  3. **抓握发力沿（手/脚接触点）必须尽量贴近下表中的标准锚点 `(anchorX, anchorY)`**，否则会出现手抓空气或穿模。

| 序号 | 文件名 | 形态语义 | 接触锚点 `anchorX` | 接触锚点 `anchorY` | 宽度缩放 `radiusToWidth` | 主要对应玩法类型 |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| `01` | `01-厚弧岩沿.png` | 宽厚圆润大抓沿 | `0.56` | `0.36` | `2.30` | `jug`（大抓点）、`ledge`、`spring` |
| `02` | `02-薄片小边.png` | 水平窄薄指力边 | `0.50` | `0.49` | `2.50` | `crimp`（小指点）、`fragile`、`undercling` |
| `03` | `03-三角捏点.png` | 立体棱角捏抓点 | `0.51` | `0.46` | `2.40` | `jug`、`crimp`、`tremor`、`sidepull` |
| `04` | `04-圆头岩角.png` | 凸出圆柱/羊角点 | `0.61` | `0.44` | `2.45` | `jug`、`swing`、`sidepull` |
| `05` | `05-低弧斜面.png` | 平缓低摩擦斜坡点 | `0.50` | `0.44` | `2.28` | `ice`（冰点）、`ledge`、`fragile` |
| `06` | `06-倒扣薄缘.png` | 底部内凹反扣沿 | `0.52` | `0.44` | `2.38` | `undercling`（反扣）、`crimp`、`fragile` |
| `07` | `07-双层阶块.png` | 阶梯状宽大踏块 | `0.54` | `0.42` | `2.42` | `ledge`（歇脚台）、`jug`、`spring` |
| `08` | `08-竖向侧拉.png` | 垂直立面侧拉刃 | `0.48` | `0.48` | `2.45` | `sidepullLeft / Right`（右拉时自动水平镜像 `flipX`） |
| `09` | `09-月牙凹窝.png` | 内凹指洞/月牙窝 | `0.52` | `0.44` | `2.40` | `jug`、`ice`、`swing`、`tremor`、`undercling` |
| `10` | `10-斜向裂缝.png` | 斜向塞手岩缝 | `0.50` | `0.50` | `2.55` | `crack`（专属裂缝点） |

> **旋转与光照保护**：运行时渲染器会将岩点随机倾角限制在 `±0.38 rad`（约 ±21°）以内，不会上下颠倒，确保左上 45° 光照始终自然；只有 `08-竖向侧拉` 在 `sidepullRight` 时会做水平镜像。

### 2. 后期推荐新增的“岩点功能状态 / 特效覆盖层”资源（可选升级包）

当前功能状态由 Canvas 矢量叠加呈现，后期美术细化时可按以下清单输出独立透明贴图（统一 `256 × 256 px` RGBA，锚点居中 `0.5, 0.5`）：

| 扩展槽位 | 文件建议名 | 触发条件 / 用途 | 美术设计要点 |
| :--- | :--- | :--- | :--- |
| 镁粉白痕 | `overlay-chalk.png` | `hold.chalked === true` | 岩沿上方自然拍粉指纹白霜，边缘柔和半透 |
| 雨水湿滑 | `overlay-wet.png` | `hold.wet === true` | 岩面深色水渍 + 左上细亮水膜高光 |
| 脆岩裂纹（3阶） | `overlay-crack-1/2/3.png` | `hold.type === 'fragile'` 按 `crackProgress` 切换 | 浅裂纹 → 贯穿暗缝 → 即将剥落碎渣 |
| 弹簧弹射点 | `hold-special-spring.png` | `hold.type === 'spring'` | 带弹性青苔/冰晶弹簧纹理或专属向上发力符号岩块 |
| 摆荡借力点 | `hold-special-swing.png` | `hold.type === 'swing'` | 带圆弧抛光握槽或风纹流动质感的抓点 |
| 共振颤动点 | `hold-special-tremor.png` | `hold.type === 'tremor'` | 含微裂发光岩脉或松动嵌石质感，受压时配合高频抖动 |
| 远景/干扰装饰岩点 | `hold-decoy-01~03.png` | `hold.isDecoy === true` | 轮廓更平浅、对比度略低，帮助高阶玩家通过视觉读线辨别真假点 |

---

## 四、模块三：人物造型与皮肤系统替换规范

对应代码：`src/visual/characterArtAssets.ts`、`src/visual/characterRenderer.ts`、`src/game/mountain.ts`、`src/game/ik.ts`

### 1. 物理骨骼尺寸基准（1:1 锁定 `ik.ts`，绝不可破坏）

所有人物皮肤贴图均以以下逻辑世界单位为基准缩放，推荐按 **4× Retina 分辨率（`recommendedExportScale = 4`）** 导出 PNG：

| 骨骼/结构参数 | 逻辑世界尺寸（px） | 4× 导出基准（px） | 绑定关系 |
| :--- | :---: | :---: | :--- |
| 人物标准总高（鞋底到头顶） | `92` | `368` | 参考基准 |
| 躯干高度 `TORSO_HEIGHT` | `40` | `160` | 肩中点到髋中点 |
| 肩半宽 `SHOULDER_HALF_W` | `15`（总肩宽 30） | `60`（总肩宽 120） | 左/右肩关节坐标 |
| 髋半宽 `HIP_HALF_W` | `11`（总髋宽 22） | `44`（总髋宽 88） | 左/右髋关节坐标 |
| 上臂骨长 `ARM_UPPER` | `26` | `104` | 肩 → 肘 |
| 前臂骨长 `ARM_LOWER` | `25` | `100` | 肘 → 腕 |
| 大腿骨长 `LEG_UPPER` | `28` | `112` | 髋 → 膝 |
| 小腿骨长 `LEG_LOWER` | `27` | `108` | 膝 → 踝 |

### 2. 已预留的 8 套皮肤 ID 与资源包目录

每套皮肤目录位于：`src/visual/character-packs/<artPackId>/`

| 皮肤 ID（`artPackId`） | 皮肤名称 | 主题标签 | 造型关键词（美术设计参考） |
| :--- | :--- | :---: | :--- |
| `alpine-orange` | 经典蓝橙 | 经典 | 阿尔卑斯蓝橙冲锋衣、护目镜针织帽、标准高山背包 |
| `glacier-cyan` | 极光冰青 | 冰川 | 冰青高寒冲锋衣、头灯防撞头盔、外挂冰镐技术包 |
| `granite-gold` | 岩壁琥珀 | 传统 | 复古琥珀帆布夹克、暖色风镜探险帽、外挂盘绳大岩壁包 |
| `summit-crimson` | 神山绯红 | 冲顶 | 绯红连帽高寒硬壳、长飘风雪围巾、反光冲顶包 |
| `pine-ranger` | 林海松绿 | 森野 | 松针绿山野防风衣、复古遮阳鸭舌帽、底部绑防潮垫卷包 |
| `midnight-obsidian` | 暗夜玄岩 | 暗夜 | 曜石黑轻量软壳、碳灰夜攀头灯盔、极简速攀轻包 |
| `sakura-dawn` | 霞光樱雪 | 晨霞 | 霞粉雪白轻量羽绒服、绒球北欧针织帽、冰粉速攀包 |
| `desert-sandstone` | 绯砂峡谷 | 红岩 | 赭红砂岩攀岩夹克、青松石色围巾与岩鞋、传统盘绳包 |

> **零成本渐进替换**：任何一套皮肤**不需要一次性画满 18 张图**。只替换 `head.png` 或 `backpack.png` 时，其余未配置的槽位会自动无缝回退到程序手绘渲染，支持逐部位迭代验收。

### 3. 18 个部件槽位 + 3 种手势变体完整切图清单

#### A. 两点骨骼拉伸件（8 个槽位，可只画左侧 4 张，右侧用 `flipX: true` 自动镜像）

- **构图朝向红线**：所有四肢切图必须**严格竖直向下绘制**（起点关节在正上方，终点关节在正下方）。
- **关节重叠余量**：起点关节中心位于画布纵向 **`14%`（`startPivotRatio: 0.14`）**，终点关节中心位于 **`86%`（`endPivotRatio: 0.86`）**，上下各留 14% 圆头包边，保证手肘/膝盖大幅弯曲时**永不断节露缝**。

| 槽位 ID | 建议文件名 | 逻辑厚度 `thickness` | 推荐 4× 导出尺寸（px） | 镜像复用 |
| :--- | :--- | :---: | :---: | :--- |
| `upperArmL` / `upperArmR` | `upper-arm-l.png`（可选 `-r`） | `11.5` | `64 × 144` | 右侧默认 `flipX: true` |
| `forearmL` / `forearmR` | `forearm-l.png`（可选 `-r`） | `9.5` | `56 × 136` | 右侧默认 `flipX: true` |
| `thighL` / `thighR` | `thigh-l.png`（可选 `-r`） | `13.2` | `72 × 156` | 右侧默认 `flipX: true` |
| `calfL` / `calfR` | `calf-l.png`（可选 `-r`） | `11.0` | `64 × 148` | 右侧默认 `flipX: true` |

#### B. 单锚点主体与装备件（10 个槽位 + 3 种手势状态）

| 槽位 ID | 建议文件名 | 逻辑尺寸（宽×高） | 锚点 `(anchorX, anchorY)` | 推荐 4× 导出尺寸（px） | 绘制要点与朝向 |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `head` | `head.png` | `24 × 26` | `(0.50, 0.64)` | `128 × 140` | 背面 3/4 头部 + 头发 + 帽子/头盔；锚点对准颈根与后脑中心 |
| `torso` | `torso.png` | `32 × 48` | `(0.50, 0.50)` | `160 × 224` | 冲锋衣/羽绒服主体（不含手臂与背包）；转体时会自动水平微缩 |
| `pelvisHarness` | `pelvis-harness.png` | `30 × 14` | `(0.50, 0.45)` | `152 × 80` | 攀岩安全带腰环、金属锁扣与挂环快挂 |
| `backpack` | `backpack.png` | `28 × 36` | `(0.50, 0.56)` | `144 × 180` | 背包本体 + 顶盖 + 外挂（冰镐/盘绳/防潮垫） |
| `chalkBag` | `chalk-bag.png` | `11 × 13` | `(0.50, 0.12)` | `64 × 76` | 悬挂在腰后右侧的镁粉袋，锚点在顶部挂绳处（随风摆动） |
| `scarf` | `scarf.png` | `26 × 18` | `(0.78, 0.25)` | `136 × 96` | 围巾领结在右侧 `(0.78, 0.25)`，飘带向左下方舒展（随风摆动） |
| `handL` / `handR` | `hand-l.png` | `12 × 11` | `(0.45, 0.50)` | `64 × 60` | 掌心向岩壁、指尖**朝右（0 rad）**，锚点在抓握受力点 |
| `footL` / `footR` | `foot-l.png` | `17 × 10` | `(0.46, 0.50)` | `88 × 56` | 攀岩鞋侧面轮廓，鞋尖**朝右（0 rad）**，锚点在脚掌中心 |
| `handVariants.open` | `hand-open.png` | `12 × 11` | `(0.45, 0.50)` | `64 × 60` | 松手/伸手状态（五指微张） |
| `handVariants.grip` | `hand-grip.png` | `12 × 11` | `(0.45, 0.50)` | `64 × 60` | 扣抓岩点状态（指节弯曲发力） |
| `handVariants.chalked` | `hand-chalked.png` | `12 × 11` | `(0.45, 0.50)` | `64 × 60` | 拍镁粉后指尖覆白粉状态（优先于 `grip`/`open`） |

### 4. 人物图层渲染顺序（Z-Order，从底层到顶层）

1. 远侧腿（`thigh` → `calf` → `foot`）
2. 近侧腿（`thigh` → `calf` → `foot`）
3. 贴壁侧手臂（侧身时在躯干后方：`upperArm` → `forearm` → `hand`）
4. `torso`（外套躯干）
5. `pelvisHarness`（安全带腰环与挂具）
6. `backpack`（高山背包与外挂器材）
7. `chalkBag`（后腰镁粉袋）
8. `scarf`（飘动围巾）
9. `head`（头部与头饰）
10. 朝外侧手臂（侧身时在躯干前方，确保 2.5D 立体遮挡关系正确）

### 5. 代码接入示例（不改一行核心代码）

```ts
// 方式一：注册一整套皮肤美术包
import {
  DEFAULT_ANCHOR_SLOT_SPECS,
  DEFAULT_BONE_SLOT_SPECS,
  registerCharacterArtPack,
} from './src/visual/characterArtAssets';
import headUrl from './src/visual/character-packs/glacier-cyan/head.png';
import packUrl from './src/visual/character-packs/glacier-cyan/backpack.png';

registerCharacterArtPack({
  id: 'glacier-cyan',
  label: '极光冰青 · 冰壁攀登者',
  anchorParts: {
    head: { ...DEFAULT_ANCHOR_SLOT_SPECS.head, url: headUrl },
    backpack: { ...DEFAULT_ANCHOR_SLOT_SPECS.backpack, url: packUrl },
  },
  boneParts: {
    // 按需接入四肢贴图...
  },
});

// 方式二：单部位混搭热替换（例如单独换头盔或背包）
import { overrideCharacterArtSlot } from './src/visual/characterArtAssets';
overrideCharacterArtSlot('alpine-orange', 'backpack', {
  ...DEFAULT_ANCHOR_SLOT_SPECS.backpack,
  url: packUrl,
});
```

---

## 五、美术资源交付目录模板与上线验收清单

### 标准目录结构

```text
src/visual/
├── art-packs/
│   ├── snow-ridge-granite/      # 花岗岩雪脊（已实装）
│   ├── frost-crown-ice/         # 霜冠冰岩（已实装）
│   ├── ridge-alpine/            # 预留：高山刃脊
│   └── slate-cliff/             # 预留：青灰板岩
│       ├── 01-起点.png
│       ├── 02-攀爬岩壁.png
│       ├── 03-登顶近景.png
│       ├── 04-广角结尾.png
│       └── 岩点单张/
│           ├── 01-厚弧岩沿.png ... 10-斜向裂缝.png
│           └── (可选) overlay-chalk.png / overlay-wet.png / overlay-crack-1~3.png
└── character-packs/
    ├── alpine-orange/
    ├── glacier-cyan/
    ├── granite-gold/
    ├── summit-crimson/
    ├── pine-ranger/
    ├── midnight-obsidian/
    ├── sakura-dawn/
    └── desert-sandstone/
        ├── head.png / torso.png / pelvis-harness.png / backpack.png
        ├── chalk-bag.png / scarf.png / foot-l.png
        ├── upper-arm-l.png / forearm-l.png / thigh-l.png / calf-l.png
        └── hand-open.png / hand-grip.png / hand-chalked.png
```

### 替换验收清单（QA Checklist）

- [ ] **岩壁无缝检查**：在 120m+ 高阶线路快速拖动镜头，确认 `02-攀爬岩壁` 上下循环无横线接缝、无突兀重复纹理。
- [ ] **起终点对齐检查**：起点双脚稳踩在 `01-起点` 平台上不悬空、不陷地；登顶瞬间人物站在 `03-登顶近景` 峰顶上，叠化至 `04-广角结尾` 时山峰重心不跳变。
- [ ] **岩点锚点检查**：在 `儿童线` 和 `中级线` 分别抓取 10 种形态岩点，确认手指与鞋尖紧贴岩点发力沿，无明显偏移或悬浮。
- [ ] **人物关节检查**：大幅伸展手脚（大跨步、侧身扭胯、动态跳跃）时，肩/肘/髋/膝关节重叠自然、无断节、无透明毛边。
- [ ] **性能与包体检查**：所有新图经无损/WebP 压缩，首屏与切换皮肤无卡顿闪烁。

# 《孤山独影》美术资产制作需求说明书（完整版）

> **版本**：v2.1（全模块资产交付与命名规范总表 · 100% 对齐 `ArtAssetManifest` 与 `AssetRegistry`）  
> **风格基准**：*Cairn* 法比清线连环画风（Franco-Belgian Ligne Claire）—— 冷青灰岩壁阴影、清晰深墨勾线（`#141820`）、硬边塞璐璐投影、高辨识度户外装备轮廓、自然粉笔痕迹与克制的场景化提示。  
> **接入架构**：`src/App.tsx`（`ArtAssetManifest` 接口） + `src/visual/AssetRegistry.ts`（`AssetRegistry` 唯一资源注册中心）。游戏中**每一块视觉呈现**均已预留独立槽位，支持分批次、逐模块、逐关卡整体替换，**零硬编码路径、零物理逻辑耦合**。

---

## 〇、全游戏 9 大美术模块总量与排期总览

| 模块 | Manifest 槽位 | 独立设计内容与数量 | 当前状态 | 推荐替换顺序 |
| :--- | :--- | :--- | :--- | :--- |
| **模块 1 · 角色设定背面立绘与展示舞台** | `character.previews` + `ui.characterStageBackdrop` | **4 张** 背面全身效果图（2穿搭×男女）+ **1 张** 角色岩台背景 | 程序 SVG 回退 | **第 1 批（P0）** |
| **模块 2 · 局内攀爬角色骨骼与四肢部件** | `character.skins` + `genderSkinOverrides` | **24 件** P0 核心部件（2套×12件）+ **16 件** P1/P2 状态/镜像件 | 程序矢量 IK 回退 | **第 1 批（P0）** |
| **模块 3 · 11 条真实线路仪式感徽章** | `badges[routeId]` | **11 枚** 独立山体地标珐琅金属勋章（`512×512`） | 11 枚定制 SVG 回退 | **第 1 批（P0）** |
| **模块 4 · 公共地貌岩壁与大场景** | `walls[packId]` | **4 套地貌 × 4 大场景** = 16 张 + `wallDetailOverlay` 肌理层 | 2 套初版占位 | **第 2 批（P0）** |
| **模块 5 · 语义岩点与状态叠加层** | `holds[packId]` | **4 套 × 10 基础岩点** + **5 张状态叠层** + **4 张特殊点** | 2 套初版占位 | **第 2 批（P0/P1）** |
| **模块 6 · 世界交互道具与山岳地标** | `worldProps` | **8 张**（新/锈岩钉、Climbot、宿营帐、营地旗、玛尼堆、峰顶旗、峭壁草木） | 程序矢量回退 | **第 2 批（P0/P1）** |
| **模块 7 · UI 全套件视觉（整体换皮）** | `ui.*` | **21 张**（主标题 Logo、羊皮纸底纹、今日神山横幅/印章、4 套配装图标、6 枚 HUD 图标、6 枚评级印章） | 字体/Lucide/纯色回退 | **第 3 批（P1）** |
| **模块 8 · 气象与攀爬特效 VFX 贴图** | `vfx.*` | **9 张**（镁粉扬尘、岩钉火星、脆岩碎石、落冰冰锥、雪片、冻雨丝、流云雾霭、横风风痕、Dyno 蓄力环） | 程序粒子回退 | **第 3 批（P1）** |
| **模块 9 · 11 关卡逐关独立精修覆写** | `routeOverrides[routeId]` | **11 关按需逐关精修**（每关独立 4 场景 + 特色岩点 + 氛围调色） | 自动继承地貌包 | **第 4 批（渐进精修）** |

---

## 一、全局美术制作硬性规范

| 规范项 | 要求标准 |
| :--- | :--- |
| **文件格式** | 透明素材统一导出 **PNG-32（RGBA，无预乘黑边）** 或无损 WebP；全屏背景/岩壁底图使用 PNG（或高质量 WebP） |
| **色彩空间** | sRGB（8-bit/channel） |
| **统一主光源** | **左上方 45° 自然日光**（受光面偏暖白/粉笔灰，背光面与岩壁投影偏冷青灰 `rgba(30, 58, 72, 0.44)`） |
| **勾线规范** | 角色与道具深墨外轮廓 `#141820`，4× 导出稿建议线宽 **3–5 px**；内部结构线 **1.5–2.5 px**；避免模糊羽化黑边 |
| **画布留白与裁切** | 角色部件、岩点、道具均保持透明底，四周预留 **8–12% 安全留白**（防止旋转抗锯齿裁切） |
| **镜像复用规则** | 人物右侧四肢（`RightUpperArm`/`RightForearm`/`RightThigh`/`RightCalf`/`RightHand`/`RightFoot`）若未单独出图，引擎会自动水平镜像左侧部件；需要左右非对称装备细节时再单独提供右侧贴图 |
| **骨骼方向约定** | 所有**骨骼驱动四肢部件**（大臂/小臂/大腿/小腿）必须**垂直朝下绘制**：起点关节（肩/肘/髋/膝）位于画布垂直 **14%** 处，终点关节位于 **86%** 处 |
| **全局文件命名规范** | 全部采用**全小写 ASCII + 短横线（kebab-case）**，禁止中文、空格及大写字母（避免跨平台/CDN 大小写敏感错误）：<br>• 角色背面立绘：`char-preview-<skinId>-<gender>.png`<br>• 角色局内部件：`char-<skinId>-<limb-kebab>[ -<gender> ].png`<br>• 公共岩壁场景：`wall-<packId>-<layer>.png`<br>• 单关覆写场景：`route-<routeId>-wall-<layer>.png`<br>• 语义岩点：`hold-<packId>-<holdKey>.png` / `hold-overlay-<overlayKey>.png` / `hold-special-<specialKey>.png`<br>• 世界道具：`prop-<prop-kebab>.png`<br>• 线路徽章：`badge-<routeId>.png`<br>• UI 组件：`ui-<group>-<key>.png`<br>• 气象/反馈特效：`vfx-<effect-kebab>.png` |

---

## 二、人物展示效果图与肢体 Sprite 需求表

> **角色系统规格（已定型，不再增加额外装饰系统）**：  
> - **性别**：`male`（男） / `female`（女）  
> - **默认两套穿搭（`ClimberSkinId`）**：`alpine-orange`（山脊经典 · 默认穿搭一）、`glacier-cyan`（极光冰青 · 默认穿搭二）  
> - **角色逻辑基准高度**：`92 world px`（鞋底至头顶），局内肢体部件推荐按 **4× Retina 分辨率** 出图。

### 2.0 角色设定页 · 背面站立美术效果图（`ArtAssetManifest.character.previews[skinId][gender]`，P0 必做）

> **展示位置**：主菜单「角色设定」界面左侧主视觉画幅（占整屏宽度的 **61%–62%**，手机端人物显示高 `248px` / 桌面端 `336px`；攀登者名称位于人物正上方，身高/臂展/体重负重测绘标尺贴边融入画幅四周）。  
> **姿势规范**：**默认背面站立**（人物背对镜头、面向远山岩壁自然站立，双脚稳踩岩台，双臂自然垂于体侧或轻搭装备，清晰展示背包、外挂登山杖/冰镐、盘绕主绳、腰后镁粉袋、冲锋衣剪裁与发型背影轮廓；左右各留 **10%–12%** 安全边距以便与测绘标尺错开不遮挡）。  
> **自动替换机制**：UI 自动调用 `AssetRegistry.getCharacterPreviewPath(skinId, gender)`；填入 PNG 路径后直接渲染高清美术效果图，未提供或加载失败时平滑回退至程序背面站立剪影。

| Manifest 路径 | 标准文件名 | 性别 | 穿搭方案 | 推荐分辨率 (px) | 画幅比例 | 构图与美术要求 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `character.previews['alpine-orange'].male` | `char-preview-alpine-orange-male.png` | 男 | 山脊经典（默认一） | **512 × 768**（或 **768 × 1152**） | 2:3 透明底 | 背面直立全身；蓝橙冲锋衣、高山针织帽+风镜、经典户外背包+橙色盘绳、腰后镁粉袋、攀岩鞋踩地；左上 45° 受光，深墨清线 `#141820`，底部留白 6% | **P0** |
| `character.previews['alpine-orange'].female` | `char-preview-alpine-orange-female.png` | 女 | 山脊经典（默认一） | **512 × 768**（或 **768 × 1152**） | 2:3 透明底 | 背面直立全身；同色系收腰冲锋衣剪裁、脑后高山编发/马尾（带强调色发绳）、修身登山轮廓、背包与盘绳比例协调；左上 45° 受光，深墨清线 `#141820` | **P0** |
| `character.previews['glacier-cyan'].male` | `char-preview-glacier-cyan-male.png` | 男 | 极光冰青（默认二） | **512 × 768**（或 **768 × 1152**） | 2:3 透明底 | 背面直立全身；冰青冲锋衣、头灯防撞头盔、冰镐技术登山包、青色主绳与冷灰攀岩裤；清线硬边塞璐璐阴影 | **P0** |
| `character.previews['glacier-cyan'].female` | `char-preview-glacier-cyan-female.png` | 女 | 极光冰青（默认二） | **512 × 768**（或 **768 × 1152**） | 2:3 透明底 | 背面直立全身；冰青收腰冲锋衣、头盔下垂高山编发、冰镐技术包与青色主绳、攀岩鞋稳立；与男版保持同一地平线与镜头机位 | **P0** |

### 2.1 局内核心躯干与四肢（`ArtAssetManifest.character.skins[skinId]`，P0 必做）

> 若女角色在局内需要独立躯干/头部/编发贴图，可按需配置在 `ArtAssetManifest.character.genderSkinOverrides[skinId].female` 中覆盖对应部件，未配置部件自动复用同穿搭基础件。

| Manifest 字段名 | 中文部件名 | 驱动方式 | 逻辑尺寸 (world px) | 推荐导出分辨率 (4× px) | 锚点 / 关节位置 | 制作要点与防穿帮规范 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Torso` | 躯干外套（背视微侧） | 锚点 | 32 × 48 | **128 × 192** | `(0.50, 0.50)` | 冲锋衣/硬壳褶皱、领口与肩线圆润收口，肩髋处略留覆叠余量防止四肢衔接漏缝 | **P0** |
| `Pelvis` | 安全带与胯部 | 锚点 | 30 × 14 | **120 × 56** | `(0.50, 0.45)` | 攀岩安全带腰环、装备挂环、金属快挂细节，盖住躯干下摆与大腿根部 | **P0** |
| `Head` | 头部（默认姿态） | 锚点 | 24 × 26 | **96 × 104** | `(0.50, 0.64)` | 背视/微仰头视角；含针织帽/头盔/风镜轮廓，锚点在后颈转轴 | **P0** |
| `LeftUpperArm` | 左大臂 | 骨骼拉伸 | 宽 11.5 | **64 × 128** | 起点 Y=0.14 / 终点 Y=0.86 | 垂直朝下；两端画圆润关节包头（肩头/肘部）防弯折露白 | **P0** |
| `LeftForearm` | 左小臂 | 骨骼拉伸 | 宽 9.5 | **56 × 128** | 起点 Y=0.14 / 终点 Y=0.86 | 垂直朝下；可带白色运动护腕/缠带（贴合 Cairn 风格） | **P0** |
| `LeftThigh` | 左大腿 | 骨骼拉伸 | 宽 13.2 | **72 × 144** | 起点 Y=0.14 / 终点 Y=0.86 | 垂直朝下；户外攀岩裤膝盖耐磨补丁与裤褶阴影 | **P0** |
| `LeftCalf` | 左小腿 | 骨骼拉伸 | 宽 11.0 | **64 × 144** | 起点 Y=0.14 / 终点 Y=0.86 | 垂直朝下；可含弹性绷带/护腿绑带细节 | **P0** |
| `LeftHand` | 左手（默认抓握） | 锚点 | 12 × 11 | **64 × 64** | `(0.45, 0.50)` | 手指微扣岩点形态，手背朝外；锚点位于掌心抓握受力点 | **P0** |
| `LeftFoot` | 左攀岩鞋 | 锚点 | 17 × 10 | **80 × 48** | `(0.46, 0.50)` | 贴壁侧踩专业攀岩鞋（橡胶包头+魔术贴），锚点位于前脚掌发力点 | **P0** |
| `Backpack` | 登山背包主体 | 锚点 | 30 × 38 | **120 × 152** | `(0.50, 0.56)` | 帆布/尼龙登山包主体、顶包、织带与金属扣具 | **P0** |
| `BackpackGear` | 背包外挂装备层 | 锚点 | 68 × 44 | **272 × 176** | `(0.50, 0.52)` | 横向长杖/冰镐、右侧红色盘绕主绳、底部挂袋与指南针（Cairn 标志剪影） | **P0** |
| `ChalkBag` | 腰后镁粉袋 | 锚点 | 11 × 13 | **48 × 56** | `(0.50, 0.12)` | 挂于后腰中央随身体晃动，袋口带轻微白色镁粉痕 | **P0** |

### 2.2 右侧独立件与动态状态变体（P1 / P2 增强表现）

| Manifest 字段名 | 中文部件名 | 逻辑尺寸 / 分辨率 (4× px) | 锚点 | 触发场景与说明 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `RightUpperArm` / `RightForearm` | 右大臂 / 右小臂 | 64×128 / 56×128 | 同左侧 | 不填则自动镜像左侧；若左右臂章/绑带不同再单独出图 | P2 |
| `RightThigh` / `RightCalf` | 右大腿 / 右小腿 | 72×144 / 64×144 | 同左侧 | 不填则自动镜像左侧 | P2 |
| `RightHand` / `RightFoot` | 右手 / 右攀岩鞋 | 64×64 / 80×48 | `(0.45, 0.50)` / `(0.46, 0.50)` | 不填则自动镜像左侧 | P2 |
| `Scarf` | 飘动围巾/领巾 | 26×18 / **104 × 72** | `(0.78, 0.25)` | 随高空横风摆动 | P1 |
| `HandOpen` | 张手探点手型 | 12×11 / **64 × 64** | `(0.45, 0.50)` | 拖拽手臂寻找下一岩点时显示 | P1 |
| `HandGrip` | 紧扣抓握手型 | 12×11 / **64 × 64** | `(0.45, 0.50)` | 稳固抓握岩点时显示 | P1 |
| `HandChalked` | 覆镁粉白手型 | 12×11 / **64 × 64** | `(0.45, 0.50)` | 拍粉后指尖覆盖明显白粉 | P1 |
| `HandTaped` | 医用白胶布缠指手型 | 12×11 / **64 × 64** | `(0.45, 0.50)` | 贴合 Cairn 真实攀岩缠指美学 | P1 |
| `HandStrained` | 充血抖动发力手型 | 12×11 / **64 × 64** | `(0.45, 0.50)` | 手臂耐力低于阈值/极限承重时触发 | P1 |
| `HeadCalm` / `HeadStrained` / `HeadExhausted` | 平静 / 咬牙发力 / 疲惫低头 | 24×26 / **96 × 104** | `(0.50, 0.64)` | 根据耐力与负荷自动切换微动作姿态 | P2 |
| `JointElbow` / `JointKnee` | 肘部 / 膝部关节盖片 | 10×10 / 12×12（**48×48**） | `(0.50, 0.50)` | 覆盖弯曲处接缝，增强法比清线衣褶连续感 | P1 |

---

## 三、岩壁背景与镜头大场景需求表（`ArtAssetManifest.walls[packId]`）

> **4 套地貌主题包（`ArtPackId`）**：  
> 1. `snow-ridge-granite`（雪脊花岗岩 — 已有基础底图，可按 Cairn 风格重绘替换）  
> 2. `frost-crown-ice`（霜冠冰岩 — 已有基础底图，可按 Cairn 风格重绘替换）  
> 3. `ridge-alpine`（高山刃脊 — 预留槽位，待出图）  
> 4. `slate-cliff`（青灰板岩绝壁 — 预留槽位，待出图）

| Manifest 字段名 | 中文资源名 | 推荐分辨率 (px) | 画幅比例 | 构图与无缝衔接硬性规范 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `startLedge` | 01-起攀岩台图 | **1080 × 1920** | 9:16 竖屏 | 底部 `Y = 85.5%` 处为水平可站立起步平台；顶部 18% 为纯岩壁以便与主岩壁羽化融合 | **P0** |
| `climbingWall` | 02-主攀爬岩壁（循环底图） | **1080 × 1920** | 9:16 竖屏 | **必须支持垂直无缝循环**（顶部与底部 16% 纹理明暗、裂隙密度一致），左右边缘避免强对比孤立大块以免横向镜像穿帮；整体中灰不过曝，确保前景角色与岩点层次突出 | **P0** |
| `wallDetailOverlay` | 岩壁清线排线/肌理叠层 | **1024 × 1024** | 1:1 透明循环 | 透明底黑色/冷青墨线排线与细碎岩纹，四方连续，叠加在 `climbingWall` 上强化 Cairn 版画质感 | **P1** |
| `summitNear` | 03-登顶近景与天空 | **1080 × 1920** | 9:16 竖屏 | 上部为高空苍穹与远峰，峰顶站立平面位于 `Y ≈ 33%~43%`（依主题指标对齐），底部 18% 为实岩平滑过渡至主岩壁 | **P0** |
| `wideEnding` | 04-登顶广角山体全貌 | **1080 × 1920**（或 **1440 × 2560**） | 9:16 竖屏 | **一图三用（请重点控制构图焦点）**：① 登顶镜头拉远全屏山体全貌；② 登顶结算弹窗顶图（焦点 `50% / 34%`）；③ **关卡详情弹窗顶部风貌横幅**（焦点 `50% / 32%`）。请将山峰主体轮廓置于纵向 **`25%–45%`** 黄金带，底部预留干净山谷/云海暗区承托励志诗句排版 | **P0** |

---

## 四、岩点（Hold）与状态叠加层需求表（`ArtAssetManifest.holds[packId]`）

> **设计原则**：每个岩点单张均为**透明底独立 PNG**，自带一圈柔和的根部岩壁咬合阴影（Ambient Collar），使岩点贴在任意岩壁位置都自然长在石头上而非浮贴。每套地貌包对应 **10 张标准语义岩点**。

### 4.1 十类基础语义岩点（P0 必做，每套地貌包 10 张）

| Manifest 字段名 | 对应中文岩点形态 | 推荐分辨率 (px) | 抓握锚点 `(anchorX, anchorY)` | 逻辑宽倍比 (`radiusToWidth`) | 造型与玩法语义要求 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `jug` | 01-厚弧岩沿（大把手） | **256 × 256** | `(0.56, 0.36)` | `2.30` | 厚实宽大、顶缘受光清晰，玩家一眼识别为稳妥好点 |
| `crimp` | 02-薄片小边（抠点） | **256 × 256** | `(0.50, 0.49)` | `2.50` | 锐利狭窄的横向薄岩棱，仅容指尖扣入，高光细而硬 |
| `pinch` | 03-三角捏点 | **256 × 256** | `(0.51, 0.46)` | `2.40` | 立体三角凸脊，左右两侧面分明便于拇指与四指对捏 |
| `horn` | 04-圆头岩角（抓角） | **256 × 256** | `(0.61, 0.44)` | `2.45` | 柱状凸出圆润岩角，承重感强 |
| `sloper` | 05-低弧斜面（摩擦点） | **256 × 256** | `(0.50, 0.44)` | `2.28` | 圆滑向下倾斜的开放面，无明显扣沿，强调摩擦抓握感 |
| `undercling` | 06-倒扣薄缘（反扣点） | **256 × 256** | `(0.52, 0.44)` | `2.38` | 上缘平滑、下缘内凹暗影清晰，视觉引导“自下而上反扣” |
| `ledge` | 07-双层阶块（脚台/大台） | **256 × 256** | `(0.54, 0.42)` | `2.42` | 阶梯状宽厚平层，适合双脚踩稳或中段歇脚 |
| `sidepull` | 08-竖向侧拉棱 | **256 × 256** | `(0.48, 0.48)` | `2.45` | 纵向竖直薄棱，左侧受光/右侧凹槽（右侧拉由引擎自动水平镜像） |
| `pocket` | 09-月牙凹窝（指洞） | **256 × 256** | `(0.52, 0.44)` | `2.40` | 岩面内陷的深色月牙指洞，洞口下缘有明显厚度 |
| `crack` | 10-斜向裂缝（塞手缝） | **256 × 256** | `(0.50, 0.50)` | `2.55` | 45° 斜向深邃岩缝，适合涨手/塞脚与打入岩钉 |

### 4.2 岩点状态叠加层（`holds[packId].overlays`，全地貌可通用，P1 强烈推荐）

| Manifest 字段名 | 中文状态名 | 推荐分辨率 (px) | 叠加方式 | 制作要点 |
| :--- | :--- | :--- | :--- | :--- |
| `chalk` | 镁粉手印叠层 | **256 × 256** | 居中覆盖在岩点表面 | 干擦笔刷质感白色镁粉涂抹与指印（不透明中心 75%，边缘自然散粉） |
| `wet` | 潮湿/结霜反光叠层 | **256 × 256** | 居中覆盖在岩点表面 | 冷青蓝色水膜高光与垂挂微水珠，传达湿滑易脱手风险 |
| `crack1` | 脆岩初裂纹（1 级） | **256 × 256** | `crackProgress > 0.08` | 细微黑色发丝裂纹，预示岩块开始松动 |
| `crack2` | 脆岩扩展裂纹（2 级） | **256 × 256** | `crackProgress > 0.34` | 明显分叉深裂口与少量碎石屑 |
| `crack3` | 脆岩濒碎裂纹（3 级） | **256 × 256** | `crackProgress > 0.68` | 贯穿岩块的粗黑断层与剥落碎屑，提示即将崩落 |

### 4.3 特殊机制岩点专属贴图（`holds[packId].special`，P2 可选增强）

| Manifest 字段名 | 机制含义 | 推荐分辨率 (px) | 视觉区分要点 |
| :--- | :--- | :--- | :--- |
| `spring` | 弹性蓄力踏点 | **256 × 256** | 带弹性岩片或醒目浅绿苔藓/弹性结构暗示 |
| `swing` | 摆荡挂点 | **256 × 256** | 外凸圆环岩鼻/天生穿洞石耳 |
| `tremor` | 共振颤动岩块 | **256 × 256** | 边缘疏松、带层状片岩震颤质感 |
| `decoy` | 虚假干扰点 | **256 × 256** | 浅表薄皮或微松风化感，与真点有细微辨识度 |

---

## 五、世界交互道具与地标需求表（`ArtAssetManifest.worldProps`）

| Manifest 字段名 | 中文道具名 | 逻辑尺寸 (world px) | 推荐导出分辨率 (4× px) | 锚点 `(anchorX, anchorY)` | 制作要点 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `pitonFresh` | 新打入岩钉+快挂 | 22 × 26 | **96 × 112** | `(0.50, 0.36)` | 银灰钢制岩钉与橙/红铝制快挂环，清线高光 | **P0** |
| `pitonRusty` | 野外老旧锈钉 | 22 × 26 | **96 × 112** | `(0.50, 0.36)` | 斑驳铁锈红褐色、微弯旧钉，提示低可靠度 | **P1** |
| `climbot` | 机械保护助手（Climbot） | 46 × 54 | **192 × 224** | `(0.35, 0.32)` | 参考图右下角风格：白/橙机械防坠机器人，底部悬垂收卷主绳 | **P1** |
| `bivouacCamp` | 岩壁宿营帐/补给包 | 64 × 40 | **256 × 160** | `(0.50, 0.92)` | 紧凑双人高山露营小帐或吊帐装备，放于休息台存档点 | **P1** |
| `bivouacFlag` | 休息台标记小旗 | 32 × 40 | **128 × 160** | `(0.25, 0.95)` | 插于岩台的橙色探险小旗 | **P1** |
| `summitCairn` | 峰顶石堆（Cairn 玛尼堆） | 48 × 56 | **192 × 224** | `(0.50, 0.94)` | 堆叠平衡的扁石塔，登山文化标志 | **P0** |
| `summitFlag` | 峰顶迎风探险旗 | 64 × 72 | **256 × 288** | `(0.16, 0.96)` | 猎猎作响的峰顶旗帜，底部锚点对准旗杆插地处 | **P0** |
| `cliffFlora` | 峭壁耐寒植物丛 | 40 × 40 | **160 × 160** | `(0.50, 0.82)` | 参考图左上角风格：清线平涂灰绿/枯黄高山岩缝草木，打破纯石单调感 | **P1** |

---

## 六、真实攀登线路仪式感徽章系统需求表（`ArtAssetManifest.badges[routeId]`）

> **设计理念**：对应游戏中 11 条现实世界经典攀登线路，每枚徽章采用**欧式高山俱乐部珐琅金属勋章（Alpine Club Enamel Medallion）**与 *Cairn* 法比清线结合的仪式感设计：
> - **统一规格**：**512 × 512 px**（透明底 PNG-32，安全留白 8%，居中构图，带顶部挂环或绶带扣结构）。
> - **外框分级仪式感**：
>   - **01–04 启蒙/初级线**：暖古铜 / 砂岩银圆形或圆角盾章，明快日光底色；
>   - **05–08 中级/高级线**：锻钢 / 琥珀金八角章与尖底纹章盾，深岩午夜底色；
>   - **09–11 大师绝巅线**：冷铂金 / 耀金皇冠菱盾与多角星章，深寒星夜底色配高光金属浮雕。
> - **自动替换与锁定态**：`ClimbBadge.tsx` 自动调用 `AssetRegistry.getBadgeSpritePath(routeId)`；未解锁时前端自动施加去色与暗化浮雕滤镜，**美术只需交付点亮后的彩色完成稿即可**。

| `RouteId` | 推荐文件名 | 现实线路名（中 / 英） | 难度 · 长度 | 徽章名称 | 专属仪式感地标纹样与工艺要点 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `kids` | `badge-kids.png` | **天鹅岩缓壁** / Swan Slab（优胜美地山谷） | `5.4 · 24m` | **天鹅初翼** | 圆形古铜暖金章；朝阳升起于温润花岗岩缓坡之上，展翼天鹅弧线与晨光放射线 | **P0** |
| `intro` | `badge-intro.png` | **白马岩脊** / Whitehorse Ledge（新罕布什尔） | `5.6 · 35m` | **白马踏云** | 圆形银白珐琅章；流线花岗穹壁上跃起的白马剪影，底部绕以层叠晨雾丝带 | **P0** |
| `beginner` | `badge-beginner.png` | **皇家拱门** / Royal Arches（优胜美地山谷） | `5.7 · 45m` | **拱壁冠冕** | 圆角石盾章；层叠半圆花岗岩天然巨拱，拱顶镶嵌三尖小金冠拱心石 | **P0** |
| `beginner-plus` | `badge-beginner-plus.png` | **高危悬廊** / High Exposure（肖旺根克山脉） | `5.8 · 52m` | **绝崖飞檐** | 棱角石英盾章；经典向右探出的高空石英岩屋檐横梁，下方为深谷云隙与飘动护绳 | **P0** |
| `intermediate` | `badge-intermediate.png` | **蛇脊壁** / Snake Dike（半穹顶西南壁） | `5.9 · 62m` | **蛇纹磐石** | 八角深蓝金边章；半穹顶浑圆剪影表面蜿蜒向上的金色石英脉岩脊（Dike），如游蛇盘壁 | **P0** |
| `intermediate-plus` | `badge-intermediate-plus.png` | **月光拱壁** / Moonlight Buttress（锡安大峡谷） | `5.10b · 75m` | **月照砂壁** | 竖盾赤砂岩章；通体笔直劈裂的纳瓦霍红砂岩垂直指缝，顶端悬一轮冷银弯月照亮裂隙 | **P0** |
| `advanced` | `badge-advanced.png` | **魔鬼塔裂隙** / Durrance Route（怀俄明魔鬼塔） | `5.10d · 88m` | **玄柱擎天** | 六角玄武岩棱柱章；垂直并列的深青柱状节理玄武岩与平顶塔冠，中轴一道锋利金线贯穿裂隙 | **P0** |
| `advanced-crux` | `badge-advanced-crux.png` | **莲花塔南壁** / Lotus Flower Tower（不可攀登峰群） | `5.11c · 100m` | **冰谷青莲** | 尖峰纹章盾；雪原冰谷中拔地而起的锐利花岗岩尖塔，塔身绽放几何清线青莲花瓣与双雪星 | **P0** |
| `master-1` | `badge-master-1.png` | **艾格峰北壁** / Heckmair Route（瑞士伯尔尼高地） | `5.12a · 112m` | **白蛛霜刃** | 暗银皇冠盾章；陡峭阴冷的北壁岩面中央盘踞著名的“白色蜘蛛（White Spider）”放射冰场，双交叉冰镐镇底 | **P0** |
| `master-2` | `badge-master-2.png` | **马特洪峰北壁** / Schmid Route（瑞士/意大利边境） | `5.12d · 128m` | **寒锋金字塔** | 铂金菱形雪刃章；极具辨识度的三棱锥孤峰金字塔剪影（右倾刃脊），配旗云与寒星 | **P0** |
| `master-3` | `badge-master-3.png` | **黎明之墙** / The Dawn Wall（酋长岩东壁） | `5.13c · 145m` | **黎明神冕** | 终极耀金星芒皇冠章；近乎绝对垂直的酋长岩东壁在破晓第一缕万丈金光中苏醒，顶端桂冠星冕 | **P0** |

---

## 七、单关卡独立美术覆写与逐步替换规范（`ArtAssetManifest.routeOverrides[routeId]`）

> **渐进式逐关优化机制**：  
> 引擎现已内置 `ArtAssetManifest.routeOverrides[routeId]` 逐关覆写层。后续团队可以**一次只打磨 1 个关卡**（例如先做 `kids` 天鹅岩缓壁，再做 `master-3` 黎明之墙）：
> - 某关卡配置了 `routeOverrides[routeId]` 中的任意子项（`walls` / `holds` / `overlays` / `special` / `atmosphere`）时，渲染器与登顶广角插画会自动加载该关卡专属贴图，并按 `${packId}::${routeId}` 独立缓存；
> - 未配置的关卡或未覆写的子字段，自动无缝回退到该关卡所属的地貌主题包（`ArtPackId`），**互不干扰、随时可灰度上线**。

| 序号 | `RouteId` | 现实攀登线路 | 难度 · 长度 | 默认地貌回退包 | 逐关美术优化方向（供单关精修参考） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 01 | `kids` | **天鹅岩缓壁**（Swan Slab） | `5.4 · 24m` | `snow-ridge-granite` | 温暖浅灰优胜美地花岗岩、针叶松远景与明亮清晨日光，平缓大摩擦面与清晰粉笔印 |
| 02 | `intro` | **白马岩脊**（Whitehorse Ledge） | `5.6 · 35m` | `snow-ridge-granite` | 乳白略带淡青条纹的冰川磨蚀花岗岩穹顶，山谷云带与新英格兰秋色林线 |
| 03 | `beginner` | **皇家拱门**（Royal Arches） | `5.7 · 45m` | `snow-ridge-granite` | 大尺度层叠弧形剥落岩层、拱形屋檐阴影与优胜美地谷底远眺 |
| 04 | `beginner-plus` | **高危悬廊**（High Exposure） | `5.8 · 52m` | `snow-ridge-granite` | 乳白/淡赭色石英砾岩横层、标志性高空突出巨型屋檐与开阔河谷暴露感 |
| 05 | `intermediate` | **蛇脊壁**（Snake Dike） | `5.9 · 62m` | `ridge-alpine` | 光滑浅灰花岗岩底面上斜穿而上的粗粝暗色突出石英脉（Dike）与宽广云海 |
| 06 | `intermediate-plus` | **月光拱壁**（Moonlight Buttress） | `5.10b · 75m` | `slate-cliff` | 锡安峡谷标志性赭红/铁锈橙垂直纳瓦霍砂岩壁，细长笔直裂隙与深邃冷紫投影 |
| 07 | `advanced` | **魔鬼塔裂隙**（Durrance Route） | `5.10d · 88m` | `slate-cliff` | 极具雕塑感的深青灰六角玄武岩垂直石柱群与柱间深缝，顶部草原平地天际线 |
| 08 | `advanced-crux` | **莲花塔南壁**（Lotus Flower Tower） | `5.11c · 100m` | `frost-crown-ice` | 极地荒原金色/冷灰高耸花岗岩尖塔、冰川U型谷底与洁净高纬度冷光 |
| 09 | `master-1` | **艾格峰北壁**（Heckmair Route） | `5.12a · 112m` | `frost-crown-ice` | 阴暗石灰岩湿黑岩面夹杂坚冰与雪坡、“白色蜘蛛”冰场与暴风雪雾气层 |
| 10 | `master-2` | **马特洪峰北壁**（Schmid Route） | `5.12d · 128m` | `frost-crown-ice` | 凌厉黑灰混合岩冰壁、锐角刃脊、高空旗云与极寒宝石蓝阴影 |
| 11 | `master-3` | **黎明之墙**（The Dawn Wall） | `5.13c · 145m` | `ridge-alpine` | 酋长岩东壁近乎镜面般的巨幅浅金花岗岩微抠点壁面，随高度由冷夜蓝渐变为破晓炽金 |

---

## 八、UI 全套件整体换新需求表（`ArtAssetManifest.ui`）

> 为实现整体 UI 脱离通用网页感、与 *Cairn* 登山手账 / 法比清线画风完全统一，以下每一块界面元素均已独立拆出槽位并接入 `AssetRegistry.getUiAssetPath` / `getLoadoutIconPath` / `getHudIconPath` / `getRatingStampPath`：

### 8.1 品牌主视觉、面板底纹与场景舞台（5 张）
| Manifest 字段名 | 推荐文件名 | 推荐分辨率 (px) | 画幅 / 格式 | 美术设计要求 | 优先级 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ui.titleLogo` | `title-logo.png` | **960 × 240** | 4:1 透明 PNG-32 | 《孤山独影》手绘版画/清线主标题文字标，融入山脊折线与冰镐/岩缝笔触，深墨 `#141820` 为主 | **P0** |
| `ui.parchmentTexture` | `parchment-tile.png` | **512 × 512** | 1:1 四方连续 | 极轻微粗糙水彩纸/登山路书纸纹（低对比度 3%–5%，浅暖灰 `#F4F1EA` 基准，不可影响正文阅读） | **P1** |
| `ui.characterStageBackdrop` | `character-stage-bg.png` | **640 × 960** | 2:3 PNG | 角色设定页左侧背面人物身后的高空岩台与淡墨等高线远山静景（低饱和度，保证前景人物剪影清晰） | **P0** |
| `ui.dailyBanner` | `daily-banner.png` | **1200 × 360** | 横幅 PNG | 「今日神山」专属破晓云海岩壁横幅底图，暖琥珀金与冷岩影对比，右侧留干净文字可读区 | **P1** |
| `ui.dailyEmblem` | `daily-emblem.png` | **256 × 256** | 1:1 透明 PNG-32 | 「今日神山」日晷/太阳山峰火漆徽记，替换通用日历小图标 | **P1** |

### 8.2 四套负重配装手绘插画图标（`ui.loadoutIcons`，4 张）
| Manifest 字段名 | 推荐文件名 | 推荐分辨率 (px) | 美术设计要点 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| `ui.loadoutIcons.light` | `loadout-light.png` | **256 × 256** | 轻装速攀：紧凑轻量登山包 + 少量快挂，轻盈动感线条 | **P1** |
| `ui.loadoutIcons.balanced` | `loadout-balanced.png` | **256 × 256** | 标准均衡：经典主绳盘卷 + 岩钉锤 + 镁粉袋组合静物 | **P1** |
| `ui.loadoutIcons.heavy` | `loadout-heavy.png` | **256 × 256** | 重装稳健：满挂机械塞/岩钉/多组快挂与双绳的大岩壁装备架 | **P1** |
| `ui.loadoutIcons['free-solo']` | `loadout-free-solo.png` | **256 × 256** | 徒手独攀：仅一双攀岩鞋与缠白胶布的双手剪影（朱红/暗金强调，致敬纯粹孤勇） | **P0** |

### 8.3 局内 HUD 战术功能图标（`ui.hudIcons`，6 张）
| Manifest 字段名 | 推荐文件名 | 推荐分辨率 (px) | 用途与绘制要求 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| `ui.hudIcons.piton` | `hud-piton.png` | **128 × 128** | 打岩钉按钮图标：清线钢制岩钉与岩锤 | **P1** |
| `ui.hudIcons.chalk` | `hud-chalk.png` | **128 × 128** | 涂镁粉按钮图标：束口镁粉袋与扬起的白色粉尘 | **P1** |
| `ui.hudIcons.shake` | `hud-shake.png` | **128 × 128** | 甩手排酸按钮图标：自然下垂抖动放松的前臂与动势线 | **P1** |
| `ui.hudIcons.roadbook` | `hud-roadbook.png` | **128 × 128** | 路书读线按钮图标：手绘折页登山地形图与红线轨迹 | **P1** |
| `ui.hudIcons.altitude` | `hud-altitude.png` | **128 × 128** | 海拔/进度标尺图标：双峰三角标与高度刻度 | **P2** |
| `ui.hudIcons.lean` | `hud-lean.png` | **128 × 128** | 重心左右倾微调图标：登山者髋部重心双向箭头示意 | **P2** |

### 8.4 登顶结算评级金属/火漆印章（`ui.ratingStamps`，6 张）
| Manifest 字段名 | 推荐文件名 | 推荐分辨率 (px) | 视觉分级设计 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| `ui.ratingStamps.SSS` | `rating-sss.png` | **256 × 256** | 耀金星芒皇冠火漆章（徒手独攀最高荣耀，双环桂冠+高光浮雕） | **P0** |
| `ui.ratingStamps['S+']` | `rating-s-plus.png` | **256 × 256** | 鎏金双翼山峰章 | **P1** |
| `ui.ratingStamps.S` | `rating-s.png` | **256 × 256** | 翠玉松绿登山俱乐部印章 | **P1** |
| `ui.ratingStamps.A` | `rating-a.png` | **256 × 256** | 冰川天蓝钢印章 | **P1** |
| `ui.ratingStamps.B` | `rating-b.png` | **256 × 256** | 冷岩铁灰印章 | **P2** |
| `ui.ratingStamps.C` | `rating-c.png` | **256 × 256** | 粗陶岩褐印章 | **P2** |

---

## 九、气象、粒子与攀爬特效 VFX 需求表（`ArtAssetManifest.vfx`）

> 替换引擎内现有程序几何粒子，使拍粉、砸钉、脆岩碎落、大师级落冰与暴风雪都具备统一的手绘清线版画质感：

| Manifest 字段名 | 推荐文件名 | 推荐分辨率 (px) | 触发场景与绘制规范 | 优先级 |
| :--- | :--- | :--- | :--- | :--- |
| `vfx.chalkPuff` | `vfx-chalk-puff.png` | **256 × 256** | 涂镁粉/强抓点时的白色干擦粉尘烟雾团（边缘带微细粉粒，柔和透明过渡） | **P1** |
| `vfx.sparkPiton` | `vfx-spark-piton.png` | **128 × 128** | 锤入岩钉刹那迸发的锐利暖橙/白金清线火星 | **P1** |
| `vfx.rockDebris` | `vfx-rock-debris.png` | **256 × 256** | 脆岩崩裂下坠的 4 块不规则多面体碎石贴图（深墨描边+冷灰受光面） | **P1** |
| `vfx.iceShard` | `vfx-ice-shard.png` | **128 × 256** | 大师级偶发事故「高空落冰」的锋利半透明冰锥投射物（深青墨线+白高光） | **P0** |
| `vfx.snowFlake` | `vfx-snow-flake.png` | **128 × 128** | 高海拔暴风雪/白毛风飘雪颗粒（手绘不规则粉雪团，非机械圆点） | **P1** |
| `vfx.rainStreak` | `vfx-rain-streak.png` | **64 × 256** | 冻雨斜落雨丝贴图（带细微青白高光） | **P2** |
| `vfx.mistVeil` | `vfx-mist-veil.png` | **1024 × 512** | 高空流动云海与雾霭层次叠层（柔和横向云带，无缝左右循环） | **P1** |
| `vfx.windStreak` | `vfx-wind-streak.png` | **512 × 128** | 强横风预警与阵风爆发时的法比清线空气流线丝带 | **P1** |
| `vfx.dynoRing` | `vfx-dyno-ring.png` | **256 × 256** | Dyno 动态跃抓蓄力满格与蹬腿爆发时的手绘张力冲击环 | **P1** |

---

## 十、完整目录结构与零侵入替换示例

### 10.1 推荐目录结构
```text
src/visual/
├── AssetRegistry.ts                  # 全局唯一资源注册中心（角色/岩壁/岩点/道具/徽章/单关/UI/VFX）
├── art-packs/                        # 4 套公共地貌回退主题包
│   ├── snow-ridge-granite/           # 雪脊花岗岩（4张大场景 + 1张肌理 + 10张岩点）
│   ├── frost-crown-ice/              # 霜冠冰岩（4张大场景 + 1张肌理 + 10张岩点）
│   ├── ridge-alpine/                 # 高山刃脊
│   ├── slate-cliff/                  # 青灰板岩绝壁
│   └── shared-overlays/              # chalk.png / wet.png / crack1~3.png + special/
├── route-packs/                      # 11 关单关卡独立精修资源包（按 RouteId 逐关替换）
│   ├── kids/                         # 01 天鹅岩缓壁
│   ├── ...                           # 02–10
│   └── master-3/                     # 11 黎明之墙
├── badges/                           # 11 枚真实攀登线路仪式感徽章（512×512 PNG-32）
│   └── badge-<routeId>.png
├── character-packs/
│   ├── previews/                     # 4 张角色设定页背面站立效果图（2穿搭 × 男女）
│   ├── alpine-orange/                # 默认穿搭一局内部件
│   └── glacier-cyan/                 # 默认穿搭二局内部件
├── world-props/                      # 8 张世界交互道具与地标
├── ui-kit/                           # 21 张 UI 全套件（title-logo / parchment / stage-bg / loadout / hud / rating）
└── vfx/                              # 9 张气象与动态特效贴图
```

### 10.2 全模块零侵入替换接入示例
```ts
import { AssetRegistry } from './visual/AssetRegistry';
import { CAIRN_REFERENCE_ATMOSPHERE_GRADE } from './visual/artRegistry';

AssetRegistry.patchManifest({
  // 1. 角色背面效果图 & 局内四肢部件
  character: {
    previews: {
      'alpine-orange': { male: alpineOrangeMaleBackPng, female: alpineOrangeFemaleBackPng },
      'glacier-cyan': { male: glacierCyanMaleBackPng, female: glacierCyanFemaleBackPng },
    },
    skins: {
      'alpine-orange': {
        Torso: torsoPng,
        Pelvis: pelvisPng,
        Head: headPng,
        Backpack: backpackPng,
        BackpackGear: backpackGearPng,
        LeftUpperArm: upperArmPng,
        LeftForearm: forearmPng,
        LeftHand: handPng,
        LeftThigh: thighPng,
        LeftCalf: calfPng,
        LeftFoot: footPng,
      },
    },
  },
  // 2. 11 枚真实线路仪式感徽章
  badges: {
    kids: badgeKidsPng,
    'master-3': badgeDawnWallPng,
  },
  // 3. 单关卡独立覆写（先做任意一关即可上线）
  routeOverrides: {
    'master-3': {
      walls: {
        startLedge: dawnWallStartPng,
        climbingWall: dawnWallMainPng,
        summitNear: dawnWallSummitPng,
        wideEnding: dawnWallWidePng,
      },
      holds: { crimp: dawnWallCrimpPng, sloper: dawnWallSloperPng },
      atmosphere: CAIRN_REFERENCE_ATMOSPHERE_GRADE,
    },
  },
  // 4. 世界交互道具
  worldProps: {
    pitonFresh: pitonFreshPng,
    climbot: climbotPng,
    summitCairn: summitCairnPng,
    cliffFlora: cliffFloraPng,
  },
  // 5. UI 全套件（标题 Logo、纸纹、角色舞台背景、今日神山、配装/HUD/评级印章）
  ui: {
    titleLogo: titleLogoPng,
    parchmentTexture: parchmentTilePng,
    characterStageBackdrop: characterStageBgPng,
    dailyBanner: dailyBannerPng,
    dailyEmblem: dailyEmblemPng,
    loadoutIcons: {
      light: loadoutLightPng,
      balanced: loadoutBalancedPng,
      heavy: loadoutHeavyPng,
      'free-solo': loadoutFreeSoloPng,
    },
    hudIcons: { piton: hudPitonPng, chalk: hudChalkPng, shake: hudShakePng },
    ratingStamps: { SSS: ratingSssPng, 'S+': ratingSPlusPng, S: ratingSPng },
  },
  // 6. 气象与特效 VFX
  vfx: {
    chalkPuff: vfxChalkPuffPng,
    sparkPiton: vfxSparkPitonPng,
    rockDebris: vfxRockDebrisPng,
    iceShard: vfxIceShardPng,
    snowFlake: vfxSnowFlakePng,
    windStreak: vfxWindStreakPng,
    dynoRing: vfxDynoRingPng,
  },
});
```

### 10.3 交付前 10 项必检清单
1. **透明边缘无白边/黑边杂色**：所有 PNG 在浅色与深色岩壁底图上均干净无毛边。
2. **角色设定效果图背面站立统一**：4 张背面站立效果图保持同一脚底地平线、同一缩放比例与左上 45° 受光，在手机端左右分栏下头部与鞋底均不被裁切。
3. **四肢垂直朝下 + 14%/86% 关节对齐**：检验肘/膝大幅弯曲时无错位、无露白。
4. **岩点锚点对准抓握面**：手掌/脚尖落点刚好扣在 `anchorX/anchorY` 所示受力棱线上。
5. **主岩壁上下无缝拼接**：上下叠放两张 `climbingWall` 检查接缝完全不可见。
6. **徽章轮廓清晰可缩读**：11 枚 `512×512` 徽章在缩小至 **`44×44 px`（单行关卡列表）**、`48×48 px`（关卡详情弹窗）与 `56×56 px`（徽章墙卡片）时仍清晰辨识。
7. **`wideEnding` 一图三用构图校验**：主峰轮廓位于纵向 `25%–45%`，在全屏登顶全景、登顶结算顶图与关卡详情横幅中均不裁切主峰。
8. **UI 纸纹与舞台底图低干扰**：`parchmentTexture` 与 `characterStageBackdrop` 不抢前景文字或人物轮廓对比度（满足 WCAG AA 可读性）。
9. **VFX 粒子与清线风格统一**：雪片、碎石、冰锥与风痕保持硬边/干擦手绘质感，避免模糊高斯光晕破坏法比清线画风。
10. **全局光照统一**：角色、岩点、道具、岩壁、徽章与 UI 图标共享左上 45° 主光与冷青灰阴影体系。

---

## 十一、近期版本更新核对清单（GitHub 同步参考）

- **全模块美术注册中心（v2.1）**：`ArtAssetManifest` 与 `AssetRegistry` 完整覆盖 **9 大视觉模块**（角色立绘/骨骼、公共地貌岩壁、语义岩点与叠层、11 枚徽章、11 关独立覆写、世界道具、**UI 全套件**、**气象/攀爬 VFX**），统一 kebab-case 命名规范，整体换皮零硬编码。
- **角色设定页主视觉聚焦 + 嵌入式测绘标尺**：左侧背面站立人物画幅扩张至 **61%–62%**（手机端 `248px` / 桌面端 `336px`），姓名置于人物正上方，身高 / 臂展（+臂展差）/ 体重与实时装备负重 / 力量体重比以无框测绘标尺融入画幅四周；右侧收敛为紧凑控制栏（名称+随机、性别、2 套默认穿搭、负重快捷跳转），手机端零滚动一屏完整呈现。
- **物理抓握零向上冲量重构（根治“莫名上跳”）**：移除 `updateClimberPhysics` 与 `attemptGrabHold` 中所有抓握额外向上冲量（Impulse Y）及垂直弹簧过冲，改用连续重心平移与渐进式肢体几何约束解算，并在开发模式透明调试层中实时监控 `vy` 波形。
- **登顶三段式沉浸序列**：`PAN_REVEAL`（镜头丝滑拉远展露山体全貌）→ `QUOTE_REVEAL`（唯美登山励志诗句）→ 点击屏幕进入 `MODAL_READY`（战绩结算弹窗）。
- **11 条现实世界攀登线路与仪式感徽章**：全面升级为现实世界 11 条经典线路（大字线路名 + 小字难度与全长，兼容旧存档），重绘 11 枚地标仪式感徽章。
- **关卡页交互重构**：预览页无开始按钮、单列「一行一关」卡片；点击弹出含山体头图、徽章预览与快捷配装的详情弹窗，下方居中展示「开始攀登」按钮。

# 万国觉醒 APK 逆向资源清单

> 来源 APK：`com.lilithgames.rok.offical.cn` v1.1.13.72（2.08 GB）
> 提取方式：`unzip` 解包 + 分类筛选，按 APK 原始相对路径落地。

## 关键技术事实

万国觉醒是 **Unity 引擎**打包的游戏（含 `libil2cpp.so` / `libunity.so` / `libmain.so`）。
其绝大部分美术、音频、3D 模型资源都封在 **Lilith 专有加密的 `.lb` 资源包**里
（如 `auto_share_*.lb`、`ez_data_*.lb`、`gdodlc_sound_*.lb`、`troop_*.lb` 等，合计约 **1.7 GB**）。
这些 `.lb` 包**不是可直接使用的图片/音频文件**，需专用解密工具（如 AssetStudio + Lilith 解密补丁）
才能还原为 png / mp3 / fbx，因此**未纳入本项目仓库**（体积过大且不可用）。

## 已纳入本项目的有用资源（可直接使用）

| 类别 | 路径（相对 `assets-raw/`） | 说明 |
|---|---|---|
| 开场/主视频 | `assets/video_new.mp4` (22M)、`assets/splash_video.mp4` (12M) | 游戏主宣传/开场视频 |
| 英雄视频 | `assets/herovideo/*.mp4` (7.7M) | 英雄展示视频 |
| UI 视频 | `assets/UIVideo/*.mp4` (3.9M) | 界面内嵌视频 |
| 活动视频 | `assets/rift_caocao.mp4` (1.5M) | 曹操裂隙活动视频 |
| 字幕 | `assets/video_new_*.srt` (19 种语言) | 主视频多语言字幕 |
| 音频配置 | `assets/AudioConfig.xml` (1M) | 游戏音频/音效配置表 |
| 游戏配置 | `assets/ConfigFile.json`、`assets/ParkConfig.json` | 玩法/园区配置 |
| 官方贴图 | `assets/img_*.png`、`assets/cv.png`、`assets/frame_for_*.png` | UI 图标/水印/关闭按钮等 |
| Android 美术资源 | `res/**` (7.5M, 878 份 xml) | 系统/框架 color/values/string 等 |

共计约 **56 MB**（视频占 47 MB），已提交并上传至 GitHub 仓库 `flutter-zcj/zbcx-wgjx-frontend`。

## APK 内全部资源分类统计（逆向溯源，含未提取的加密包）

| 类别 | 数量 | 解压体积 | 是否已纳入 |
|---|---|---|---|
| 图片（png/webp/jpg） | 622 | 1.63 MiB | ✅ 已纳入（`../images/wgjx/`） |
| 视频 mp4 | 12 | 46.58 MiB | ✅ 已纳入 |
| 字幕 srt | 19 | 0.01 MiB | ✅ 已纳入 |
| 音频（ogg，仅系统音效） | 1 | 0.01 MiB | ⚠️ 游戏音频在 .lb 包内 |
| 美术/游戏 XML 配置 | 878 | 1.89 MiB | ✅ 已纳入（res/ + AudioConfig） |
| JSON 配置 | 18 | 0.01 MiB | ✅ 已纳入 |
| **Lilith `.lb` 加密资源包** | ~200 | **~1.7 GiB** | ❌ 加密专有，未纳入 |
| Unity 序列化包 `assets/bin` | 174 | 33.37 MiB | ❌ 不可读，未纳入 |
| 原生库 `.so` | 101 | 254.84 MiB | ❌ 代码，不纳入 |
| Dalvik 代码 `.dex` | 7 | 43.66 MiB | ❌ 代码，不纳入 |

### 被剔除的 `.lb` 加密包（含游戏真实声音/美术/模型，需专用工具解密）

体积 Top（均为 Lilith 专有格式，文件名即内容语义）：

| 文件 | 体积 | 推测内容 |
|---|---|---|
| `auto_share_other.lb` | 104M | 通用分享资源 |
| `ez_data_mesh.lb` | 55M | 3D 网格/模型 |
| `auto_share_citybuild.lb` | 44M | 城建分享资源 |
| `ls.dat` | 41M | 数据表 |
| `auto_share_particle.lb` | 39M | 粒子特效 |
| `gdodlc_hero2.lb` | 36M | 英雄模型2 |
| `troop_unit_hero2.lb` / `troop_unit_hero.lb` | 30M / 29M | 部队单位模型 |
| `map_ez_assets.lb` | 26M | 地图资源 |
| `gdodlc_sound_bgm1/2/3.lb` | 20~25M | **游戏 BGM 音频** |
| `sound_bgm.lb` / `sound_sfx.lb` | 21M / 18M | **背景音乐 / 音效** |
| `gdodlc_sound_hero.lb` / `gdodlc_herovoice_pre*.lb` | 18~30M | **英雄语音** |
| `ui_texture_sprite_iap_merge.lb` | 19M | **UI 精灵贴图** |
| `troop_texture_low.lb` / `troop_mat.lb` / `troop_ez3d.lb` | 17~25M | 部队贴图/材质 |
| `gdodlc_hero2.lb`、`ez_data_tiles.lb` 等 | 若干 | 英雄/地块资源 |

> 结论：APK 内**真实可用的声音与美术**确实存在于上述 `.lb` 包中，但为加密格式。
> 若需将这些 BGM/音效/贴图真正用于本项目，需先用 AssetStudio 等工具配合 Lilith 解密
> 还原为标准音频/图片后再引入。本项目当前已接入的是 **APK 内可直接提取的官方 UI 贴图与视频**。

/**
 * @file 万国觉醒·统帅远征 视觉主题。
 * 配色与图元绘制集中在此处，对应用《游戏资源分析》第 3/4/6 节。
 * 所有图元以 Phaser Graphics 程序化绘制，配色取自万国觉醒鎏金史诗风，
 * 与 static/game/wgjx/ 下提取的官方 UI 资源（img_btnBG、img_ShareWaterMark、启动图标）保持一致。
 *
 * 设计分辨率 1280×720（横屏）。如需换肤只改 COLOR，并同步更新资源分析文档。
 */

/** 逻辑分辨率宽度（横屏） */
export const W = 1280

/** 逻辑分辨率高度（横屏） */
export const H = 720

/** 万国觉醒调色板。命名按语义，不按色值，便于整体换肤。 */
export const COLOR = {
  /** 鎏金（主描边 / 徽章 / 按钮高光） */
  gold: 0xc8a24b,
  /** 深鎏金（文字描边 / 暗部） */
  goldDeep: 0x7a3c0a,
  /** 深棕（木框 / 信息栏底） */
  woodDark: 0x2a1e12,
  /** 木框主色 */
  woodMain: 0x4a3320,
  /** 木框亮部（受光边） */
  woodLight: 0x6e4a28,
  /** 暗红（主城 / 强调） */
  crimson: 0x7a1f1f,
  /** 暗红亮部 */
  crimsonLight: 0xa83232,
  /** 苔绿（战场草地 / 中立） */
  moss: 0x2e4a3a,
  /** 苔绿亮部 */
  mossLight: 0x4f7a5e,
  /** 羊皮纸（战场底纹） */
  parchment: 0xe8d9b5,
  /** 羊皮纸暗部 */
  parchmentDark: 0xc9b890,
  /** 雪白（主文字） */
  snow: 0xf5efe0,
  /** 次要文字 */
  textSub: 0xd9c39a,
  /** 主操作按钮（鎏金渐变起） */
  btnPrimary: 0xd8b25a,
  /** 主操作按钮（鎏金渐变止） */
  btnPrimaryDeep: 0x9a6f1e,
  /** 次操作按钮（苔绿） */
  btnSecondary: 0x3f7a5a,
  /** 次操作按钮（深苔绿） */
  btnSecondaryDeep: 0x244a36,
  /** 拒绝类按钮（灰） */
  btnMuted: 0x6d6657,
  /** 己方部队（金） */
  ally: 0xe8c25a,
  /** 敌方部队（暗红） */
  enemy: 0xb83a2e,
  /** 弓兵（蓝） */
  archer: 0x4f8fc0,
  /** 骑兵（苔绿） */
  cavalry: 0x5aa05a,
  /** 步兵（金） */
  infantry: 0xe8c25a,
  /** 主城耐久底（深红条） */
  hpBack: 0x3a1410,
  /** 主城耐久（亮红） */
  hpFront: 0xd84a3a,
  /** 统帅值（金） */
  rally: 0xffd45e
}

/** 兵种枚举，与游戏逻辑对齐 */
export const UNIT = {
  INFANTRY: 'infantry',
  CAVALRY: 'cavalry',
  ARCHER: 'archer'
}

/**
 * 十六进制色转 CSS 颜色串
 * @param {number} hex 颜色值
 * @returns {string} CSS 颜色
 */
export function css(hex) {
  return '#' + (hex >>> 0).toString(16).padStart(6, '0')
}

/**
 * 按比例提亮或压暗一个颜色
 * @param {number} hex 原始颜色
 * @param {number} ratio 大于 1 提亮，0-1 压暗
 * @returns {number} 结果颜色
 */
export function shade(hex, ratio) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * ratio))
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * ratio))
  const b = Math.min(255, Math.round((hex & 0xff) * ratio))
  return (r << 16) | (g << 8) | b
}

/**
 * 绘制羊皮纸战场底纹（径向渐变 + 边缘描线）
 * @param {Object} scene Phaser 场景
 * @returns {void}
 */
export function drawGround(scene) {
  const g = scene.add.graphics()
  const n = 18
  const cx = W / 2
  const cy = H / 2
  for (let i = n; i >= 1; i -= 1) {
    const t = i / n
    const color = shade(COLOR.parchment, 0.82 + (1 - t) * 0.18)
    g.fillStyle(color, 1)
    g.fillEllipse(cx, cy, W * 0.98 * t, H * 0.92 * t)
  }
  g.lineStyle(3, COLOR.parchmentDark, 0.8)
  g.strokeEllipse(cx, cy, W * 0.96, H * 0.9)
  // 战场路径暗示（从主城到据点区的淡色斜带）
  g.lineStyle(2, COLOR.parchmentDark, 0.35)
  g.lineBetween(W * 0.18, H * 0.8, W * 0.82, H * 0.2)
}

/**
 * 绘制青铜/石质外框，四层描边营造厚度
 * @param {Object} scene Phaser 场景
 * @returns {void}
 */
export function drawStoneFrame(scene) {
  const g = scene.add.graphics()
  g.fillStyle(COLOR.woodDark, 1)
  g.fillRect(0, 0, W, H)
  g.fillStyle(COLOR.woodMain, 1)
  g.fillRect(10, 10, W - 20, H - 20)
  g.fillStyle(COLOR.woodLight, 1)
  g.fillRect(16, 16, W - 32, H - 32)
  g.fillStyle(COLOR.woodMain, 1)
  g.fillRect(22, 22, W - 44, H - 44)
  g.lineStyle(3, COLOR.gold, 0.9)
  g.strokeRect(26, 26, W - 52, H - 52)
  g.lineStyle(1.5, COLOR.goldDeep, 0.6)
  g.strokeRect(30, 30, W - 60, H - 60)
}

/**
 * 绘制己方主城（带耐久条）
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {number} hpRatio 耐久比例 0-1
 * @returns {Object} 容器，含 setHp 方法
 */
export function drawCastle(scene, x, y, hpRatio) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  // 城基
  g.fillStyle(COLOR.woodDark, 1)
  g.fillRoundedRect(-70, -10, 140, 90, 10)
  g.fillStyle(COLOR.crimson, 1)
  g.fillRoundedRect(-60, 0, 120, 80, 8)
  // 城垛
  g.fillStyle(COLOR.crimsonLight, 1)
  for (let i = -2; i <= 2; i += 1) {
    g.fillRect(i * 24 - 9, -34, 18, 28)
  }
  // 门
  g.fillStyle(COLOR.woodDark, 1)
  g.fillRoundedRect(-18, 36, 36, 44, 6)
  g.fillStyle(COLOR.gold, 0.9)
  g.fillRect(-2, 40, 4, 36)
  box.add(g)
  // 鎏金旗
  const flag = scene.add.graphics()
  flag.fillStyle(COLOR.gold, 1)
  flag.fillRect(-2, -78, 4, 46)
  flag.fillStyle(COLOR.crimsonLight, 1)
  flag.fillTriangle(2, -76, 40, -66, 2, -54)
  box.add(flag)
  // 耐久条
  const barW = 150
  const bar = scene.add.graphics()
  const drawBar = (r) => {
    bar.clear()
    bar.fillStyle(COLOR.hpBack, 0.9)
    bar.fillRoundedRect(-barW / 2, -104, barW, 14, 7)
    bar.fillStyle(COLOR.hpFront, 1)
    bar.fillRoundedRect(-barW / 2 + 2, -102, (barW - 4) * Math.max(0, Math.min(1, r)), 10, 5)
    bar.lineStyle(2, COLOR.gold, 0.8)
    bar.strokeRoundedRect(-barW / 2, -104, barW, 14, 7)
  }
  drawBar(hpRatio)
  box.add(bar)
  box.setHp = (r) => drawBar(r)
  return box
}

/**
 * 绘制敌方/己方据点（带耐久与占领态）
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {boolean} captured 是否已占领
 * @param {number} hpRatio 耐久比例 0-1
 * @returns {Object} 容器，含 setHp / setCaptured 方法
 */
export function drawFort(scene, x, y, captured, hpRatio) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  const base = captured ? COLOR.moss : COLOR.crimson
  const light = captured ? COLOR.mossLight : COLOR.crimsonLight
  g.fillStyle(COLOR.woodDark, 1)
  g.fillCircle(0, 0, 40)
  g.fillStyle(base, 1)
  g.fillCircle(0, 0, 32)
  g.fillStyle(light, 1)
  g.fillCircle(0, -6, 22)
  // 城垛环
  g.fillStyle(base, 1)
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI / 4) * i
    g.fillRect(Math.cos(a) * 34 - 5, Math.sin(a) * 34 - 5, 10, 10)
  }
  box.add(g)
  // 耐久条
  const barW = 64
  const bar = scene.add.graphics()
  const drawBar = (r) => {
    bar.clear()
    bar.fillStyle(COLOR.hpBack, 0.9)
    bar.fillRoundedRect(-barW / 2, 44, barW, 9, 4)
    bar.fillStyle(captured ? COLOR.mossLight : COLOR.hpFront, 1)
    bar.fillRoundedRect(-barW / 2 + 1, 45, (barW - 2) * Math.max(0, Math.min(1, r)), 7, 3)
  }
  drawBar(hpRatio)
  box.add(bar)
  box.setHp = (r) => drawBar(r)
  box.setCaptured = (c) => {
    captured = c
    g.clear()
    const b = c ? COLOR.moss : COLOR.crimson
    const l = c ? COLOR.mossLight : COLOR.crimsonLight
    g.fillStyle(COLOR.woodDark, 1)
    g.fillCircle(0, 0, 40)
    g.fillStyle(b, 1)
    g.fillCircle(0, 0, 32)
    g.fillStyle(l, 1)
    g.fillCircle(0, -6, 22)
    g.fillStyle(b, 1)
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI / 4) * i
      g.fillRect(Math.cos(a) * 34 - 5, Math.sin(a) * 34 - 5, 10, 10)
    }
  }
  return box
}

/**
 * 绘制一个部队单位（按兵种区分形状与色）
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {string} type 兵种：infantry/cavalry/archer
 * @param {boolean} isEnemy 是否敌方
 * @returns {Object} 容器
 */
export function drawUnit(scene, x, y, type, isEnemy) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  const col = isEnemy ? COLOR.enemy : COLOR[type] || COLOR.infantry
  g.fillStyle(0x000000, 0.2)
  g.fillEllipse(0, 12, 30, 10)
  g.fillStyle(col, 1)
  if (type === UNIT.CAVALRY) {
    // 骑兵：三角冲锋形
    g.fillTriangle(-14, 10, 14, 10, 0, -16)
  } else if (type === UNIT.ARCHER) {
    // 弓兵：菱形
    g.fillTriangle(0, -16, 14, 0, 0, 16)
    g.fillTriangle(0, -16, -14, 0, 0, 16)
  } else {
    // 步兵：方形盾
    g.fillRoundedRect(-12, -14, 24, 28, 5)
  }
  // 鎏金描边
  g.lineStyle(2, isEnemy ? COLOR.crimsonLight : COLOR.gold, 0.9)
  if (type === UNIT.CAVALRY) {
    g.strokeTriangle(-14, 10, 14, 10, 0, -16)
  } else if (type === UNIT.ARCHER) {
    g.strokeTriangle(0, -16, 14, 0, 0, 16)
    g.strokeTriangle(0, -16, -14, 0, 0, 16)
  } else {
    g.strokeRoundedRect(-12, -14, 24, 28, 5)
  }
  box.add(g)
  return box
}

/**
 * 绘制领袖圆徽（曹操/凯撒等），鎏金边框 + 首字
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {number} radius 半径
 * @param {string} label 首字（如 曹/凯）
 * @returns {Object} 容器
 */
export function drawCommanderBadge(scene, x, y, radius, label) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  g.fillStyle(COLOR.woodDark, 0.5)
  g.fillCircle(0, 3, radius + 2)
  g.fillStyle(COLOR.gold, 1)
  g.fillCircle(0, 0, radius)
  g.fillStyle(COLOR.crimson, 1)
  g.fillCircle(0, 0, radius - 5)
  g.lineStyle(3, COLOR.gold, 1)
  g.strokeCircle(0, 0, radius)
  box.add(g)
  const t = scene.add
    .text(0, 0, label || '曹', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: String(Math.round(radius * 1.1)) + 'px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  t.setShadow(0, 2, css(COLOR.goldDeep), 3)
  box.add(t)
  return box
}

/**
 * 绘制鎏金渐变主按钮，与实机一致
 * @param {Object} scene Phaser 场景
 * @param {Object} opts 配置：x/y/w/h/text/fill/fillDeep/fontSize/radius
 * @returns {Object} 容器，附带 setEnabled / setText 方法
 */
export function drawButton(scene, opts) {
  const { x, y, w, h, text, fontSize } = opts
  const fill = opts.fill === undefined ? COLOR.btnPrimary : opts.fill
  const fillDeep = opts.fillDeep === undefined ? shade(fill, 0.66) : opts.fillDeep
  const radius = opts.radius === undefined ? Math.min(h / 2, 18) : opts.radius
  const box = scene.add.container(x, y)
  // 若已预加载万国觉醒真实按钮底纹，则作为背景铺底（美术与官方保持一致）
  if (scene.textures && scene.textures.exists('rokBtn')) {
    const bg = scene.add.image(0, 0, 'rokBtn')
    bg.setDisplaySize(w, h)
    bg.setAlpha(0.96)
    box.add(bg)
  }
  const g = scene.add.graphics()
  g.fillStyle(COLOR.woodDark, 0.45)
  g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, radius)
  g.fillStyle(fillDeep, 1)
  g.fillRoundedRect(-w / 2, -h / 2, w, h, radius)
  g.fillStyle(fill, 1)
  g.fillRoundedRect(-w / 2, -h / 2, w, h - 5, radius)
  g.fillStyle(0xffffff, 0.3)
  g.fillRoundedRect(-w / 2 + 5, -h / 2 + 4, w - 10, h * 0.34, radius * 0.7)
  g.lineStyle(2, COLOR.snow, 0.7)
  g.strokeRoundedRect(-w / 2, -h / 2, w, h - 5, radius)
  box.add(g)
  const label = scene.add
    .text(0, -2, text, {
      fontFamily: 'sans-serif',
      fontSize: String(fontSize || 28) + 'px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  label.setShadow(0, 2, css(COLOR.goldDeep), 3)
  box.add(label)
  box.setSize(w, h)
  box.label = label
  box.setText = (v) => label.setText(v)
  box.setEnabled = (enabled) => {
    box.setAlpha(enabled ? 1 : 0.5)
    if (enabled) {
      box.setInteractive({ useHandCursor: true })
    } else {
      box.disableInteractive()
    }
  }
  box.setEnabled(true)
  return box
}

/**
 * 绘制顶部 HUD 栏（得分 / 时间 / 统帅值），深棕木条底
 * @param {Object} scene Phaser 场景
 * @returns {Object} 容器，含 setScore / setTime / setRally 方法
 */
export function drawHudBar(scene) {
  const box = scene.add.container(0, 0)
  const g = scene.add.graphics()
  g.fillStyle(COLOR.woodDark, 0.92)
  g.fillRoundedRect(40, 36, W - 80, 56, 12)
  g.lineStyle(2, COLOR.gold, 0.8)
  g.strokeRoundedRect(40, 36, W - 80, 56, 12)
  box.add(g)
  const scoreText = scene.add
    .text(70, 64, '得分 0', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '26px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0, 0.5)
  scoreText.setShadow(0, 2, css(COLOR.goldDeep), 3)
  box.add(scoreText)
  const timeText = scene.add
    .text(W / 2, 64, '60', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '30px',
      color: css(COLOR.gold),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  timeText.setShadow(0, 2, css(COLOR.goldDeep), 3)
  box.add(timeText)
  const rallyText = scene.add
    .text(W - 70, 64, '统帅 0%', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '22px',
      color: css(COLOR.rally),
      fontStyle: 'bold'
    })
    .setOrigin(1, 0.5)
  rallyText.setShadow(0, 2, css(COLOR.goldDeep), 3)
  box.add(rallyText)
  box.setScore = (v) => scoreText.setText('得分 ' + v)
  box.setTime = (v) => timeText.setText(String(v))
  box.setRally = (v) => rallyText.setText('统帅 ' + Math.round(v) + '%')
  return box
}

/**
 * 生成大号描边文字
 * @param {Object} scene Phaser 场景
 * @param {number} x 位置 x
 * @param {number} y 位置 y
 * @param {string} text 文案
 * @param {number} size 字号
 * @param {number} tone 主色
 * @returns {Object} Text 对象
 */
export function makeText(scene, x, y, text, size, tone) {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: String(size || 44) + 'px',
      color: css(tone === undefined ? COLOR.gold : tone),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  t.setStroke(css(COLOR.snow), 5)
  t.setShadow(0, 3, 'rgba(20,10,0,0.5)', 4)
  return t
}

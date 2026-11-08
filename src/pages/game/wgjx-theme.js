/**
 * @file 万国觉醒·统帅远征 v2.0 视觉主题。
 *
 * 美术策略：以程序化绘制的「鎏金史诗 + 世界地图」为骨架，局部叠加 APK 提取到的
 * 官方 UI 贴图（img_btnBG / img_ShareWaterMark / icon），兼顾观感与包体。
 * 配色对应 rea 报告 3.3 节：暗底 + 金色描边 + 蓝/紫/金品质色阶。
 *
 * 设计分辨率 1280×720（横屏），战场安全区 y∈[96, 612]，底部 HUD y∈[616, 706]。
 */

/** 逻辑分辨率宽度 */
export const W = 1280

/** 逻辑分辨率高度 */
export const H = 720

/** 战场顶部（HUD 之下） */
export const FIELD_TOP = 96

/** 战场底部（操作栏之上） */
export const FIELD_BOTTOM = 612

/** 万国觉醒调色板 */
export const COLOR = {
  gold: 0xc8a24b,
  goldDeep: 0x7a3c0a,
  goldBright: 0xffd45e,
  woodDark: 0x1e150c,
  woodMain: 0x3a2a18,
  woodLight: 0x5a4226,
  crimson: 0x7a1f1f,
  crimsonLight: 0xb03a2e,
  grass: 0x2f4432,
  grassLight: 0x3f5c40,
  grassDark: 0x24352a,
  sand: 0xa88f62,
  sandDark: 0x7d6a48,
  water: 0x2b4a5c,
  parchment: 0xe8d9b5,
  parchmentDark: 0xc9b890,
  snow: 0xf5efe0,
  textSub: 0xd9c39a,
  textDim: 0x9a8d75,
  btnPrimary: 0xd8b25a,
  btnPrimaryDeep: 0x9a6f1e,
  btnSecondary: 0x3f7a5a,
  btnSecondaryDeep: 0x244a36,
  btnMuted: 0x5c5648,
  ally: 0xe8c25a,
  enemy: 0xb83a2e,
  infantry: 0xe8c25a,
  cavalry: 0x5aa05a,
  archer: 0x4f8fc0,
  hpBack: 0x2a1210,
  hpFront: 0xd84a3a,
  shield: 0x7fd4c1,
  rally: 0xffd45e,
  blue: 0x4f8fc0,
  purple: 0xa87ad8,
  neutral: 0x8d8577
}

/** 通用字体栈（中英文都不掉字） */
const FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial, sans-serif'
const FONT_BOLD = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", Arial Black, sans-serif'

/** 十六进制色转 CSS */
export function css(hex) {
  return '#' + (hex >>> 0).toString(16).padStart(6, '0')
}

/**
 * 按比例提亮/压暗
 * @param {number} hex 原色
 * @param {number} ratio >1 提亮，<1 压暗
 * @returns {number} 结果色
 */
export function shade(hex, ratio) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * ratio))
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * ratio))
  const b = Math.min(255, Math.round((hex & 0xff) * ratio))
  return (r << 16) | (g << 8) | b
}

/**
 * 生成 ±1 的伪随机（固定种子，保证每次进入战场地形一致）
 * @param {number} seed 种子
 * @returns {Function} 取数函数
 */
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280 * 2 - 1
  }
}

/**
 * 绘制世界地图底：草地、林带、土路、王权大道
 * @param {Object} scene Phaser 场景
 * @returns {void}
 */
export function drawWorldGround(scene) {
  const g = scene.add.graphics()
  g.fillStyle(COLOR.grass, 1)
  g.fillRect(0, 0, W, H)
  // 明暗草块，模拟卫星地形
  const rnd = seeded(97)
  for (let i = 0; i < 90; i += 1) {
    const x = W / 2 + rnd() * W * 0.52
    const y = H / 2 + rnd() * H * 0.5
    const rw = 40 + Math.abs(rnd()) * 130
    const rh = 22 + Math.abs(rnd()) * 70
    const tone = rnd() > 0 ? COLOR.grassLight : COLOR.grassDark
    g.fillStyle(tone, 0.22 + Math.abs(rnd()) * 0.18)
    g.fillEllipse(x, y, rw, rh)
  }
  // 林带：三角树丛
  for (let i = 0; i < 26; i += 1) {
    const x = 60 + Math.abs(rnd()) * (W - 120)
    const y = FIELD_TOP + 10 + Math.abs(rnd()) * 300
    g.fillStyle(0x1c2b1f, 0.85)
    g.fillTriangle(x, y - 16, x - 8, y + 6, x + 8, y + 6)
  }
  // 王权大道（圣物车路线）
  g.fillStyle(COLOR.sandDark, 0.55)
  g.fillRect(250, 136, 800, 78)
  g.fillStyle(COLOR.sand, 0.5)
  g.fillRect(250, 142, 800, 64)
  // 大道虚线
  for (let x = 270; x < 1040; x += 34) {
    g.fillStyle(COLOR.goldBright, 0.18)
    g.fillRect(x, 172, 18, 3)
  }
  // 通往旗帜的小径
  const lanes = [
    [430, 330],
    [640, 450],
    [850, 330]
  ]
  lanes.forEach((p) => {
    g.lineStyle(22, COLOR.sandDark, 0.28)
    g.lineBetween(300, 208, p[0], p[1])
  })
  // 外围压暗（暗角）
  g.fillStyle(0x000000, 0.24)
  g.fillRect(0, 0, W, FIELD_TOP)
  g.fillRect(0, FIELD_BOTTOM, W, H - FIELD_BOTTOM)
  return g
}

/**
 * 绘制战场鎏金外框
 * @param {Object} scene Phaser 场景
 * @returns {void}
 */
export function drawBattleFrame(scene) {
  const g = scene.add.graphics().setDepth(2)
  g.lineStyle(2, COLOR.gold, 0.55)
  g.strokeRect(22, FIELD_TOP - 4, W - 44, FIELD_BOTTOM - FIELD_TOP + 6)
  g.lineStyle(1, COLOR.goldDeep, 0.5)
  g.strokeRect(27, FIELD_TOP + 1, W - 54, FIELD_BOTTOM - FIELD_TOP - 4)
  // 四角纹章
  const corners = [
    [22, FIELD_TOP - 4],
    [W - 22, FIELD_TOP - 4],
    [22, FIELD_BOTTOM + 2],
    [W - 22, FIELD_BOTTOM + 2]
  ]
  corners.forEach((c, i) => {
    const sx = i % 2 === 0 ? 1 : -1
    const sy = i < 2 ? 1 : -1
    g.lineStyle(3, COLOR.gold, 0.85)
    g.lineBetween(c[0], c[1], c[0] + 26 * sx, c[1])
    g.lineBetween(c[0], c[1], c[0], c[1] + 22 * sy)
  })
  return g
}

/**
 * 绘制玩家主城（含耐久与护盾）
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {number} hpRatio 耐久比例
 * @returns {Object} 容器，含 setHp / setShield
 */
export function drawCastle(scene, x, y, hpRatio) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  // 台基
  g.fillStyle(0x000000, 0.28)
  g.fillEllipse(0, 52, 190, 42)
  g.fillStyle(COLOR.woodDark, 1)
  g.fillRoundedRect(-82, 6, 164, 54, 10)
  // 主楼
  g.fillStyle(COLOR.crimson, 1)
  g.fillRoundedRect(-56, -34, 112, 78, 6)
  g.fillStyle(COLOR.crimsonLight, 1)
  g.fillRect(-56, -34, 112, 12)
  // 左右塔
  ;[-1, 1].forEach((s) => {
    g.fillStyle(COLOR.woodDark, 1)
    g.fillRect(s * 62 - 16, -64, 32, 108)
    g.fillStyle(COLOR.crimson, 1)
    g.fillRect(s * 62 - 13, -60, 26, 100)
    g.fillStyle(COLOR.crimsonLight, 1)
    for (let i = 0; i < 3; i += 1) {
      g.fillRect(s * 62 - 13 + i * 10, -70, 6, 12)
    }
  })
  // 城垛
  g.fillStyle(COLOR.crimsonLight, 1)
  for (let i = -2; i <= 2; i += 1) {
    g.fillRect(i * 22 - 7, -48, 14, 16)
  }
  // 门与窗
  g.fillStyle(COLOR.woodDark, 1)
  g.fillRoundedRect(-20, 12, 40, 48, 4)
  g.fillStyle(COLOR.gold, 0.85)
  g.fillRect(-2, 18, 4, 40)
  ;[-1, 1].forEach((s) => {
    g.fillStyle(COLOR.goldBright, 0.9)
    g.fillRect(s * 28 - 5, -18, 10, 16)
  })
  // 旗
  g.fillStyle(COLOR.gold, 1)
  g.fillRect(-2, -108, 4, 50)
  g.fillStyle(COLOR.crimsonLight, 1)
  g.fillTriangle(2, -106, 44, -95, 2, -82)
  box.add(g)

  // 耐久条
  const barW = 150
  const bar = scene.add.graphics()
  const drawBar = (r) => {
    const ratio = Math.max(0, Math.min(1, r))
    bar.clear()
    bar.fillStyle(COLOR.hpBack, 0.92)
    bar.fillRoundedRect(-barW / 2, 66, barW, 14, 7)
    bar.fillStyle(COLOR.hpFront, 1)
    bar.fillRoundedRect(-barW / 2 + 2, 68, (barW - 4) * ratio, 10, 5)
    bar.lineStyle(2, COLOR.gold, 0.85)
    bar.strokeRoundedRect(-barW / 2, 66, barW, 14, 7)
  }
  drawBar(hpRatio)
  box.add(bar)
  // 护盾环
  const shield = scene.add.graphics().setVisible(false)
  shield.lineStyle(4, COLOR.shield, 0.9)
  shield.strokeCircle(0, 0, 104)
  shield.lineStyle(2, COLOR.shield, 0.35)
  shield.strokeCircle(0, 0, 114)
  box.add(shield)

  box.setHp = (r) => drawBar(r)
  box.setShield = (on) => shield.setVisible(!!on)
  return box
}

/**
 * 绘制敌方要塞
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @returns {Object} 容器，含 setHp
 */
export function drawEnemyKeep(scene, x, y) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.3)
  g.fillEllipse(0, 44, 150, 34)
  g.fillStyle(0x241a24, 1)
  g.fillRoundedRect(-64, -10, 128, 56, 8)
  g.fillStyle(0x3b2a3a, 1)
  g.fillRoundedRect(-40, -52, 80, 96, 5)
  ;[-1, 1].forEach((s) => {
    g.fillStyle(0x241a24, 1)
    g.fillRect(s * 54 - 14, -78, 28, 92)
    g.fillStyle(0x4a3550, 1)
    g.fillRect(s * 54 - 11, -74, 22, 84)
  })
  g.fillStyle(0x1a1119, 1)
  g.fillRoundedRect(-16, 8, 32, 40, 3)
  g.fillStyle(COLOR.enemy, 0.9)
  g.fillTriangle(-42, -56, -42, -30, -16, -43)
  g.fillTriangle(42, -56, 42, -30, 16, -43)
  box.add(g)
  const label = scene.add
    .text(0, -96, '敌方要塞', {
      fontFamily: FONT,
      fontSize: '16px',
      color: css(COLOR.enemy),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  box.add(label)
  const barW = 120
  const bar = scene.add.graphics()
  const drawBar = (r) => {
    const ratio = Math.max(0, Math.min(1, r))
    bar.clear()
    bar.fillStyle(COLOR.hpBack, 0.9)
    bar.fillRoundedRect(-barW / 2, -88, barW, 9, 4)
    bar.fillStyle(COLOR.enemy, 1)
    bar.fillRoundedRect(-barW / 2 + 1, -87, (barW - 2) * ratio, 7, 3)
  }
  drawBar(1)
  box.add(bar)
  box.setHp = (r) => drawBar(r)
  return box
}

/**
 * 绘制旗帜据点
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {string} name 旗帜名（A/B/C）
 * @returns {Object} 容器，含 setOwner / setHp
 */
export function drawFlag(scene, x, y, name) {
  const box = scene.add.container(x, y)
  const base = scene.add.graphics()
  const flag = scene.add.graphics()
  let owner = 'neutral'
  const palette = () => {
    if (owner === 'player') {
      return { main: 0x3f7a5a, light: 0x6fb98a }
    }
    if (owner === 'enemy') {
      return { main: COLOR.crimson, light: COLOR.crimsonLight }
    }
    return { main: COLOR.neutral, light: 0xb5ac9a }
  }
  const drawBase = () => {
    const p = palette()
    base.clear()
    base.fillStyle(0x000000, 0.3)
    base.fillEllipse(0, 30, 92, 28)
    base.fillStyle(COLOR.woodDark, 1)
    base.fillCircle(0, 16, 34)
    base.fillStyle(p.main, 0.9)
    base.fillCircle(0, 16, 27)
    base.lineStyle(3, owner === 'neutral' ? COLOR.gold : p.light, 0.9)
    base.strokeCircle(0, 16, 34)
    // 城垛环
    base.fillStyle(p.light, 1)
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI / 4) * i
      base.fillRect(Math.cos(a) * 40 - 4, Math.sin(a) * 40 + 12, 8, 8)
    }
  }
  const drawFlagPole = () => {
    const p = palette()
    flag.clear()
    flag.fillStyle(COLOR.gold, 1)
    flag.fillRect(-2, -62, 4, 62)
    flag.fillStyle(p.main, 1)
    flag.fillTriangle(2, -60, 40, -50, 2, -36)
    flag.lineStyle(1, p.light, 0.9)
    flag.strokeTriangle(2, -60, 40, -50, 2, -36)
    flag.fillStyle(COLOR.goldBright, 0.95)
    flag.fillCircle(0, -64, 4)
  }
  drawBase()
  drawFlagPole()
  box.add(base)
  box.add(flag)
  const label = scene.add
    .text(0, 16, name, {
      fontFamily: FONT_BOLD,
      fontSize: '20px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  box.add(label)

  const barW = 74
  const bar = scene.add.graphics()
  const drawBar = (r) => {
    const ratio = Math.max(0, Math.min(1, r))
    const p = palette()
    bar.clear()
    bar.fillStyle(COLOR.hpBack, 0.9)
    bar.fillRoundedRect(-barW / 2, 50, barW, 9, 4)
    bar.fillStyle(p.main, 1)
    bar.fillRoundedRect(-barW / 2 + 1, 51, (barW - 2) * ratio, 7, 3)
  }
  drawBar(1)
  box.add(bar)

  box.setOwner = (next) => {
    owner = next
    drawBase()
    drawFlagPole()
  }
  box.setHp = (r) => drawBar(r)
  box.owner = () => owner
  return box
}

/**
 * 绘制圣物车
 * @param {Object} scene Phaser 场景
 * @returns {Object} 容器，含 setControlled
 */
export function drawHolyCart(scene) {
  const box = scene.add.container(0, 0)
  const aura = scene.add.graphics()
  const g = scene.add.graphics()
  // 车身
  g.fillStyle(0x000000, 0.3)
  g.fillEllipse(0, 22, 74, 18)
  g.fillStyle(COLOR.woodMain, 1)
  g.fillRoundedRect(-30, -12, 60, 30, 5)
  g.fillStyle(COLOR.gold, 0.9)
  g.fillRect(-30, -12, 60, 4)
  // 圣物
  g.fillStyle(COLOR.goldBright, 1)
  g.fillCircle(0, -20, 11)
  g.fillStyle(0xffffff, 0.85)
  g.fillCircle(-3, -23, 4)
  g.lineStyle(2, COLOR.goldDeep, 0.9)
  g.strokeCircle(0, -20, 11)
  // 车轮
  ;[-18, 18].forEach((wx) => {
    g.fillStyle(COLOR.woodDark, 1)
    g.fillCircle(wx, 20, 10)
    g.fillStyle(COLOR.gold, 0.85)
    g.fillCircle(wx, 20, 4)
  })
  // 车辕
  g.lineStyle(3, COLOR.woodLight, 1)
  g.lineBetween(30, 0, 48, -6)
  box.add(aura)
  box.add(g)
  const label = scene.add
    .text(0, -46, '圣物车', {
      fontFamily: FONT,
      fontSize: '15px',
      color: css(COLOR.goldBright),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  box.add(label)

  box.setControlled = (side) => {
    aura.clear()
    if (!side || side === 'none') {
      return
    }
    const col = side === 'player' ? 0x6fb98a : COLOR.enemy
    aura.fillStyle(col, 0.16)
    aura.fillCircle(0, -4, 52)
    aura.lineStyle(2, col, 0.7)
    aura.strokeCircle(0, -4, 48)
  }
  return box
}

/**
 * 绘制圣坛（圣物车终点）
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @returns {Object} 容器
 */
export function drawShrine(scene, x, y) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.28)
  g.fillEllipse(0, 30, 110, 26)
  g.fillStyle(COLOR.woodDark, 1)
  g.fillRoundedRect(-40, 2, 80, 28, 4)
  g.fillStyle(COLOR.gold, 0.8)
  g.fillRoundedRect(-34, 6, 68, 8, 3)
  ;[-1, 1].forEach((s) => {
    g.fillStyle(COLOR.gold, 0.9)
    g.fillRect(s * 34 - 5, -44, 10, 52)
  })
  g.fillStyle(COLOR.goldBright, 0.95)
  g.fillTriangle(-38, -44, 38, -44, 0, -74)
  g.fillStyle(0x2b4a5c, 0.6)
  g.fillCircle(0, -30, 12)
  box.add(g)
  const label = scene.add
    .text(0, 48, '王权圣坛', {
      fontFamily: FONT,
      fontSize: '15px',
      color: css(COLOR.goldBright)
    })
    .setOrigin(0.5)
  box.add(label)
  const glow = scene.add.graphics()
  glow.fillStyle(COLOR.goldBright, 0.1)
  glow.fillCircle(0, -24, 46)
  box.addAt(glow, 0)
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.35, to: 0.9 },
    duration: 1400,
    yoyo: true,
    repeat: -1
  })
  return box
}

/**
 * 绘制野蛮人营地
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @returns {Object} 容器，含 setHp / setLevel
 */
export function drawBarbarianCamp(scene, x, y) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.3)
  g.fillEllipse(0, 26, 96, 24)
  // 帐篷
  g.fillStyle(0x5a4a32, 1)
  g.fillTriangle(-44, 24, 44, 24, 0, -34)
  g.fillStyle(0x6f5c3e, 1)
  g.fillTriangle(-30, 24, 30, 24, 0, -22)
  g.fillStyle(0x2b2118, 1)
  g.fillTriangle(-10, 24, 10, 24, 0, 2)
  // 篝火
  g.fillStyle(0xd8702a, 0.95)
  g.fillCircle(52, 18, 9)
  g.fillStyle(0xffd45e, 0.95)
  g.fillCircle(52, 15, 5)
  // 骨旗
  g.lineStyle(3, 0xd8d0c0, 0.9)
  g.lineBetween(-52, 20, -52, -40)
  g.fillStyle(0x8a2f2f, 0.95)
  g.fillTriangle(-52, -38, -24, -30, -52, -20)
  box.add(g)
  const name = scene.add
    .text(0, -58, '野蛮人营地', {
      fontFamily: FONT,
      fontSize: '15px',
      color: css(0xd8a06a),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  box.add(name)
  const lv = scene.add
    .text(0, 40, 'Lv.1', {
      fontFamily: FONT,
      fontSize: '14px',
      color: css(COLOR.textSub)
    })
    .setOrigin(0.5)
  box.add(lv)
  const barW = 82
  const bar = scene.add.graphics()
  const drawBar = (r) => {
    const ratio = Math.max(0, Math.min(1, r))
    bar.clear()
    bar.fillStyle(COLOR.hpBack, 0.9)
    bar.fillRoundedRect(-barW / 2, 28, barW, 8, 4)
    bar.fillStyle(0xd8702a, 1)
    bar.fillRoundedRect(-barW / 2 + 1, 29, (barW - 2) * ratio, 6, 3)
  }
  drawBar(1)
  box.add(bar)
  box.setHp = (r) => drawBar(r)
  box.setLevel = (n) => lv.setText('Lv.' + n)
  return box
}

/**
 * 绘制部队单位
 * @param {Object} scene Phaser 场景
 * @param {string} type 兵种
 * @param {boolean} isEnemy 是否敌方
 * @returns {Object} 容器，含 setHp
 */
export function drawUnit(scene, type, isEnemy) {
  const box = scene.add.container(0, 0)
  const g = scene.add.graphics()
  const col = isEnemy ? COLOR.enemy : COLOR[type] || COLOR.infantry
  g.fillStyle(0x000000, 0.25)
  g.fillEllipse(0, 12, 26, 9)
  g.fillStyle(col, 1)
  if (type === 'cavalry') {
    g.fillTriangle(-13, 9, 13, 9, 0, -15)
  } else if (type === 'archer') {
    g.fillTriangle(0, -15, 12, 0, 0, 15)
    g.fillTriangle(0, -15, -12, 0, 0, 15)
  } else {
    g.fillRoundedRect(-11, -13, 22, 26, 5)
  }
  g.lineStyle(2, isEnemy ? COLOR.crimsonLight : COLOR.gold, 0.95)
  if (type === 'cavalry') {
    g.strokeTriangle(-13, 9, 13, 9, 0, -15)
  } else if (type === 'archer') {
    g.strokeTriangle(0, -15, 12, 0, 0, 15)
    g.strokeTriangle(0, -15, -12, 0, 0, 15)
  } else {
    g.strokeRoundedRect(-11, -13, 22, 26, 5)
  }
  // 兵种小标记
  g.fillStyle(isEnemy ? 0xffe0d0 : 0x1e150c, 0.9)
  if (type === 'cavalry') {
    g.fillTriangle(-4, 2, 4, 2, 0, -6)
  } else if (type === 'archer') {
    g.fillRect(-1.5, -6, 3, 12)
  } else {
    g.fillRect(-4, -3, 8, 7)
  }
  box.add(g)
  const bar = scene.add.graphics()
  const drawBar = (r) => {
    const ratio = Math.max(0, Math.min(1, r))
    bar.clear()
    bar.fillStyle(COLOR.hpBack, 0.85)
    bar.fillRect(-11, -22, 22, 4)
    bar.fillStyle(isEnemy ? COLOR.enemy : 0x6fb98a, 1)
    bar.fillRect(-11, -22, 22 * ratio, 4)
  }
  drawBar(1)
  box.add(bar)
  box.setHp = (r) => drawBar(r)
  box.unitType = type
  box.isEnemy = !!isEnemy
  return box
}

/**
 * 绘制资源条（粮/木/石/金/宝石）
 * @param {Object} scene Phaser 场景
 * @param {number} right 右边界 x
 * @param {number} y 中心 y
 * @returns {Object} 容器，含 setValues
 */
export function drawResourceBar(scene, right, y) {
  const box = scene.add.container(0, 0)
  const defs = [
    { key: 'food', label: '粮', color: 0xd8a04a },
    { key: 'wood', label: '木', color: 0x8a6a3a },
    { key: 'stone', label: '石', color: 0x9a9a9a },
    { key: 'gold', label: '金', color: 0xffd45e },
    { key: 'gem', label: '宝石', color: 0xd45ee0 }
  ]
  const chipW = 78
  const gap = 6
  const total = defs.length * chipW + (defs.length - 1) * gap
  const startX = right - total
  const texts = {}
  defs.forEach((d, i) => {
    const x = startX + i * (chipW + gap)
    const g = scene.add.graphics()
    g.fillStyle(COLOR.woodDark, 0.88)
    g.fillRoundedRect(x, y - 15, chipW, 30, 8)
    g.lineStyle(1, COLOR.gold, 0.45)
    g.strokeRoundedRect(x, y - 15, chipW, 30, 8)
    g.fillStyle(d.color, 1)
    g.fillRoundedRect(x + 6, y - 8, 14, 16, 3)
    box.add(g)
    const label = scene.add
      .text(x + 25, y - 7, d.label, {
        fontFamily: FONT,
        fontSize: '11px',
        color: css(COLOR.textDim)
      })
      .setOrigin(0, 0)
    box.add(label)
    const val = scene.add
      .text(x + 25, y + 5, '0', {
        fontFamily: FONT_BOLD,
        fontSize: '14px',
        color: css(COLOR.snow),
        fontStyle: 'bold'
      })
      .setOrigin(0, 0)
    box.add(val)
    texts[d.key] = val
  })
  box.setValues = (res) => {
    defs.forEach((d) => {
      const v = res && res[d.key] !== undefined ? res[d.key] : 0
      texts[d.key].setText(String(Math.floor(v)))
    })
  }
  return box
}

/**
 * 绘制时代徽章
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @returns {Object} 容器，含 setAge
 */
export function drawAgeBadge(scene, x, y) {
  const box = scene.add.container(x, y)
  const g = scene.add.graphics()
  g.fillStyle(COLOR.woodDark, 0.9)
  g.fillCircle(0, 0, 30)
  g.fillStyle(COLOR.gold, 1)
  g.fillCircle(0, 0, 26)
  g.fillStyle(COLOR.woodMain, 1)
  g.fillCircle(0, 0, 22)
  g.lineStyle(2, COLOR.goldBright, 0.9)
  g.strokeCircle(0, 0, 30)
  box.add(g)
  const roman = scene.add
    .text(0, -1, 'V', {
      fontFamily: FONT_BOLD,
      fontSize: '20px',
      color: css(COLOR.goldBright),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  box.add(roman)
  box.setAge = (age) => {
    roman.setText(age.roman)
  }
  return box
}

/**
 * 绘制顶部圣物车进度条
 * @param {Object} scene Phaser 场景
 * @param {number} x 左边界
 * @param {number} y 中心 y
 * @param {number} w 宽度
 * @returns {Object} 容器，含 setProgress / setControl
 */
export function drawCartBar(scene, x, y, w) {
  const box = scene.add.container(0, 0)
  const back = scene.add.graphics()
  back.fillStyle(COLOR.woodDark, 0.92)
  back.fillRoundedRect(x - 4, y - 13, w + 8, 26, 13)
  back.lineStyle(1, COLOR.gold, 0.6)
  back.strokeRoundedRect(x - 4, y - 13, w + 8, 26, 13)
  box.add(back)
  const fill = scene.add.graphics()
  const marker = scene.add.graphics()
  const tip = scene.add
    .text(x + w - 6, y - 26, '王权圣坛', {
      fontFamily: FONT,
      fontSize: '12px',
      color: css(COLOR.goldBright)
    })
    .setOrigin(1, 0.5)
  box.add(tip)
  const title = scene.add
    .text(x - 6, y - 26, '圣物车', {
      fontFamily: FONT,
      fontSize: '12px',
      color: css(COLOR.textSub)
    })
    .setOrigin(0, 0.5)
  box.add(title)
  let progress = 0
  let control = 'none'
  const redraw = () => {
    const col = control === 'player' ? 0x6fb98a : control === 'enemy' ? COLOR.enemy : COLOR.gold
    fill.clear()
    fill.fillStyle(0x000000, 0.5)
    fill.fillRoundedRect(x, y - 6, w, 12, 6)
    fill.fillStyle(col, 0.9)
    fill.fillRoundedRect(x, y - 6, Math.max(4, w * Math.max(0, Math.min(1, progress))), 12, 6)
    marker.clear()
    const mx = x + w * Math.max(0, Math.min(1, progress))
    marker.fillStyle(COLOR.goldBright, 1)
    marker.fillCircle(mx, y, 7)
    marker.fillStyle(COLOR.woodDark, 1)
    marker.fillCircle(mx, y, 3)
  }
  redraw()
  box.add(fill)
  box.add(marker)
  box.setProgress = (p, c) => {
    progress = p
    if (c) {
      control = c
    }
    redraw()
  }
  box.setControl = (c) => {
    control = c || 'none'
    redraw()
  }
  return box
}

/**
 * 绘制统帅技能按钮
 * @param {Object} scene Phaser 场景
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {number} r 半径
 * @param {string} glyph 图标字（兵/盾/火）
 * @param {string} name 技能名
 * @returns {Object} 容器，含 setCooldown / setEnabled
 */
export function drawSkillButton(scene, x, y, r, glyph, name) {
  const box = scene.add.container(x, y)
  const ring = scene.add.graphics()
  ring.fillStyle(COLOR.woodDark, 0.92)
  ring.fillCircle(0, 0, r)
  ring.fillStyle(COLOR.crimson, 0.9)
  ring.fillCircle(0, 0, r - 6)
  ring.lineStyle(3, COLOR.goldBright, 0.9)
  ring.strokeCircle(0, 0, r)
  ring.lineStyle(1, COLOR.goldDeep, 0.9)
  ring.strokeCircle(0, 0, r - 6)
  box.add(ring)
  const icon = scene.add
    .text(0, -2, glyph, {
      fontFamily: FONT_BOLD,
      fontSize: String(Math.round(r * 0.95)) + 'px',
      color: css(COLOR.goldBright),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  icon.setShadow(0, 2, '#3a1a00', 4)
  box.add(icon)
  const cd = scene.add.graphics()
  box.add(cd)
  const cdText = scene.add
    .text(0, 0, '', {
      fontFamily: FONT_BOLD,
      fontSize: '20px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  box.add(cdText)
  const nameText = scene.add
    .text(-r - 12, 0, name, {
      fontFamily: FONT,
      fontSize: '13px',
      color: css(COLOR.textSub)
    })
    .setOrigin(1, 0.5)
  box.add(nameText)

  let enabled = true
  box.setSize(r * 2, r * 2)
  box.setCooldown = (ratio, seconds) => {
    cd.clear()
    if (ratio > 0) {
      cd.fillStyle(0x000000, 0.62)
      cd.slice(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ratio), false)
      cd.fillPath()
      cdText.setText(seconds > 0 ? String(Math.ceil(seconds)) : '')
    } else {
      cdText.setText('')
    }
  }
  box.setEnabled = (on) => {
    enabled = on
    box.setAlpha(on ? 1 : 0.65)
    if (on) {
      box.setInteractive({ useHandCursor: true })
    } else {
      box.disableInteractive()
    }
  }
  box.isEnabled = () => enabled
  box.setEnabled(true)
  return box
}

/**
 * 绘制鎏金按钮（优先使用 APK 提取的官方按钮底纹）
 * @param {Object} scene Phaser 场景
 * @param {Object} opts x/y/w/h/text/fill/fontSize/radius
 * @returns {Object} 容器，含 setEnabled / setText
 */
export function drawButton(scene, opts) {
  const { x, y, w, h, text, fontSize } = opts
  const fill = opts.fill === undefined ? COLOR.btnPrimary : opts.fill
  const fillDeep = opts.fillDeep === undefined ? shade(fill, 0.62) : opts.fillDeep
  const radius = opts.radius === undefined ? Math.min(h / 2, 16) : opts.radius
  const box = scene.add.container(x, y)
  if (scene.textures && scene.textures.exists('rokBtn')) {
    const bg = scene.add.image(0, 0, 'rokBtn').setDisplaySize(w, h).setAlpha(0.92)
    box.add(bg)
  }
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.35)
  g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, radius)
  g.fillStyle(fillDeep, 1)
  g.fillRoundedRect(-w / 2, -h / 2, w, h, radius)
  g.fillStyle(fill, 1)
  g.fillRoundedRect(-w / 2, -h / 2, w, h - 5, radius)
  g.fillStyle(0xffffff, 0.22)
  g.fillRoundedRect(-w / 2 + 5, -h / 2 + 4, w - 10, h * 0.3, radius * 0.6)
  g.lineStyle(2, COLOR.snow, 0.6)
  g.strokeRoundedRect(-w / 2, -h / 2, w, h - 5, radius)
  box.add(g)
  const label = scene.add
    .text(0, -2, text, {
      fontFamily: FONT_BOLD,
      fontSize: String(fontSize || 26) + 'px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  label.setShadow(0, 2, css(COLOR.goldDeep), 4)
  box.add(label)
  box.setSize(w, h)
  box.label = label
  box.setText = (v) => label.setText(v)
  box.setEnabled = (enabled) => {
    box.setAlpha(enabled ? 1 : 0.45)
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
 * 绘制文明选择卡
 * @param {Object} scene Phaser 场景
 * @param {Object} civ 文明数据
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {number} w 宽
 * @param {number} h 高
 * @returns {Object} 容器，含 setSelected
 */
export function drawCivCard(scene, civ, x, y, w, h) {
  const box = scene.add.container(x, y)
  const bg = scene.add.graphics()
  const glow = scene.add.graphics()
  const draw = (selected) => {
    bg.clear()
    bg.fillStyle(COLOR.woodDark, 0.94)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12)
    bg.fillStyle(selected ? shade(civ.color, 1.35) : civ.color, selected ? 0.55 : 0.3)
    bg.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, 46, 10)
    bg.lineStyle(selected ? 3 : 1.5, selected ? COLOR.goldBright : COLOR.gold, selected ? 1 : 0.5)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12)
  }
  draw(false)
  box.add(glow)
  box.add(bg)
  // 纹章放在标题条左侧，避免与加成文字重叠
  const badge = scene.add.graphics()
  badge.fillStyle(COLOR.woodDark, 0.85)
  badge.fillCircle(-w / 2 + 26, -h / 2 + 23, 15)
  badge.lineStyle(1.5, COLOR.goldBright, 0.9)
  badge.strokeCircle(-w / 2 + 26, -h / 2 + 23, 15)
  box.add(badge)
  const emblem = scene.add
    .text(-w / 2 + 26, -h / 2 + 23, civ.emblem, {
      fontFamily: FONT_BOLD,
      fontSize: '17px',
      color: css(COLOR.goldBright),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  box.add(emblem)
  const title = scene.add
    .text(-w / 2 + 48, -h / 2 + 23, civ.name, {
      fontFamily: FONT_BOLD,
      fontSize: '19px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0, 0.5)
  box.add(title)
  const sub = scene.add
    .text(0, -h / 2 + 43, civ.title, {
      fontFamily: FONT,
      fontSize: '11px',
      color: css(COLOR.textSub)
    })
    .setOrigin(0.5)
  box.add(sub)
  const desc = scene.add
    .text(0, 24, civ.desc, {
      fontFamily: FONT,
      fontSize: '13px',
      color: css(0xdfd0ae),
      align: 'center',
      wordWrap: { width: w - 24 }
    })
    .setOrigin(0.5)
  box.add(desc)
  box.setSelected = (selected) => {
    draw(selected)
    box.setScale(selected ? 1.04 : 1)
    glow.clear()
    if (selected) {
      glow.fillStyle(COLOR.goldBright, 0.12)
      glow.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 14)
    }
  }
  box.setSize(w, h)
  box.setSelected(false)
  return box
}

/**
 * 绘制统帅选择卡
 * @param {Object} scene Phaser 场景
 * @param {Object} cmd 统帅数据
 * @param {number} x 中心 x
 * @param {number} y 中心 y
 * @param {number} w 宽
 * @param {number} h 高
 * @returns {Object} 容器，含 setSelected
 */
export function drawCommanderCard(scene, cmd, x, y, w, h) {
  const box = scene.add.container(x, y)
  const bg = scene.add.graphics()
  const draw = (selected) => {
    bg.clear()
    bg.fillStyle(COLOR.woodDark, 0.94)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10)
    bg.fillStyle(cmd.color, selected ? 0.62 : 0.3)
    bg.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 8)
    bg.lineStyle(selected ? 3 : 1.5, selected ? COLOR.goldBright : COLOR.gold, selected ? 1 : 0.4)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10)
  }
  draw(false)
  box.add(bg)
  const badge = scene.add.graphics()
  badge.fillStyle(COLOR.woodDark, 1)
  badge.fillCircle(-w / 2 + 34, 0, 24)
  badge.fillStyle(COLOR.gold, 1)
  badge.fillCircle(-w / 2 + 34, 0, 21)
  badge.fillStyle(cmd.color, 1)
  badge.fillCircle(-w / 2 + 34, 0, 17)
  box.add(badge)
  const emblem = scene.add
    .text(-w / 2 + 34, 0, cmd.emblem, {
      fontFamily: FONT_BOLD,
      fontSize: '20px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  box.add(emblem)
  const name = scene.add
    .text(-w / 2 + 64, -18, cmd.name, {
      fontFamily: FONT_BOLD,
      fontSize: '18px',
      color: css(COLOR.snow),
      fontStyle: 'bold'
    })
    .setOrigin(0, 0.5)
  box.add(name)
  const skill = scene.add
    .text(-w / 2 + 64, 4, cmd.skill.name, {
      fontFamily: FONT,
      fontSize: '13px',
      color: css(COLOR.goldBright)
    })
    .setOrigin(0, 0.5)
  box.add(skill)
  const passive = scene.add
    .text(-w / 2 + 64, 26, cmd.passiveText, {
      fontFamily: FONT,
      fontSize: '11px',
      color: css(COLOR.textDim)
    })
    .setOrigin(0, 0.5)
  box.add(passive)
  box.setSelected = (selected) => {
    draw(selected)
    box.setScale(selected ? 1.03 : 1)
  }
  box.setSize(w, h)
  box.setSelected(false)
  return box
}

/**
 * 绘制结算品质光柱
 * @param {Object} scene Phaser 场景
 * @param {number} color 品质色
 * @returns {void}
 */
export function drawResultRays(scene, color) {
  const g = scene.add.graphics().setDepth(1)
  const cx = W / 2
  const cy = 210
  for (let i = 0; i < 14; i += 1) {
    const a = (Math.PI * 2 * i) / 14
    g.fillStyle(color, 0.09)
    g.fillTriangle(
      cx,
      cy,
      cx + Math.cos(a - 0.06) * 900,
      cy + Math.sin(a - 0.06) * 900,
      cx + Math.cos(a + 0.06) * 900,
      cy + Math.sin(a + 0.06) * 900
    )
  }
  scene.tweens.add({
    targets: g,
    alpha: { from: 0.45, to: 1 },
    duration: 1800,
    yoyo: true,
    repeat: -1
  })
  return g
}

/**
 * 生成描边文字
 * @param {Object} scene Phaser 场景
 * @param {number} x x
 * @param {number} y y
 * @param {string} text 文案
 * @param {number} size 字号
 * @param {number} tone 颜色
 * @returns {Object} Text
 */
export function makeText(scene, x, y, text, size, tone) {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: FONT_BOLD,
      fontSize: String(size || 40) + 'px',
      color: css(tone === undefined ? COLOR.gold : tone),
      fontStyle: 'bold'
    })
    .setOrigin(0.5)
  t.setStroke(css(0x1a1006), 5)
  t.setShadow(0, 3, 'rgba(0,0,0,0.45)', 4)
  return t
}

/**
 * 生成正文文字（无描边，用于说明）
 * @param {Object} scene Phaser 场景
 * @param {number} x x
 * @param {number} y y
 * @param {string} text 文案
 * @param {number} size 字号
 * @param {number} tone 颜色
 * @param {string} align 对齐
 * @returns {Object} Text
 */
export function makeBody(scene, x, y, text, size, tone, align) {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontSize: String(size || 16) + 'px',
      color: css(tone === undefined ? COLOR.textSub : tone),
      align: align || 'center',
      wordWrap: { width: 760 }
    })
    .setOrigin(0.5)
}

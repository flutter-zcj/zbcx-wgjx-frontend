/**
 * @file 万国觉醒·统帅远征 v2.0 —— Phaser 3 场景。
 *
 * 玩法依据 rea 证据重构（wgjx-analysis/game-rule-ui）：
 *   核心循环：驻扎（主城/时代）→ 探索（王权大道）→ 捕猎（野蛮人营地）
 *            → 彼此保护（旗帜/护送）→ 争霸（圣物车 5v5 占点）
 *
 * 单局规则：
 *   · 90 秒；目标分 1200，或击破敌方要塞 / 圣物车抵达圣坛直接获胜
 *   · 三面旗帜：派兵打空耐久即占领，占领后持续产分并加速圣物车
 *   · 圣物车：己方部队靠近即「控制」，控制时推进并产分，抵达圣坛 +300
 *   · 野蛮人营地：派兵讨伐得资源与统帅值，击破后升级重生
 *   · 兵种相克（步→弓→骑→步），统帅主动技能 + 集结，得分推动时代进阶
 *
 * hooks 契约（Vue 页面注入，解耦音频/网络/生命周期）：
 *   onReady(scene) / onStart() / onSend() / onFlag() / onCart() / onSkill()
 *   onRally() / onHit() / onScore() / onAge() / onWin() / onLose() / onTick()
 *   onHud(state) / onGameOver(payload) / onSaveProfile(profile) / onAction(key)
 */

import {
  W,
  H,
  FIELD_TOP,
  FIELD_BOTTOM,
  COLOR,
  drawWorldGround,
  drawBattleFrame,
  drawCastle,
  drawEnemyKeep,
  drawFlag,
  drawHolyCart,
  drawShrine,
  drawBarbarianCamp,
  drawUnit,
  drawResourceBar,
  drawAgeBadge,
  drawCartBar,
  drawSkillButton,
  drawButton,
  drawCivCard,
  drawCommanderCard,
  drawResultRays,
  makeText,
  makeBody,
  css,
  shade
} from './wgjx-theme.js'

import {
  MATCH_TIME,
  CASTLE_HP,
  FLAG_HP,
  CAMP_HP,
  TARGET_SCORE,
  CART_REWARD,
  CART_SPEED,
  CART_RANGE,
  ESCORT_RANGE,
  RESOURCE,
  TROOPS,
  TROOP_ORDER,
  counterRate,
  CIVS,
  COMMANDERS,
  AGES,
  ageOf,
  ageProgress,
  qualityOf,
  defaultProfile,
  civOf,
  commanderOf,
  mergeBonus
} from './wgjx-rules.js'

/** 战场固定布局（1280×720，安全区 y∈[96,612]） */
const LAYOUT = {
  castle: { x: 158, y: 512 },
  keep: { x: 1120, y: 366 },
  shrine: { x: 1058, y: 166 },
  cartStart: { x: 300, y: 166 },
  cartEnd: { x: 992, y: 166 },
  camp: { x: 992, y: 540 },
  flags: [
    { key: 'A', x: 420, y: 330 },
    { key: 'B', x: 640, y: 452 },
    { key: 'C', x: 858, y: 330 }
  ]
}

/** 兵种按钮/单位配色取自主题 */
const CAMP_REWARD = { food: 60, wood: 30, stone: 20, gold: 25, gem: 1 }

export default function createWgjxScene(Phaser, hooks) {
  return class WgjxScene extends Phaser.Scene {
    constructor() {
      super({ key: 'WgjxScene' })
    }

    /** 预加载官方按钮底纹（缺失时按钮自动回退矢量绘制） */
    preload() {
      const url = '/static/images/wgjx/apk/assets/img_btnBG.png'
      if (this.load && this.textures && !this.textures.exists('rokBtn')) {
        this.load.image('rokBtn', url)
      }
    }

    create() {
      this.screen = 'select'
      this.profile = Object.assign(defaultProfile(), hooks.profile || {})
      this.selectedCiv = this.profile.civilization || 'china'
      this.selectedCmd = this.profile.commander || 'sun'
      this.alive = false
      this.units = []
      this.effects = []
      this.speedBuffUntil = 0
      this.damageBuffUntil = 0
      this.shieldUntil = 0
      this.fireUntil = 0
      this.skillReadyAt = 0
      this.skillCdTotal = 1
      this.tipsTimer = 0
      this.hudTimer = 0

      this.buildBackdrop()
      this.buildSelect()
      if (hooks.onReady) {
        hooks.onReady(this)
      }
    }

    // ---------------------------------------------------------------------
    // 选择界面
    // ---------------------------------------------------------------------

    /** 选择界面背景（鎏金暗底 + 世界地图虚影） */
    buildBackdrop() {
      this.backdrop = this.add.container(0, 0).setDepth(0)
      const bg = this.add.graphics()
      bg.fillStyle(COLOR.woodDark, 1)
      bg.fillRect(0, 0, W, H)
      bg.fillStyle(COLOR.woodMain, 0.5)
      bg.fillRect(0, 0, W, H)
      // 斜向光带
      for (let i = 0; i < 8; i += 1) {
        bg.fillStyle(COLOR.gold, 0.03)
        bg.fillTriangle(i * 200 - 120, 0, i * 200 + 80, 0, i * 200 - 260, H)
      }
      this.backdrop.add(bg)
    }

    /** 构建文明 + 统帅选择界面 */
    buildSelect() {
      this.screen = 'select'
      const box = this.add.container(0, 0).setDepth(10)
      this.selectBox = box

      box.add(makeText(this, W / 2, 74, '万国觉醒', 60, COLOR.gold))
      box.add(makeText(this, W / 2, 122, '统帅远征 · 文明与王权', 26, COLOR.textSub))
      box.add(
        this.add
          .text(70, 176, '选择文明', {
            fontFamily: 'sans-serif',
            fontSize: '20px',
            color: css(COLOR.goldBright),
            fontStyle: 'bold'
          })
          .setOrigin(0, 0.5)
      )
      box.add(
        this.add
          .text(930, 176, '选择统帅', {
            fontFamily: 'sans-serif',
            fontSize: '20px',
            color: css(COLOR.goldBright),
            fontStyle: 'bold'
          })
          .setOrigin(0, 0.5)
      )

      // 8 张文明卡（4×2）
      this.civCards = {}
      CIVS.forEach((civ, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const cx = 168 + col * 216
        const cy = 252 + row * 140
        const card = drawCivCard(this, civ, cx, cy, 202, 126)
        this.civCards[civ.key] = card
        box.add(card)
        // 用独立 Zone 承接点击：容器自带的命中区在 Phaser 中会随子元素裁剪，
        // 会出现「卡片中心点不动」的问题，Zone 的命中区稳定可靠。
        const zone = this.add.zone(cx, cy, 202, 126).setOrigin(0.5)
        zone.setInteractive({ useHandCursor: true })
        zone.on('pointerdown', () => this.pickCiv(civ.key))
        box.add(zone)
      })

      // 3 张统帅卡
      this.cmdCards = {}
      COMMANDERS.forEach((cmd, i) => {
        const cy = 242 + i * 102
        const card = drawCommanderCard(this, cmd, 1060, cy, 262, 88)
        this.cmdCards[cmd.key] = card
        box.add(card)
        const zone = this.add.zone(1060, cy, 262, 88).setOrigin(0.5)
        zone.setInteractive({ useHandCursor: true })
        zone.on('pointerdown', () => this.pickCommander(cmd.key))
        box.add(zone)
      })

      // 汇总说明
      this.summaryText = this.add
        .text(W / 2 - 30, 528, '', {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          color: css(COLOR.snow),
          align: 'center',
          wordWrap: { width: 900 }
        })
        .setOrigin(0.5)
      box.add(this.summaryText)
      this.skillText = makeBody(this, W / 2 - 30, 562, '', 15, COLOR.textSub)
      box.add(this.skillText)

      const start = drawButton(this, { x: W / 2 - 30, y: 626, w: 300, h: 72, text: '开始远征', fontSize: 30 })
      start.on('pointerdown', () => this.startMatch())
      box.add(start)

      box.add(
        makeBody(
          this,
          W / 2 - 30,
          684,
          '文明与统帅决定被动加成 · 兵种相克 步→弓→骑→步 · 占领旗帜与护送圣物车是取胜关键',
          13,
          COLOR.textDim
        )
      )

      this.refreshSelect()
    }

    /** 选中文明 */
    pickCiv(key) {
      this.selectedCiv = key
      if (hooks.onSelect) hooks.onSelect()
      this.refreshSelect()
    }

    /** 选中统帅 */
    pickCommander(key) {
      this.selectedCmd = key
      if (hooks.onSelect) hooks.onSelect()
      this.refreshSelect()
    }

    /** 刷新选择态与加成说明 */
    refreshSelect() {
      Object.keys(this.civCards).forEach((k) => this.civCards[k].setSelected(k === this.selectedCiv))
      Object.keys(this.cmdCards).forEach((k) => this.cmdCards[k].setSelected(k === this.selectedCmd))
      const civ = civOf(this.selectedCiv)
      const cmd = commanderOf(this.selectedCmd)
      this.summaryText.setText(civ.name + ' · ' + civ.title + '　|　' + cmd.name + ' · ' + cmd.title)
      this.skillText.setText(civ.desc + '　·　' + cmd.passiveText + '　·　主动技：' + cmd.skill.name)
    }

    /**
     * 服务端档案回填（登录响应到达时调用）
     * @param {Object} profile 档案
     */
    applyProfile(profile) {
      if (!profile) {
        return
      }
      const merged = Object.assign(defaultProfile(), this.profile, profile)
      this.profile = merged
      if (this.screen === 'select') {
        this.selectedCiv = merged.civilization || this.selectedCiv
        this.selectedCmd = merged.commander || this.selectedCmd
        this.refreshSelect()
      }
    }

    // ---------------------------------------------------------------------
    // 战斗初始化
    // ---------------------------------------------------------------------

    /** 开始一局：清空选择界面，构建战场 */
    startMatch() {
      if (this.screen === 'battle') {
        return
      }
      if (this.selectBox) {
        this.selectBox.destroy(true)
        this.selectBox = null
      }
      this.setupMatch()
    }

    /** 初始化一局的全部战场状态（不负责销毁选择界面） */
    setupMatch() {
      this.screen = 'battle'
      this.civ = civOf(this.selectedCiv)
      this.cmd = commanderOf(this.selectedCmd)
      this.bonus = mergeBonus(this.selectedCiv, this.selectedCmd)

      this.score = 0
      this.timeLeft = MATCH_TIME
      this.rally = 0
      this.combo = 0
      this.comboAt = 0
      this.troopIdx = 0
      this.age = ageOf(0)
      this.matchStats = { flags: 0, kills: 0, barbs: 0, deliveries: 0 }
      this.castleHpMax = CASTLE_HP + (this.bonus.castleHp || 0)
      this.castleHp = this.castleHpMax
      this.res = {}
      Object.keys(RESOURCE).forEach((k) => {
        this.res[k] = RESOURCE[k].start
      })
      this.res.gem = 0
      this.keepHp = 420
      this.campLevel = 1
      this.campHpMax = CAMP_HP
      this.campHp = CAMP_HP
      this.campRespawnAt = 0
      this.cartRespawnAt = 0
      this.deliveries = 0
      this.skillReadyAt = 0
      this.skillCdTotal = this.cmd.skill.cd * (this.bonus.cd || 1)
      this.enemyTimer = 3000
      this.waveCount = 0

      this.buildField()
      this.buildHud()
      this.buildResultPanel()
      this.bindInput()

      this.alive = true
      this.timerEvent = this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tickSecond() })
      this.lastTs = this.time.now
      this.showBanner('圣物车争夺 · 90 秒', '占领三面旗帜，护送圣物车抵达王权圣坛')
      if (hooks.onStart) hooks.onStart()
      this.emitHud(true)
    }

    /** 构建战场实体 */
    buildField() {
      this.field = this.add.container(0, 0).setDepth(1)
      this.field.add(drawWorldGround(this))
      this.field.add(drawBattleFrame(this))

      this.shrine = drawShrine(this, LAYOUT.shrine.x, LAYOUT.shrine.y)
      this.field.add(this.shrine)
      this.castle = drawCastle(this, LAYOUT.castle.x, LAYOUT.castle.y, 1)
      this.field.add(this.castle)
      this.castle.setSize(190, 190)
      this.castle.setInteractive({ useHandCursor: true })
      this.castle.on('pointerdown', () => this.repairCastle())
      this.keep = drawEnemyKeep(this, LAYOUT.keep.x, LAYOUT.keep.y)
      this.field.add(this.keep)
      this.keep.setSize(150, 150)
      this.keep.setInteractive({ useHandCursor: true })
      this.keep.on('pointerdown', () => this.orderAttack({ kind: 'keep' }))
      this.camp = drawBarbarianCamp(this, LAYOUT.camp.x, LAYOUT.camp.y)
      this.field.add(this.camp)
      this.camp.setSize(120, 110)
      this.camp.setInteractive({ useHandCursor: true })
      this.camp.on('pointerdown', () => this.orderAttack({ kind: 'camp', ref: null }))
      this.cart = drawHolyCart(this)
      this.cartProgress = 0
      this.cartControl = 'none'
      this.cart.setPosition(LAYOUT.cartStart.x, LAYOUT.cartStart.y)
      this.field.add(this.cart)
      this.cart.setDepth(6)
      this.cart.setSize(120, 90)
      this.cart.setInteractive({ useHandCursor: true })
      this.cart.on('pointerdown', () => this.orderAttack({ kind: 'cart' }))

      // 王权大道整段可点：点路即派兵护送圣物车（避免必须精准点小车）
      const road = this.add.zone(630, 168, 760, 78).setOrigin(0.5)
      road.setInteractive({ useHandCursor: true })
      road.on('pointerdown', () => this.orderAttack({ kind: 'cart' }))
      this.field.add(road)

      this.flags = LAYOUT.flags.map((f) => {
        const node = drawFlag(this, f.x, f.y, f.key)
        node.setSize(110, 120)
        node.setInteractive({ useHandCursor: true })
        const flag = { key: f.key, x: f.x, y: f.y, hp: FLAG_HP, maxHp: FLAG_HP, owner: 'neutral', node }
        node.on('pointerdown', () => this.orderAttack({ kind: 'flag', ref: flag }))
        this.field.add(node)
        return flag
      })

      // 战场提示
      this.banner = this.add.container(W / 2, 236).setDepth(45).setVisible(false)
      this.bannerBg = this.add.graphics()
      this.bannerTitle = makeText(this, 0, -14, '', 42, COLOR.goldBright)
      this.bannerSub = makeBody(this, 0, 26, '', 17, COLOR.snow)
      this.banner.add([this.bannerBg, this.bannerTitle, this.bannerSub])

      this.tipText = makeBody(this, W / 2, 596, '', 15, COLOR.goldBright)
      this.tipText.setDepth(44).setAlpha(0)
    }

    /** 构建顶部 + 底部 HUD */
    buildHud() {
      this.hud = this.add.container(0, 0).setDepth(40)

      const topBg = this.add.graphics()
      topBg.fillStyle(COLOR.woodDark, 0.94)
      topBg.fillRect(0, 0, W, 94)
      topBg.lineStyle(2, COLOR.gold, 0.6)
      topBg.lineBetween(0, 94, W, 94)
      this.hud.add(topBg)

      this.ageBadge = drawAgeBadge(this, 52, 48)
      this.hud.add(this.ageBadge)

      this.civLabel = this.add
        .text(96, 28, '', { fontFamily: 'sans-serif', fontSize: '14px', color: css(COLOR.textSub) })
        .setOrigin(0, 0.5)
      this.hud.add(this.civLabel)
      this.scoreText = this.add
        .text(96, 52, '得分 0', {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '28px',
          color: css(COLOR.snow),
          fontStyle: 'bold'
        })
        .setOrigin(0, 0.5)
      this.scoreText.setShadow(0, 2, '#000', 3)
      this.hud.add(this.scoreText)

      this.timeText = this.add
        .text(W / 2, 26, '90', {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '30px',
          color: css(COLOR.goldBright),
          fontStyle: 'bold'
        })
        .setOrigin(0.5)
      this.hud.add(this.timeText)
      this.timeHint = this.add
        .text(W / 2 + 30, 30, '秒', { fontFamily: 'sans-serif', fontSize: '14px', color: css(COLOR.textDim) })
        .setOrigin(0, 0.5)
      this.hud.add(this.timeHint)

      this.cartBar = drawCartBar(this, 442, 64, 396)
      this.hud.add(this.cartBar)

      this.resBar = drawResourceBar(this, 1236, 78)
      this.hud.add(this.resBar)

      // ---- 底部操作栏 ----
      const botBg = this.add.graphics()
      botBg.fillStyle(COLOR.woodDark, 0.96)
      botBg.fillRect(0, FIELD_BOTTOM + 4, W, H - FIELD_BOTTOM - 4)
      botBg.lineStyle(2, COLOR.gold, 0.55)
      botBg.lineBetween(0, FIELD_BOTTOM + 4, W, FIELD_BOTTOM + 4)
      this.hud.add(botBg)

      this.quitBtn = drawButton(this, {
        x: 68,
        y: 666,
        w: 92,
        h: 46,
        text: '返回',
        fontSize: 18,
        fill: COLOR.btnMuted
      })
      this.quitBtn.on('pointerdown', () => {
        if (hooks.onAction) hooks.onAction('quit')
      })
      this.hud.add(this.quitBtn)

      // 兵种三按钮
      this.troopBtns = {}
      TROOP_ORDER.forEach((key, i) => {
        const t = TROOPS[key]
        const btn = drawButton(this, {
          x: 208 + i * 132,
          y: 668,
          w: 118,
          h: 58,
          text: t.label,
          fontSize: 22,
          fill: shade(t.color, 0.85)
        })
        btn.on('pointerdown', () => this.pickTroop(i))
        btn.cool = this.add
          .text(btn.x + 44, 646, '', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffe9a8' })
          .setOrigin(1, 0.5)
          .setDepth(41)
        this.hud.add(btn)
        this.troopBtns[key] = btn
      })

      // 统帅值以按钮文案呈现（避免与底部按钮重叠）
      this.rallyBtn = drawButton(this, {
        x: 700,
        y: 668,
        w: 140,
        h: 58,
        text: '集结',
        fontSize: 22,
        fill: COLOR.btnSecondary
      })
      this.rallyBtn.on('pointerdown', () => this.doRally())
      this.hud.add(this.rallyBtn)

      const glyphs = { charge: '骑', aegis: '盾', fire: '火' }
      this.skillBtn = drawSkillButton(
        this,
        1176,
        666,
        40,
        glyphs[this.cmd.skill.key] || '技',
        this.cmd.name + '·' + this.cmd.skill.name
      )
      this.skillBtn.on('pointerdown', () => this.castSkill())
      this.hud.add(this.skillBtn)

      this.refreshHudStatic()
    }

    /** 刷新不随帧变化的 HUD 文案 */
    refreshHudStatic() {
      this.civLabel.setText(this.civ.name + ' · ' + this.civ.title + ' · ' + this.age.roman + ' ' + this.age.label)
      this.ageBadge.setAge(this.age)
      this.castle.setHp(1)
      this.resBar.setValues(this.res)
      this.timeText.setText(String(MATCH_TIME))
      this.cartBar.setProgress(0, 'none')
      this.updateTroopButtons()
      this.updateRallyBar()
      this.skillBtn.setCooldown(0, 0)
    }

    /** 结算面板容器（隐藏态） */
    buildResultPanel() {
      this.resultBox = this.add.container(0, 0).setDepth(70).setVisible(false)
    }

    /** 绑定键盘快捷键：1/2/3 兵种，空格 集结，Q 技能，R 修复 */
    bindInput() {
      if (!this.input.keyboard || this.inputBound) {
        return
      }
      this.inputBound = true
      this.input.keyboard.on('keydown-ONE', () => this.pickTroop(0))
      this.input.keyboard.on('keydown-TWO', () => this.pickTroop(1))
      this.input.keyboard.on('keydown-THREE', () => this.pickTroop(2))
      this.input.keyboard.on('keydown-SPACE', () => this.doRally())
      this.input.keyboard.on('keydown-Q', () => this.castSkill())
      this.input.keyboard.on('keydown-R', () => this.repairCastle())
    }

    // ---------------------------------------------------------------------
    // 玩家操作
    // ---------------------------------------------------------------------

    /** 切换兵种 */
    pickTroop(idx) {
      if (!this.alive) {
        return
      }
      this.troopIdx = idx
      this.updateTroopButtons()
      if (hooks.onSend) hooks.onSend()
    }

    /** 刷新兵种按钮选中态与粮耗 */
    updateTroopButtons() {
      TROOP_ORDER.forEach((key, i) => {
        const btn = this.troopBtns[key]
        const cost = Math.round(TROOPS[key].cost * this.bonus.foodCost)
        btn.label.setText(TROOPS[key].label + ' ' + cost)
        btn.setAlpha(i === this.troopIdx ? 1 : 0.75)
        btn.setScale(i === this.troopIdx ? 1.04 : 1)
      })
    }

    /**
     * 派兵前往目标
     * @param {Object} dest 目标 {kind, ref}
     */
    orderAttack(dest) {
      if (!this.alive) {
        return
      }
      const type = TROOP_ORDER[this.troopIdx]
      const cost = Math.round(TROOPS[type].cost * this.bonus.foodCost)
      if (this.res.food < cost) {
        this.showTip('粮草不足，等待补给')
        return
      }
      this.res.food -= cost
      this.spawnUnit('player', type, dest)
      if (hooks.onSend) hooks.onSend()
      this.emitHud(true)
    }

    /** 修复主城（耗木） */
    repairCastle() {
      if (!this.alive) {
        return
      }
      const cost = 60
      if (this.castleHp >= this.castleHpMax) {
        this.showTip('主城完好，无需修复')
        return
      }
      if (this.res.wood < cost) {
        this.showTip('木材不足（需 60）')
        return
      }
      this.res.wood -= cost
      this.castleHp = Math.min(this.castleHpMax, this.castleHp + 25)
      this.castle.setHp(this.castleHp / this.castleHpMax)
      this.floatText(LAYOUT.castle.x, LAYOUT.castle.y - 120, '+25 耐久', 0x6fb98a)
      if (hooks.onRepair) hooks.onRepair()
      this.emitHud(true)
    }

    /** 集结：消耗满统帅值，一次派出 3 支部队 */
    doRally() {
      if (!this.alive || this.rally < 100) {
        return
      }
      this.rally = 0
      this.updateRallyBar()
      const dest = this.pickObjective()
      const type = TROOP_ORDER[this.troopIdx]
      for (let i = 0; i < 3; i += 1) {
        this.time.delayedCall(i * 130, () => {
          if (this.alive) {
            this.spawnUnit('player', type, dest)
          }
        })
      }
      this.floatText(LAYOUT.castle.x, LAYOUT.castle.y - 150, '集结！', COLOR.goldBright)
      if (hooks.onRally) hooks.onRally()
    }

    /** 当前最优目标：圣物车优先，其次未占领旗帜 */
    pickObjective() {
      if (this.cartProgress < 0.98) {
        return { kind: 'cart' }
      }
      const flag = this.flags.filter((f) => f.owner !== 'player').sort((a, b) => a.hp - b.hp)[0]
      return flag ? { kind: 'flag', ref: flag } : { kind: 'keep' }
    }

    /** 释放统帅主动技能 */
    castSkill() {
      if (!this.alive) {
        return
      }
      const now = this.time.now
      if (now < this.skillReadyAt) {
        this.showTip('技能冷却中')
        return
      }
      this.skillReadyAt = now + this.skillCdTotal * 1000
      const type = this.cmd.skill.key
      if (type === 'charge') {
        this.speedBuffUntil = now + this.cmd.skill.duration
        this.damageBuffUntil = now + this.cmd.skill.duration
        this.areaDamage(LAYOUT.castle.x, LAYOUT.castle.y, 999, 40, 'player')
        this.floatText(W / 2, 300, '虎豹突袭', COLOR.goldBright)
      } else if (type === 'aegis') {
        this.shieldUntil = now + this.cmd.skill.duration
        this.castle.setShield(true)
        ;[0, 1].forEach((i) => {
          this.time.delayedCall(i * 160, () => {
            if (this.alive) {
              this.spawnUnit('player', 'infantry', this.pickObjective())
            }
          })
        })
        this.floatText(LAYOUT.castle.x, LAYOUT.castle.y - 150, '军团壁垒', COLOR.shield)
      } else if (type === 'fire') {
        this.fireUntil = now + this.cmd.skill.duration
        this.areaDamage(0, 0, 9999, 50, 'player')
        this.flags.forEach((f) => {
          this.fireRing(f.x, f.y)
        })
        this.floatText(W / 2, 300, '火攻', 0xff8a3a)
      }
      if (hooks.onSkill) hooks.onSkill(type)
      this.emitHud(true)
    }

    /**
     * 范围伤害
     * @param {number} x 中心 x（9999 表示全场）
     * @param {number} y 中心 y
     * @param {number} radius 半径
     * @param {number} dmg 伤害
     * @param {string} from 施放方
     */
    areaDamage(x, y, radius, dmg, from) {
      this.units.slice().forEach((u) => {
        if (u.side === from || u.dead) {
          return
        }
        const d = Math.hypot(u.x - x, u.y - y)
        if (d <= radius) {
          this.damageUnit(u, dmg, from)
        }
      })
    }

    // ---------------------------------------------------------------------
    // 单位与战斗
    // ---------------------------------------------------------------------

    /**
     * 生成单位
     * @param {string} side player/enemy
     * @param {string} type 兵种
     * @param {Object} dest 目标
     */
    spawnUnit(side, type, dest) {
      const base = side === 'player' ? LAYOUT.castle : LAYOUT.keep
      const node = drawUnit(this, type, side === 'enemy')
      const x = base.x + (Math.random() * 56 - 28)
      const y = base.y + (Math.random() * 44 - 22)
      node.setPosition(x, y)
      node.setDepth(5 + y / 300)
      const ageBonus = 1 + Math.max(0, this.age.age - 5) * 0.07
      const hp = TROOPS[type].hp * (side === 'enemy' ? 0.9 + this.campLevel * 0.04 : 1) * ageBonus
      const dmg = TROOPS[type].dmg * (side === 'enemy' ? 0.85 + this.waveCount * 0.02 : this.bonus.troopDmg[type]) * ageBonus
      const unit = {
        id: Math.random().toString(36).slice(2),
        node,
        x,
        y,
        side,
        type,
        hp,
        maxHp: hp,
        dmg,
        speed: TROOPS[type].speed * (side === 'player' ? this.bonus.troopSpd[type] : 1),
        dest,
        state: 'march',
        atkCd: 0,
        escortT: 0,
        dead: false
      }
      node.setHp(1)
      this.units.push(unit)
      return unit
    }

    /** 当前存活单位 */
    alive_units(side) {
      return this.units.filter((u) => !u.dead && (!side || u.side === side))
    }

    /**
     * 单位受伤
     * @param {Object} unit 单位
     * @param {number} dmg 伤害
     * @param {string} from 来源方
     */
    damageUnit(unit, dmg, from) {
      if (!unit || unit.dead) {
        return
      }
      if (unit.side === 'player' && this.time.now < this.shieldUntil) {
        dmg *= 0.5
      }
      unit.hp -= dmg
      unit.node.setHp(Math.max(0, unit.hp / unit.maxHp))
      if (unit.hp <= 0) {
        unit.dead = true
        this.floatText(unit.x, unit.y - 26, '×', COLOR.enemy)
        this.removeUnit(unit)
        if (from === 'player' && unit.side === 'enemy') {
          this.addScore(15 * this.bonus.score, unit.x, unit.y, '+15')
          this.rally = Math.min(100, this.rally + 8)
          this.matchStats.kills += 1
          this.updateRallyBar()
          if (hooks.onHit) hooks.onHit()
        }
      }
    }

    /** 移除单位 */
    removeUnit(unit) {
      const i = this.units.indexOf(unit)
      if (i >= 0) {
        this.units.splice(i, 1)
      }
      if (unit.node) {
        unit.node.destroy()
        unit.node = null
      }
    }

    /** 主循环 */
    update(time, delta) {
      if (!this.alive) {
        return
      }
      const dt = Math.min(delta, 60) / 1000
      this.updateUnits(dt)
      this.updateCombat(dt)
      this.updateCart(dt)
      this.updateFlags(dt)
      this.updateEconomy(dt)
      this.updateEnemyAI(dt)
      this.updateTimers(dt)
      this.updateHudTick(dt)
    }

    /** 单位移动与抵达 */
    updateUnits(dt) {
      const now = this.time.now
      const speedBuff = now < this.speedBuffUntil ? 1.8 : 1
      this.units.forEach((u) => {
        if (u.dead || u.engaged) {
          return
        }
        let tx = u.x
        let ty = u.y
        if (u.state === 'escort') {
          tx = this.cart.x + Math.cos((u.id.charCodeAt(0) || 0) + u.escortT) * 46
          ty = this.cart.y + 40 + Math.sin((u.id.charCodeAt(1) || 0) + u.escortT) * 18
          u.escortT += dt
        } else if (u.dest) {
          if (u.dest.kind === 'flag' && u.dest.ref) {
            tx = u.dest.ref.x
            ty = u.dest.ref.y
          } else if (u.dest.kind === 'cart') {
            tx = this.cart.x
            ty = this.cart.y + 36
          } else if (u.dest.kind === 'camp') {
            tx = LAYOUT.camp.x
            ty = LAYOUT.camp.y
          } else if (u.dest.kind === 'keep') {
            tx = LAYOUT.keep.x
            ty = LAYOUT.keep.y
          } else if (u.dest.kind === 'castle') {
            tx = LAYOUT.castle.x
            ty = LAYOUT.castle.y
          }
        }
        const dx = tx - u.x
        const dy = ty - u.y
        const d = Math.hypot(dx, dy)
        if (d > 8) {
          const sp = u.speed * speedBuff
          u.x += (dx / d) * sp * dt
          u.y += (dy / d) * sp * dt
          u.node.setPosition(u.x, u.y)
          u.node.setDepth(5 + u.y / 300)
        } else if (u.state === 'march') {
          this.arrive(u)
        }
      })
    }

    /** 抵达目标结算 */
    arrive(u) {
      if (u.dead) {
        return
      }
      if (u.side === 'player') {
        const d = u.dest || { kind: 'keep' }
        if (d.kind === 'flag' && d.ref) {
          this.hitFlag(d.ref, u, 'player')
          u.dest = null
          this.removeUnit(u)
        } else if (d.kind === 'cart') {
          u.state = 'escort'
          u.dest = null
          if (this.cartProgress >= 0.999) {
            this.removeUnit(u)
          }
        } else if (d.kind === 'camp') {
          this.hitCamp(u)
          this.removeUnit(u)
        } else if (d.kind === 'keep') {
          this.hitKeep(u)
          this.removeUnit(u)
        }
      } else {
        const d = u.dest || { kind: 'castle' }
        if (d.kind === 'castle') {
          this.hitCastle(u)
          this.removeUnit(u)
        } else if (d.kind === 'flag' && d.ref) {
          this.hitFlag(d.ref, u, 'enemy')
          u.dest = { kind: 'castle' }
        } else if (d.kind === 'cart') {
          u.state = 'escort'
          u.dest = null
        }
      }
    }

    /**
     * 攻击旗帜
     * @param {Object} flag 旗帜
     * @param {Object} unit 单位
     * @param {string} side 阵营
     */
    hitFlag(flag, unit, side) {
      if (flag.owner === side) {
        return
      }
      const dmg = unit.dmg * (side === 'player' ? 1 : 1.1)
      flag.hp -= dmg
      flag.node.setHp(Math.max(0, flag.hp / flag.maxHp))
      this.floatText(flag.x + 26, flag.y - 30, '-' + Math.round(dmg), side === 'player' ? COLOR.gold : COLOR.enemy)
      if (flag.hp <= 0) {
        flag.owner = side
        flag.hp = flag.maxHp
        flag.node.setOwner(side)
        flag.node.setHp(1)
        if (side === 'player') {
          this.addScore(80 * this.bonus.score, flag.x, flag.y - 40, '+80')
          this.rally = Math.min(100, this.rally + 14)
          this.res.gold += 25
          this.matchStats.flags += 1
          this.updateRallyBar()
          if (hooks.onFlag) hooks.onFlag()
        } else {
          this.showTip('旗帜 ' + flag.key + ' 被敌军夺取')
        }
      }
    }

    /** 攻击野蛮人营地 */
    hitCamp(u) {
      if (this.time.now < this.campRespawnAt) {
        return
      }
      this.campHp -= u.dmg
      this.camp.setHp(Math.max(0, this.campHp / this.campHpMax))
      this.floatText(LAYOUT.camp.x, LAYOUT.camp.y - 40, '-' + Math.round(u.dmg), 0xd8a06a)
      if (this.campHp <= 0) {
        const lootMul = this.bonus.loot * (1 + (this.campLevel - 1) * 0.2)
        Object.keys(CAMP_REWARD).forEach((k) => {
          if (k === 'gem') {
            this.res.gem += Math.max(1, Math.round(CAMP_REWARD.gem * lootMul))
          } else {
            this.res[k] = Math.min(RESOURCE[k].max, this.res[k] + Math.round(CAMP_REWARD[k] * lootMul))
          }
        })
        this.addScore((60 + this.campLevel * 20) * this.bonus.score, LAYOUT.camp.x, LAYOUT.camp.y - 60, '讨伐 +' + (60 + this.campLevel * 20))
        this.rally = Math.min(100, this.rally + 12 * this.bonus.rally)
        this.matchStats.barbs += 1
        this.updateRallyBar()
        this.campLevel = Math.min(5, this.campLevel + 1)
        this.campHpMax = Math.round(CAMP_HP * (1 + (this.campLevel - 1) * 0.35))
        this.campHp = this.campHpMax
        this.campRespawnAt = this.time.now + 6000
        this.camp.setVisible(false)
        this.camp.setLevel(this.campLevel)
        this.time.delayedCall(6000, () => {
          if (this.camp) {
            this.camp.setVisible(true)
            this.camp.setHp(1)
          }
        })
        if (hooks.onScore) hooks.onScore()
        this.emitHud(true)
      }
    }

    /** 攻击敌方要塞 */
    hitKeep(u) {
      this.keepHp = (this.keepHp === undefined ? 420 : this.keepHp) - u.dmg
      this.keep.setHp(Math.max(0, this.keepHp / 420))
      this.floatText(LAYOUT.keep.x, LAYOUT.keep.y - 100, '-' + Math.round(u.dmg), COLOR.gold)
      if (this.keepHp <= 0) {
        this.addScore(500 * this.bonus.score, LAYOUT.keep.x, LAYOUT.keep.y - 120, '要塞陷落 +500')
        this.endMatch(true, '敌方要塞陷落')
      }
    }

    /** 敌军抵达主城 */
    hitCastle(u) {
      if (this.time.now < this.shieldUntil) {
        this.floatText(LAYOUT.castle.x, LAYOUT.castle.y - 120, '格挡', COLOR.shield)
        return
      }
      const dmg = u.dmg * 0.9
      this.castleHp = Math.max(0, this.castleHp - dmg)
      this.castle.setHp(this.castleHp / this.castleHpMax)
      this.combo = 0
      this.floatText(LAYOUT.castle.x, LAYOUT.castle.y - 130, '-' + Math.round(dmg), COLOR.enemy)
      if (hooks.onHit) hooks.onHit()
      if (this.castleHp <= 0) {
        this.endMatch(false, '主城陷落')
      }
      this.emitHud(true)
    }

    /** 单位互相交战 */
    updateCombat(dt) {
      const now = this.time.now
      const players = this.alive_units('player')
      const enemies = this.alive_units('enemy')
      players.forEach((p) => {
        p.engaged = false
      })
      enemies.forEach((e) => {
        e.engaged = false
      })
      players.forEach((p) => {
        enemies.forEach((e) => {
          if (p.dead || e.dead) {
            return
          }
          const d = Math.hypot(p.x - e.x, p.y - e.y)
          if (d < 38) {
            p.engaged = true
            e.engaged = true
            if (p.atkCd <= 0) {
              const rate = counterRate(p.type, e.type)
              this.damageUnit(e, p.dmg * rate, 'player')
              p.atkCd = 0.7
              this.slash(p.x, e.x, p.y, e.y)
            }
            if (e.atkCd <= 0 && !e.dead) {
              const rate = counterRate(e.type, p.type)
              this.damageUnit(p, e.dmg * rate * (this.time.now < this.shieldUntil ? 0.5 : 1), 'enemy')
              e.atkCd = 0.7
            }
          }
        })
      })
      this.units.forEach((u) => {
        if (u.atkCd > 0) {
          u.atkCd -= dt
        }
      })
      // 火攻灼烧：旗帜区持续伤害
      if (now < this.fireUntil) {
        this.flags.forEach((f) => {
          enemies.forEach((e) => {
            if (Math.hypot(e.x - f.x, e.y - f.y) < 90 && e.burnCd !== now) {
              e.burnCd = now
              this.damageUnit(e, 10, 'player')
            }
          })
        })
      }
    }

    /** 圣物车推进与控制 */
    updateCart(dt) {
      if (this.cartProgress >= 1) {
        return
      }
      let pPower = 0
      let ePower = 0
      this.units.forEach((u) => {
        if (u.dead) {
          return
        }
        const d = Math.hypot(u.x - this.cart.x, u.y - this.cart.y)
        if (d <= CART_RANGE) {
          const w = u.state === 'escort' ? 2 : 1
          if (u.side === 'player') {
            pPower += w
          } else {
            ePower += w
          }
        }
      })
      let control = 'none'
      let speed = CART_SPEED * 0.16
      if (pPower > ePower) {
        control = 'player'
        speed = CART_SPEED * (1 + Math.min(2.2, pPower * 0.55))
        this.addScore(3 * dt * this.bonus.score, this.cart.x, this.cart.y - 50, null)
        this.rally = Math.min(100, this.rally + 1.4 * dt)
      } else if (ePower > pPower) {
        control = 'enemy'
        speed = -CART_SPEED * 0.4
      }
      if (this.cartControl !== control) {
        this.cartControl = control
        this.cart.setControlled(control)
        this.cartBar.setControl(control)
        if (control === 'player' && hooks.onCart) hooks.onCart()
      }
      this.cartProgress = Math.max(0, Math.min(1, this.cartProgress + speed * dt))
      const x = LAYOUT.cartStart.x + (LAYOUT.cartEnd.x - LAYOUT.cartStart.x) * this.cartProgress
      this.cart.setPosition(x, LAYOUT.cartStart.y)
      this.cart.setDepth(5 + this.cart.y / 300)
      this.cartBar.setProgress(this.cartProgress, control)
      if (this.cartProgress >= 1) {
        this.deliverCart()
      }
      this.updateRallyBar()
    }

    /** 圣物车抵达圣坛 */
    deliverCart() {
      this.deliveries += 1
      this.matchStats.deliveries += 1
      if (this.cartControl === 'player') {
        this.addScore(CART_REWARD * this.bonus.score, LAYOUT.shrine.x, LAYOUT.shrine.y + 40, '圣物抵达 +300')
        this.res.gem += 3
        if (hooks.onScore) hooks.onScore()
      }
      this.floatText(LAYOUT.shrine.x, LAYOUT.shrine.y - 40, '王权加冕', COLOR.goldBright)
      this.cart.setControlled('none')
      this.cartControl = 'none'
      this.cartBar.setControl('none')
      // 我方护送单位撤回，避免堆叠
      this.units.slice().forEach((u) => {
        if (u.state === 'escort') {
          this.removeUnit(u)
        }
      })
      // 9 秒后开启下一轮
      this.cartProgress = 0.0001
      this.cart.setPosition(LAYOUT.cartStart.x, LAYOUT.cartStart.y)
      this.cartBar.setProgress(0, 'none')
      this.time.delayedCall(6000, () => {
        if (this.alive) {
          this.cartProgress = 0
          this.showTip('新的圣物车已出发')
        }
      })
      this.emitHud(true)
    }

    /** 旗帜持续产分 */
    updateFlags(dt) {
      let owned = 0
      this.flags.forEach((f) => {
        if (f.owner === 'player') {
          owned += 1
        }
      })
      if (owned > 0) {
        this.addScore(3 * owned * dt * this.bonus.score, null, null, null)
      }
    }

    /** 资源产出 */
    updateEconomy(dt) {
      Object.keys(RESOURCE).forEach((k) => {
        const def = RESOURCE[k]
        if (!def.regen) {
          return
        }
        const mul = k === 'food' ? this.bonus.foodRegen : 1
        this.res[k] = Math.min(def.max, this.res[k] + def.regen * mul * dt)
      })
    }

    /** 敌方 AI：周期出兵 */
    updateEnemyAI(dt) {
      this.enemyTimer -= dt * 1000
      if (this.enemyTimer > 0) {
        return
      }
      const enemies = this.alive_units('enemy')
      if (enemies.length >= 7) {
        this.enemyTimer = 1200
        return
      }
      this.enemyTimer = Math.max(1400, 2900 - this.waveCount * 60)
      this.waveCount += 1
      const roll = Math.random()
      let dest
      if (roll < 0.45) {
        const targets = this.flags.filter((f) => f.owner !== 'enemy')
        dest = targets.length ? { kind: 'flag', ref: targets[Math.floor(Math.random() * targets.length)] } : { kind: 'castle' }
      } else if (roll < 0.75 && this.cartProgress < 0.99) {
        dest = { kind: 'cart' }
      } else {
        dest = { kind: 'castle' }
      }
      const types = ['infantry', 'cavalry', 'archer']
      const type = types[Math.floor(Math.random() * types.length)]
      this.spawnUnit('enemy', type, dest)
    }

    /** 倒计时与技能冷却 */
    updateTimers(dt) {
      this.timeLeft = Math.max(0, this.timeLeft - dt)
      const ratio = this.skillReadyAt > this.time.now
        ? 1 - (this.skillReadyAt - this.time.now) / (this.skillCdTotal * 1000)
        : 0
      this.skillBtn.setCooldown(ratio, this.skillReadyAt > this.time.now ? (this.skillReadyAt - this.time.now) / 1000 : 0)
      const ready = this.time.now >= this.skillReadyAt
      if (this._skillReady !== ready) {
        this._skillReady = ready
        this.skillBtn.setEnabled(ready)
      }
      if (this.timeLeft <= 0) {
        this.endMatch(this.score >= TARGET_SCORE && this.castleHp > 0, '远征结束')
      }
    }

    /** HUD 帧同步（降频） */
    updateHudTick(dt) {
      this.tipsTimer = Math.max(0, this.tipsTimer - dt)
      if (this.tipsTimer <= 0 && this.tipText) {
        this.tipText.setAlpha(Math.max(0, this.tipText.alpha - dt * 1.6))
      }
      this.hudTimer -= dt
      if (this.hudTimer > 0) {
        return
      }
      this.hudTimer = 0.12
      this.emitHud(false)
    }

    /** 每秒逻辑（倒计时音效） */
    tickSecond() {
      if (!this.alive) {
        return
      }
      if (this.timeLeft <= 10 && this.timeLeft > 0 && hooks.onTick) {
        hooks.onTick()
      }
    }

    // ---------------------------------------------------------------------
    // 表现反馈
    // ---------------------------------------------------------------------

    /**
     * 增加分数并推进时代
     * @param {number} v 增量
     * @param {number|null} x 飘字位置
     * @param {number|null} y 飘字位置
     * @param {string|null} label 飘字文案
     */
    addScore(v, x, y, label) {
      if (!v) {
        return
      }
      this.score += v
      if (label && x !== null && y !== null) {
        this.floatText(x, y, label, COLOR.goldBright)
      }
      const next = ageOf(this.score)
      if (next.age > this.age.age) {
        this.age = next
        this.ageBadge.setAge(next)
        if (this.civLabel) {
          this.civLabel.setText(this.civ.name + ' · ' + this.civ.title + ' · ' + next.roman + ' ' + next.label)
        }
        this.ageUpEffect(next)
        this.addScore(120, null, null, null)
        if (hooks.onAge) hooks.onAge(next.age)
      }
    }

    /** 升时代特效 */
    ageUpEffect(age) {
      this.showBanner('进入' + age.label, '市政厅升至 ' + age.roman + ' 级 · 全军战力提升')
      const g = this.add.graphics().setDepth(46)
      g.fillStyle(COLOR.goldBright, 0.25)
      g.fillRect(0, 0, W, H)
      this.tweens.add({
        targets: g,
        alpha: 0,
        duration: 900,
        onComplete: () => g.destroy()
      })
      this.units.forEach((u) => {
        if (u.side === 'player') {
          u.hp = u.maxHp
          u.node.setHp(1)
        }
      })
    }

    /** 顶部横幅 */
    showBanner(title, sub) {
      if (!this.banner) {
        return
      }
      this.bannerTitle.setText(title)
      this.bannerSub.setText(sub || '')
      this.bannerBg.clear()
      const w = Math.max(460, this.bannerTitle.width + 120)
      this.bannerBg.fillStyle(COLOR.woodDark, 0.9)
      this.bannerBg.fillRoundedRect(-w / 2, -44, w, 96, 12)
      this.bannerBg.lineStyle(2, COLOR.gold, 0.9)
      this.bannerBg.strokeRoundedRect(-w / 2, -44, w, 96, 12)
      this.banner.setVisible(true).setAlpha(1)
      this.tweens.add({
        targets: this.banner,
        alpha: 0,
        delay: 1500,
        duration: 600,
        onComplete: () => this.banner.setVisible(false)
      })
    }

    /** 底部提示 */
    showTip(text) {
      if (!this.tipText) {
        return
      }
      this.tipText.setText(text).setAlpha(1)
      this.tipsTimer = 1.6
    }

    /** 飘字 */
    floatText(x, y, text, tone) {
      if (x === null || y === null) {
        return
      }
      const t = makeText(this, x, y, text, 22, tone || COLOR.goldBright).setDepth(44)
      this.tweens.add({
        targets: t,
        y: y - 44,
        alpha: { from: 1, to: 0 },
        duration: 780,
        onComplete: () => t.destroy()
      })
    }

    /** 交战斩击线 */
    slash(x1, x2, y1, y2) {
      const g = this.add.graphics().setDepth(7)
      g.lineStyle(2, 0xffe9a8, 0.9)
      g.lineBetween(x1, y1, x2, y2)
      this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() })
    }

    /** 旗帜灼烧环 */
    fireRing(x, y) {
      const g = this.add.graphics().setDepth(7)
      g.lineStyle(3, 0xff8a3a, 0.8)
      g.strokeCircle(x, y, 60)
      this.tweens.add({
        targets: g,
        alpha: 0,
        scale: 1.4,
        duration: 700,
        onComplete: () => g.destroy()
      })
      g.setPosition(0, 0)
    }

    /** 刷新统帅值（以集结按钮文案呈现） */
    updateRallyBar() {
      if (!this.rallyBtn) {
        return
      }
      const pct = Math.min(100, Math.round(this.rally))
      this.rallyBtn.setText(pct >= 100 ? '集结 · 就绪' : '集结 ' + pct + '%')
      const ready = pct >= 100
      if (this._rallyOn !== ready) {
        this._rallyOn = ready
        this.rallyBtn.setEnabled(ready)
      }
    }

    /** 同步 HUD 状态到 Vue（供页脚提示） */
    emitHud(force) {
      this.scoreText.setText('得分 ' + Math.round(this.score))
      this.timeText.setText(String(Math.ceil(this.timeLeft)))
      this.resBar.setValues(this.res)
      if (hooks.onHud && force) {
        hooks.onHud({
          score: Math.round(this.score),
          timeLeft: Math.ceil(this.timeLeft),
          rally: Math.round(this.rally),
          troop: TROOPS[TROOP_ORDER[this.troopIdx]].label,
          age: this.age.age,
          civ: this.civ.name,
          resources: this.res
        })
      }
    }

    // ---------------------------------------------------------------------
    // 结算
    // ---------------------------------------------------------------------

    /**
     * 结束对局
     * @param {boolean} win 是否胜利
     * @param {string} reason 结束原因
     */
    endMatch(win, reason) {
      if (!this.alive) {
        return
      }
      this.alive = false
      if (this.timerEvent) {
        this.timerEvent.remove()
      }
      this.units.slice().forEach((u) => this.removeUnit(u))
      if (win) {
        if (hooks.onWin) hooks.onWin()
      } else if (hooks.onLose) hooks.onLose()
      this.showResult(win, reason)
    }

    /** 结算面板 */
    showResult(win, reason) {
      const score = Math.round(this.score)
      // 结算前按最终分数校正时代（防止分数由外部写入或末秒跨档）
      this.age = ageOf(score)
      const quality = qualityOf(score)
      const prog = ageProgress(score)
      const box = this.resultBox
      box.removeAll(true)
      box.setVisible(true).setAlpha(0)
      if (this.hud) {
        this.hud.setVisible(false)
      }

      const dim = this.add.graphics()
      dim.fillStyle(0x0c0803, 0.86)
      dim.fillRect(0, 0, W, H)
      box.add(dim)

      box.add(drawResultRays(this, quality.color))

      box.add(makeText(this, W / 2, 158, win ? '远征凯旋' : '远征受挫', 58, win ? COLOR.goldBright : COLOR.crimsonLight))
      box.add(makeBody(this, W / 2, 202, reason || '', 17, COLOR.textSub))

      // 品质徽记
      const badge = this.add.graphics()
      badge.fillStyle(quality.color, 0.16)
      badge.fillCircle(W / 2, 286, 76)
      badge.lineStyle(3, quality.color, 0.95)
      badge.strokeCircle(W / 2, 286, 76)
      badge.lineStyle(1, quality.color, 0.5)
      badge.strokeCircle(W / 2, 286, 68)
      box.add(badge)
      box.add(makeText(this, W / 2, 272, String(score), 46, COLOR.snow))
      box.add(makeBody(this, W / 2, 312, quality.name, 15, quality.color))

      // 时代进度
      const barX = W / 2 - 220
      const barY = 372
      const barW = 440
      const bar = this.add.graphics()
      bar.fillStyle(COLOR.woodDark, 0.9)
      bar.fillRoundedRect(barX, barY, barW, 14, 7)
      bar.fillStyle(COLOR.goldBright, 0.95)
      bar.fillRoundedRect(barX + 1, barY + 1, (barW - 2) * prog.ratio, 12, 6)
      bar.lineStyle(1, COLOR.gold, 0.8)
      bar.strokeRoundedRect(barX, barY, barW, 14, 7)
      box.add(bar)
      const ageLabel = prog.next
        ? '时代 ' + this.age.roman + ' · ' + this.age.label + '　→　下一时代还需 ' + Math.max(0, prog.next.need - score) + ' 分'
        : '时代 ' + this.age.roman + ' · 已臻王权'
      box.add(makeBody(this, W / 2, 400, ageLabel, 15, COLOR.textSub))

      // 战绩
      const stat = '旗帜 ' + this.matchStats.flags + ' · 歼敌 ' + this.matchStats.kills + ' · 讨伐 ' + this.matchStats.barbs + ' · 圣物 ' + this.matchStats.deliveries
      box.add(makeBody(this, W / 2, 434, stat, 15, COLOR.textDim))

      // 排行榜容器
      this.boardBox = this.add.container(0, 0)
      box.add(this.boardBox)
      this.renderBoard([], 0, win)

      const again = drawButton(this, { x: W / 2 - 264, y: 650, w: 220, h: 62, text: '再战一局', fontSize: 26 })
      again.on('pointerdown', () => this.restartMatch())
      box.add(again)
      const change = drawButton(this, {
        x: W / 2,
        y: 650,
        w: 220,
        h: 62,
        text: '更换文明',
        fontSize: 26,
        fill: COLOR.btnSecondary
      })
      change.on('pointerdown', () => this.backToSelect())
      box.add(change)
      const back = drawButton(this, {
        x: W / 2 + 264,
        y: 650,
        w: 220,
        h: 62,
        text: '返回大厅',
        fontSize: 26,
        fill: COLOR.btnMuted
      })
      back.on('pointerdown', () => {
        if (hooks.onAction) hooks.onAction('quit')
      })
      box.add(back)

      this.tweens.add({ targets: box, alpha: 1, duration: 320 })

      // 更新并提交档案
      const nextProfile = Object.assign({}, this.profile, {
        civilization: this.selectedCiv,
        commander: this.selectedCmd,
        age: Math.max(this.profile.age || 5, this.age.age),
        gems: (this.profile.gems || 0) + (quality.key === 'gold' ? 40 : quality.key === 'purple' ? 15 : 5),
        matches: (this.profile.matches || 0) + 1,
        wins: (this.profile.wins || 0) + (win ? 1 : 0),
        best: Math.max(this.profile.best || 0, score)
      })
      this.profile = nextProfile
      if (hooks.onSaveProfile) {
        hooks.onSaveProfile(nextProfile)
      }

      if (hooks.onGameOver) {
        Promise.resolve(
          hooks.onGameOver({
            score,
            win,
            civilization: this.selectedCiv,
            commander: this.selectedCmd,
            age: this.age.age
          })
        ).then((res) => {
          this.renderBoard((res && res.list) || [], (res && res.rank) || 0, win)
        })
      }
    }

    /**
     * 渲染排行榜
     * @param {Array} list 榜单
     * @param {number} rank 本局名次
     * @param {boolean} win 是否胜利
     */
    renderBoard(list, rank, win) {
      const box = this.boardBox
      if (!box || !box.scene) {
        return
      }
      box.removeAll(true)
      box.add(makeBody(this, W / 2, 464, '— 赛季远征榜 —', 15, COLOR.textSub))
      const rows = (list || []).slice(0, 5)
      if (!rows.length) {
        box.add(makeBody(this, W / 2, 492, '暂无记录', 14, COLOR.textDim))
        return
      }
      rows.forEach((r, i) => {
        const y = 486 + i * 24
        const tone = i === 0 ? COLOR.goldBright : COLOR.snow
        const civ = civOf(r.civilization)
        const line = (i + 1) + '.  ' + (r.nickname || '执政官') + '　' + (civ ? civ.name : '') + '　' + (r.score || 0)
        box.add(makeBody(this, W / 2, y, line, 14, tone))
      })
      if (rank) {
        box.add(makeBody(this, W / 2, 488 + rows.length * 24 + 6, '本局名次：第 ' + rank + ' 名', 14, win ? 0x6fb98a : COLOR.crimsonLight))
      }
    }

    /** 清理战场与 HUD（不含选择界面与结算面板） */
    teardownBattle() {
      if (this.units) {
        this.units.slice().forEach((u) => this.removeUnit(u))
      }
      this.units = []
      if (this.hud) {
        this.hud.destroy(true)
        this.hud = null
      }
      if (this.field) {
        this.field.destroy(true)
        this.field = null
      }
      this.banner = null
      this.tipText = null
      this.castle = null
      this.keep = null
      this.camp = null
      this.cart = null
      this.cartBar = null
      this.resBar = null
      this.flags = []
      this.screen = 'idle'
    }

    /** 重开一局（保留文明/统帅选择） */
    restartMatch() {
      this.resultBox.setVisible(false)
      this.resultBox.removeAll(true)
      this.teardownBattle()
      this.setupMatch()
    }

    /** 返回选择界面 */
    backToSelect() {
      this.resultBox.setVisible(false)
      this.resultBox.removeAll(true)
      this.teardownBattle()
      this.buildSelect()
    }
  }
}

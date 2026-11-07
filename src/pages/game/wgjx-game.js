/**
 * @file 万国觉醒·统帅远征 Phaser 3 场景。
 * 设计分辨率 1280×720（横屏），玩法：执政官从左下主城派兵攻克右上敌据点，
 * 连击攒「统帅值」触发集结，限时 60 秒。与《游戏资源分析》第 1 节对齐。
 *
 * hooks 契约（由 Vue 页面注入，解耦音频/网络/生命周期）：
 *   onReady(scene)            场景就绪
 *   onSend()                  派兵（音效）
 *   onScore()                 得分/击破（音效）
 *   onHit()                   交战/被击（音效）
 *   onRally()                 集结（音效）
 *   onWin() / onLose()        胜负（音效）
 *   onTick()                  每秒倒计时（音效）
 *   onHud({score, timeLeft, rally, troop})  HUD 同步
 *   onGameOver({score, win, board, rank})  对局结束
 *   onAction('quit')          返回大厅
 */

import {
  W,
  H,
  COLOR,
  UNIT,
  drawGround,
  drawStoneFrame,
  drawCastle,
  drawFort,
  drawUnit,
  drawButton,
  drawHudBar,
  drawCommanderBadge,
  makeText
} from './wgjx-theme.js'

const TROOP_ORDER = [UNIT.INFANTRY, UNIT.CAVALRY, UNIT.ARCHER]
const TROOP_LABEL = { infantry: '步兵', cavalry: '骑兵', archer: '弓兵' }
const TROOP_SPEED = { infantry: 260, cavalry: 380, archer: 300 }
const TROOP_DMG = { infantry: 22, cavalry: 28, archer: 18 }
const FORT_HP = 100
const CASTLE_HP = 100
const ENEMY_DMG = 8
const GAME_TIME = 60
const TARGET_SCORE = 1000
const COMBO_WINDOW = 4000

export default function createWgjxScene(Phaser, hooks) {
  return class WgjxScene extends Phaser.Scene {
    constructor() {
      super({ key: 'WgjxScene' })
    }

    create() {
      this.alive = false
      this.gameOver = false
      this.score = 0
      this.timeLeft = GAME_TIME
      this.rally = 0
      this.combo = 0
      this.comboAt = 0
      this.troopIdx = 0
      this.forts = []
      this.units = []
      this.enemyTimer = 0

      this.buildWorld()
      this.buildHud()
      this.buildOverlay()
      this.bindInput()

      this.tweens.add({
        targets: this.startPanel,
        alpha: { from: 0, to: 1 },
        duration: 300
      })
      if (hooks.onReady) {
        hooks.onReady(this)
      }
    }

    /** 构建战场：地纹、外框、主城、据点 */
    buildWorld() {
      drawGround(this)
      drawStoneFrame(this)
      this.castle = drawCastle(this, W * 0.16, H * 0.78, 1)
      this.castle.setSize(150, 160)
      this.castle.setInteractive({ useHandCursor: true })
      this.castle.on('pointerdown', () => this.cycleTroop())
      this.commander = drawCommanderBadge(this, W * 0.16, H * 0.78 - 150, 30, '曹')

      const positions = [
        [W * 0.66, H * 0.2],
        [W * 0.82, H * 0.3],
        [W * 0.72, H * 0.46],
        [W * 0.88, H * 0.56],
        [W * 0.6, H * 0.34]
      ]
      positions.forEach((p) => {
        const node = drawFort(this, p[0], p[1], false, 1)
        node.setSize(90, 90)
        node.setInteractive({ useHandCursor: true })
        const fort = { x: p[0], y: p[1], hp: FORT_HP, maxHp: FORT_HP, captured: false, node }
        node.on('pointerdown', () => this.sendAlly(fort))
        this.forts.push(fort)
      })
    }

    /** 构建 HUD：顶部栏 + 兵种指示 + 集结按钮 + 返回 */
    buildHud() {
      this.hud = drawHudBar(this)
      this.troopLabel = makeText(this, W * 0.16, H * 0.78 + 130, '出兵：步兵', 22, COLOR.gold)
      this.rallyBtn = drawButton(this, {
        x: W * 0.5,
        y: H - 50,
        w: 220,
        h: 64,
        text: '集结 (统帅)',
        fontSize: 26
      })
      this.rallyBtn.setEnabled(false)
      this.rallyBtn.on('pointerdown', () => this.doRally())
      this.quitBtn = drawButton(this, {
        x: 110,
        y: 120,
        w: 120,
        h: 52,
        text: '返回',
        fontSize: 22,
        fill: COLOR.btnMuted
      })
      this.quitBtn.on('pointerdown', () => {
        if (hooks.onAction) hooks.onAction('quit')
      })
    }

    /** 构建开始 / 结束遮罩 */
    buildOverlay() {
      this.startPanel = this.add.container(0, 0).setDepth(50)
      const bg = this.add.graphics()
      bg.fillStyle(COLOR.woodDark, 0.82)
      bg.fillRect(0, 0, W, H)
      bg.lineStyle(4, COLOR.gold, 0.9)
      bg.strokeRect(40, 40, W - 80, H - 80)
      this.startPanel.add(bg)
      this.startPanel.add(makeText(this, W / 2, H * 0.32, '万国觉醒', 72, COLOR.gold))
      this.startPanel.add(makeText(this, W / 2, H * 0.32 + 78, '· 统帅远征 ·', 36, COLOR.snow))
      this.startPanel.add(
        this.add
          .text(W / 2, H * 0.52, '左键主城切换兵种 · 点击敌据点派兵\n连击攒统帅值触发集结 · 60 秒限时', {
            fontFamily: 'sans-serif',
            fontSize: '24px',
            color: '#d9c39a',
            align: 'center'
          })
          .setOrigin(0.5)
      )
      const go = drawButton(this, { x: W / 2, y: H * 0.72, w: 260, h: 76, text: '开始远征', fontSize: 32 })
      go.on('pointerdown', () => this.startGame())
      this.startPanel.add(go)

      this.overPanel = this.add.container(0, 0).setDepth(60).setVisible(false)
    }

    /** 绑定全局输入（点击据点/主城已由对象自身处理） */
    bindInput() {
      this.input.keyboard && this.input.keyboard.on('keydown-SPACE', () => this.cycleTroop())
    }

    /** 开始对局 */
    startGame() {
      if (this.alive) {
        return
      }
      this.startPanel.setVisible(false)
      this.alive = true
      this.gameOver = false
      this.lastTick = this.time.now
      if (hooks.onStart) hooks.onStart()
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => this.tick()
      })
    }

    /** 每秒逻辑：倒计时、敌袭、连击衰减 */
    tick() {
      if (!this.alive) {
        return
      }
      this.timeLeft -= 1
      if (this.timeLeft <= 10 && this.timeLeft > 0) {
        if (hooks.onTick) hooks.onTick()
      }
      // 敌袭：未占领据点按概率派敌军扑向主城
      this.forts.forEach((f) => {
        if (!f.captured && Math.random() < 0.55) {
          this.spawnEnemy(f)
        }
      })
      if (this.time.now - this.comboAt > COMBO_WINDOW) {
        this.combo = 0
      }
      this.emitHud()
      if (this.timeLeft <= 0) {
        this.endGame(this.score >= TARGET_SCORE)
      }
    }

    /** 切换出兵兵种 */
    cycleTroop() {
      if (!this.alive) {
        return
      }
      this.troopIdx = (this.troopIdx + 1) % TROOP_ORDER.length
      const t = TROOP_ORDER[this.troopIdx]
      this.troopLabel.setText('出兵：' + TROOP_LABEL[t])
      if (hooks.onSend) hooks.onSend()
    }

    /** 从主城派一支己方部队到指定据点 */
    sendAlly(fort) {
      if (!this.alive || fort.captured) {
        return
      }
      const type = TROOP_ORDER[this.troopIdx]
      const unit = drawUnit(this, this.castle.x, this.castle.y, type, false)
      this.units.push(unit)
      const dist = Phaser.Math.Distance.Between(this.castle.x, this.castle.y, fort.x, fort.y)
      const dur = (dist / TROOP_SPEED[type]) * 1000
      this.tweens.add({
        targets: unit,
        x: fort.x,
        y: fort.y,
        duration: dur,
        onComplete: () => this.onAllyArrive(fort, unit, type)
      })
      if (hooks.onSend) hooks.onSend()
    }

    /** 己方部队抵达据点：扣血、连击、积分、占领 */
    onAllyArrive(fort, unit, type) {
      this.removeUnit(unit)
      if (this.gameOver || fort.captured) {
        return
      }
      this.combo += 1
      this.comboAt = this.time.now
      const mult = this.combo >= 3 ? 2 : 1
      this.score += 15 * mult
      this.rally = Math.min(100, this.rally + 12)
      fort.hp -= TROOP_DMG[type]
      fort.node.setHp(Math.max(0, fort.hp) / fort.maxHp)
      this.floatText(fort.x, fort.y - 50, '-' + TROOP_DMG[type], COLOR.gold)
      if (fort.hp <= 0) {
        fort.captured = true
        fort.node.setCaptured(true)
        this.score += 120
        this.floatText(fort.x, fort.y - 80, '占领 +120', COLOR.mossLight)
        if (hooks.onScore) hooks.onScore()
      }
      this.refreshRallyBtn()
      this.emitHud()
    }

    /** 集结：统帅值满时一次派出 3 路扑向最近的未占领据点 */
    doRally() {
      if (!this.alive || this.rally < 100) {
        return
      }
      this.rally = 0
      const target = this.forts
        .filter((f) => !f.captured)
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(this.castle.x, this.castle.y, a.x, a.y) -
            Phaser.Math.Distance.Between(this.castle.x, this.castle.y, b.x, b.y)
        )[0]
      if (target) {
        for (let i = 0; i < 3; i += 1) {
          this.time.delayedCall(i * 120, () => this.sendAlly(target))
        }
      }
      if (hooks.onRally) hooks.onRally()
      this.refreshRallyBtn()
    }

    /** 从据点派一支敌军扑向主城 */
    spawnEnemy(fort) {
      const unit = drawUnit(this, fort.x, fort.y, UNIT.INFANTRY, true)
      this.units.push(unit)
      const dist = Phaser.Math.Distance.Between(fort.x, fort.y, this.castle.x, this.castle.y)
      const dur = (dist / 200) * 1000
      this.tweens.add({
        targets: unit,
        x: this.castle.x,
        y: this.castle.y,
        duration: dur,
        onComplete: () => this.onEnemyArrive(unit)
      })
    }

    /** 敌军抵达主城：扣主城耐久、断连击 */
    onEnemyArrive(unit) {
      this.removeUnit(unit)
      if (this.gameOver) {
        return
      }
      this.combo = 0
      const hp = Math.max(0, this.castleHpValue() - ENEMY_DMG)
      this.castleHp = hp
      this.castle.setHp(hp / CASTLE_HP)
      this.floatText(this.castle.x, this.castle.y - 110, '-' + ENEMY_DMG, COLOR.enemy)
      if (hooks.onHit) hooks.onHit()
      this.emitHud()
      if (hp <= 0) {
        this.endGame(false)
      }
    }

    /** 主城耐久（create 后初始化为满） */
    castleHpValue() {
      if (this.castleHp === undefined) {
        this.castleHp = CASTLE_HP
      }
      return this.castleHp
    }

    /** 刷新集结按钮可用态 */
    refreshRallyBtn() {
      this.rallyBtn.setEnabled(this.alive && this.rally >= 100)
    }

    /** 同步 HUD */
    emitHud() {
      if (hooks.onHud) {
        hooks.onHud({
          score: this.score,
          timeLeft: this.timeLeft,
          rally: this.rally,
          troop: TROOP_LABEL[TROOP_ORDER[this.troopIdx]]
        })
      }
      if (this.hud) {
        this.hud.setScore(this.score)
        this.hud.setTime(this.timeLeft)
        this.hud.setRally(this.rally)
      }
    }

    /** 飘字反馈 */
    floatText(x, y, text, tone) {
      const t = makeText(this, x, y, text, 24, tone).setDepth(40)
      this.tweens.add({
        targets: t,
        y: y - 40,
        alpha: { from: 1, to: 0 },
        duration: 700,
        onComplete: () => t.destroy()
      })
    }

    /** 移除并销毁单位 */
    removeUnit(unit) {
      const i = this.units.indexOf(unit)
      if (i >= 0) {
        this.units.splice(i, 1)
      }
      unit.destroy()
    }

    /** 结束对局 */
    endGame(win) {
      if (this.gameOver) {
        return
      }
      this.gameOver = true
      this.alive = false
      if (this.timerEvent) {
        this.timerEvent.remove()
      }
      if (win) {
        if (hooks.onWin) hooks.onWin()
      } else {
        if (hooks.onLose) hooks.onLose()
      }
      this.showOver(win)
    }

    /** 显示结算遮罩（含排行榜异步回填） */
    showOver(win) {
      this.overPanel.removeAll(true)
      const bg = this.add.graphics()
      bg.fillStyle(COLOR.woodDark, 0.86)
      bg.fillRect(0, 0, W, H)
      bg.lineStyle(4, win ? COLOR.mossLight : COLOR.crimsonLight, 0.9)
      bg.strokeRect(40, 40, W - 80, H - 80)
      this.overPanel.add(bg)
      this.overPanel.add(makeText(this, W / 2, H * 0.18, win ? '远征凯旋' : '城破败亡', 64, win ? COLOR.mossLight : COLOR.crimsonLight))
      this.overPanel.add(makeText(this, W / 2, H * 0.18 + 64, '本局得分 ' + this.score, 36, COLOR.gold))
      // 排行榜占位容器，分数提交后异步回填
      const boardBox = this.add.container(0, 0)
      this.overPanel.add(boardBox)
      const again = drawButton(this, { x: W / 2 - 150, y: H * 0.82, w: 240, h: 74, text: '再战一局', fontSize: 30 })
      again.on('pointerdown', () => this.restart())
      this.overPanel.add(again)
      const back = drawButton(this, {
        x: W / 2 + 150,
        y: H * 0.82,
        w: 240,
        h: 74,
        text: '返回大厅',
        fontSize: 30,
        fill: COLOR.btnMuted
      })
      back.on('pointerdown', () => {
        if (hooks.onAction) hooks.onAction('quit')
      })
      this.overPanel.add(back)
      this.overPanel.setVisible(true)
      this.tweens.add({ targets: this.overPanel, alpha: { from: 0, to: 1 }, duration: 300 })
      // 结算时上报分数并拉取排行榜；Vue 页面经网络/离线本地处理后回填
      if (hooks.onGameOver) {
        Promise.resolve(hooks.onGameOver({ score: this.score, win })).then((res) => {
          this.renderBoard(boardBox, res && res.list, res && res.rank, win)
        })
      }
    }

    /**
     * 在结算面板渲染排行榜列表
     * @param {Object} box 排行榜容器
     * @param {Array} list 排行项 [{nickname, score}]
     * @param {number} rank 本局名次（1 起，0 表示未上榜）
     * @param {boolean} win 是否胜利
     */
    renderBoard(box, list, rank, win) {
      if (!box || !box.scene) {
        return
      }
      box.removeAll(true)
      box.add(makeText(this, W / 2, H * 0.34, '— 远征榜 —', 26, COLOR.textSub))
      const rows = (list || []).slice(0, 5)
      if (!rows.length) {
        box.add(makeText(this, W / 2, H * 0.46, '暂无记录', 22, COLOR.textSub))
        return
      }
      rows.forEach((r, i) => {
        const y = H * 0.4 + i * 38
        const tone = i === 0 ? COLOR.rally : COLOR.snow
        const line = (i + 1) + '.  ' + (r.nickname || '执政官') + '   ' + (r.score || 0)
        box.add(makeText(this, W / 2, y, line, 22, tone))
      })
      if (rank) {
        box.add(makeText(this, W / 2, H * 0.68, '你的名次：第 ' + rank + ' 名', 24, win ? COLOR.mossLight : COLOR.crimsonLight))
      }
    }

    /** 重开一局：清零所有对局状态后重新开局 */
    restart() {
      this.score = 0
      this.timeLeft = GAME_TIME
      this.rally = 0
      this.combo = 0
      this.comboAt = 0
      this.troopIdx = 0
      this.castleHp = CASTLE_HP
      this.castle.setHp(1)
      this.forts.forEach((f) => {
        f.hp = FORT_HP
        f.captured = false
        f.node.setCaptured(false)
        f.node.setHp(1)
      })
      this.units.slice().forEach((u) => this.removeUnit(u))
      this.troopLabel.setText('出兵：步兵')
      this.refreshRallyBtn()
      this.emitHud()
      this.startGame()
    }
  }
}

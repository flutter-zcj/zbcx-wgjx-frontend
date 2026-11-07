/**
 * @file 万国觉醒·统帅远征 音效。
 * 原版音效随 AssetBundle 加密下发无法直接提取（同 ddz-audio 结论），
 * 这里以 Web Audio 实时合成等效音色：号角/金铁/战鼓，保持史诗战歌听感。
 * 全部惰性创建，符合浏览器自动播放策略。
 *
 * 触发点与《游戏资源分析》第 5 节一一对应。
 */

export default class WgjxAudio {
  constructor() {
    this.ctx = null
    this.enabled = true
    this.noiseBuffer = null
    this.bgmNodes = null
  }

  /**
   * 确保 AudioContext 已创建并处于运行态
   * @returns {Object|null} AudioContext
   */
  ensure() {
    if (typeof window === 'undefined') {
      return null
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) {
      return null
    }
    if (!this.ctx) {
      this.ctx = new Ctx()
      this.noiseBuffer = this.makeNoise(1.4)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  /**
   * 生成白噪声缓冲
   * @param {number} seconds 时长（秒）
   * @returns {Object|null} AudioBuffer
   */
  makeNoise(seconds) {
    const ctx = this.ctx
    if (!ctx) {
      return null
    }
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i += 1) {
      data[i] = Math.random() * 2 - 1
    }
    return buf
  }

  /**
   * 播放单个音符
   * @param {number} freq 频率
   * @param {number} duration 时长（秒）
   * @param {string} type 波形
   * @param {number} gain 音量
   * @param {number} delay 延迟（秒）
   * @returns {void}
   */
  tone(freq, duration, type, gain, delay) {
    const ctx = this.ensure()
    if (!ctx || !this.enabled) {
      return
    }
    const t0 = ctx.currentTime + (delay || 0)
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = type || 'triangle'
    osc.frequency.setValueAtTime(freq, t0)
    amp.gain.setValueAtTime(0.0001, t0)
    amp.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.012)
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(amp)
    amp.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.02)
  }

  /**
   * 播放带通滤波白噪声（金铁/战鼓/人群）
   * @param {number} duration 时长（秒）
   * @param {number} freq 带通中心频率
   * @param {number} q 品质因数
   * @param {number} gain 音量
   * @param {number} delay 延迟（秒）
   * @param {number} sweepTo 频率滑向值，0 表示不滑
   * @returns {void}
   */
  noise(duration, freq, q, gain, delay, sweepTo) {
    const ctx = this.ensure()
    if (!ctx || !this.enabled || !this.noiseBuffer) {
      return
    }
    const t0 = ctx.currentTime + (delay || 0)
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(freq, t0)
    bp.Q.setValueAtTime(q || 1.2, t0)
    if (sweepTo) {
      bp.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration)
    }
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(0.0001, t0)
    amp.gain.exponentialRampToValueAtTime(gain || 0.1, t0 + 0.015)
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    src.connect(bp)
    bp.connect(amp)
    amp.connect(ctx.destination)
    src.start(t0)
    src.stop(t0 + duration + 0.05)
  }

  /** 派兵：木质叩击 + 短促号角 */
  send() {
    this.tone(680, 0.06, 'square', 0.04)
    this.noise(0.05, 2400, 1.6, 0.05)
    this.tone(440, 0.12, 'sawtooth', 0.05, 0.02)
  }

  /** 得分：明亮上行五声 */
  score() {
    ;[523, 659, 784, 1047].forEach((f, i) => {
      this.tone(f, 0.16, 'triangle', 0.07, i * 0.06)
    })
  }

  /** 击败敌军：低频冲击 + 噪声爆发 */
  hit() {
    this.tone(120, 0.22, 'sawtooth', 0.12)
    this.noise(0.26, 900, 0.8, 0.16, 0, 200)
    this.noise(0.18, 4200, 1.4, 0.06, 0.02, 2200)
  }

  /** 集结：三段递进号角 */
  rally() {
    for (let i = 0; i < 3; i += 1) {
      const d = i * 0.16
      this.tone(330 + i * 60, 0.26, 'sawtooth', 0.09 + i * 0.02, d)
      this.noise(0.3, 700 + i * 400, 0.9, 0.12 + i * 0.03, d, 200)
    }
  }

  /** 胜利：大调琶音 + 金币声 */
  win() {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone(f, 0.22, 'triangle', 0.075, i * 0.1)
    })
    this.tone(1568, 0.5, 'sine', 0.06, 0.52)
    this.noise(0.18, 7000, 2, 0.05, 0.6, 5200)
  }

  /** 失败：下行小调 */
  lose() {
    ;[440, 392, 330, 262, 220].forEach((f, i) => {
      this.tone(f, 0.26, 'sine', 0.07, i * 0.14)
    })
    this.tone(147, 0.6, 'sine', 0.05, 0.62)
  }

  /** 倒计时滴答 */
  tick() {
    this.tone(1500, 0.03, 'square', 0.035)
  }

  /**
   * 循环 BGM：低频铜管 + 弦乐 pad 的和声层，缓入
   * @returns {void}
   */
  startBgm() {
    const ctx = this.ensure()
    if (!ctx || !this.enabled || this.bgmNodes) {
      return
    }
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, ctx.currentTime)
    master.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 1.5)
    master.connect(ctx.destination)
    // 持续和弦：根音 + 五度 + 八度
    const freqs = [110, 164.81, 220]
    const oscs = freqs.map((f) => {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 600
      const g = ctx.createGain()
      g.gain.value = 0.6
      o.connect(lp)
      lp.connect(g)
      g.connect(master)
      o.start()
      return o
    })
    // 缓慢起伏的 pad（LFO 调制音量）
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.15
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.02
    lfo.connect(lfoGain)
    lfoGain.connect(master.gain)
    lfo.start()
    this.bgmNodes = { master, oscs, lfo }
  }

  /**
   * 停止 BGM，缓出
   * @returns {void}
   */
  stopBgm() {
    const ctx = this.ctx
    if (!ctx || !this.bgmNodes) {
      return
    }
    const { master, oscs, lfo } = this.bgmNodes
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
    setTimeout(() => {
      oscs.forEach((o) => o.stop())
      lfo.stop()
    }, 900)
    this.bgmNodes = null
  }
}

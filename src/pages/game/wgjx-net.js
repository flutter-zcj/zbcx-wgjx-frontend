/**
 * @file 万国觉醒·统帅远征 v2.0 WebSocket 客户端。
 *
 * 协议：一行一条 JSON，形如 {"cmd":"x","data":{...}}（与 ddz-net 同源）。
 * 指令集：
 *   login         {nickname, playerId}                        -> {playerId, best, profile, season}
 *   submitScore   {playerId, nickname, score, win,
 *                  civilization, commander, age}              -> {rank, list, season, best}
 *   getLeaderboard{season}                                    -> {list, season}
 *   saveProfile   {playerId, profile}                         -> {ok, season}
 *   loadProfile   {playerId}                                  -> {profile, season}
 *
 * 连接不可达时自动降级到 localStorage（含赛季档案），保证小游戏独立可玩。
 */

const LB_KEY = 'wgjx_leaderboard'
const SAVE_KEY = 'wgjx_save'
const PROFILE_KEY = 'wgjx_profile'
const PID_KEY = 'wgjx_pid'

/**
 * 本地赛季标识（与后端 ISO 周口径一致）
 * @returns {string} 形如 S2026-W45
 */
export function localSeason() {
  const d = new Date()
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7)
  return 'S' + target.getUTCFullYear() + '-W' + String(week).padStart(2, '0')
}

export default class WgjxNet {
  /**
   * @param {string} url WebSocket 地址；为空则离线模式
   */
  constructor(url) {
    this.url = url || ''
    this.ws = null
    this.handlers = {}
    this.queue = []
    this.connected = false
    this.retry = 0
    this.offline = !url
    this.playerId = this.readPid()
    this.season = localSeason()
  }

  /** 读取/生成稳定的本地玩家 ID */
  readPid() {
    try {
      let pid = localStorage.getItem(PID_KEY)
      if (!pid) {
        pid = 'L' + Math.floor(Math.random() * 9000000 + 1000000)
        localStorage.setItem(PID_KEY, pid)
      }
      return pid
    } catch (e) {
      return 'L' + Math.floor(Math.random() * 9000000 + 1000000)
    }
  }

  /**
   * 注册消息处理器
   * @param {string} cmd 指令
   * @param {Function} fn 回调
   * @returns {WgjxNet} 链式
   */
  on(cmd, fn) {
    this.handlers[cmd] = fn
    return this
  }

  /**
   * 建立连接（离线模式直接 resolve）
   * @returns {Promise<void>}
   */
  connect() {
    if (this.offline) {
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      let ws
      try {
        ws = new WebSocket(this.url)
      } catch (err) {
        this.offline = true
        return resolve()
      }
      this.ws = ws
      ws.onopen = () => {
        this.connected = true
        this.retry = 0
        this.queue.splice(0).forEach((line) => ws.send(line))
        resolve()
      }
      ws.onmessage = (evt) => this.handleMessage(evt.data)
      ws.onclose = () => {
        this.connected = false
        this.scheduleReconnect()
      }
      ws.onerror = () => {
        this.offline = true
        resolve()
      }
    })
  }

  /** 断线指数退避重连，最多 6 次 */
  scheduleReconnect() {
    if (this.retry >= 6) {
      this.offline = true
      return
    }
    this.retry += 1
    setTimeout(() => {
      this.connect().catch(() => {})
    }, Math.min(1000 * this.retry, 5000))
  }

  /**
   * 解析下行消息
   * @param {string|Blob} raw 原始消息
   */
  async handleMessage(raw) {
    let text = raw
    if (raw instanceof Blob) {
      text = await raw.text()
    }
    if (typeof text !== 'string') {
      return
    }
    text.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed) {
        return
      }
      let msg = null
      try {
        msg = JSON.parse(trimmed)
      } catch (err) {
        return
      }
      if (msg.data && msg.data.season) {
        this.season = msg.data.season
      }
      if (msg.data && msg.data.playerId) {
        this.playerId = msg.data.playerId
        try {
          localStorage.setItem(PID_KEY, this.playerId)
        } catch (e) {
          /* 忽略隐私模式写入失败 */
        }
      }
      const fn = this.handlers[msg.cmd]
      if (fn) {
        fn(msg.data)
      }
    })
  }

  /**
   * 发送指令
   * @param {string} cmd 指令
   * @param {Object} data 载荷
   */
  send(cmd, data = {}) {
    if (this.offline) {
      this.localHandle(cmd, data)
      return
    }
    const line = JSON.stringify({ cmd, data }) + '\n'
    if (this.connected && this.ws && this.ws.readyState === 1) {
      this.ws.send(line)
    } else {
      this.queue.push(line)
    }
  }

  /**
   * 离线降级
   * @param {string} cmd 指令
   * @param {Object} data 载荷
   */
  localHandle(cmd, data) {
    const fn = this.handlers[cmd]
    if (cmd === 'login') {
      const profile = this.localProfile()
      if (fn) fn({ playerId: this.playerId, best: profile.best || 0, profile, season: this.season })
    } else if (cmd === 'submitScore') {
      const res = this.localSubmit(data)
      if (fn) fn(res)
    } else if (cmd === 'getLeaderboard') {
      if (fn) fn({ list: this.localBoard(), season: this.season })
    } else if (cmd === 'saveProfile') {
      this.writeProfile(data.profile)
      if (fn) fn({ ok: true, season: this.season })
    } else if (cmd === 'loadProfile') {
      if (fn) fn({ profile: this.localProfile(), season: this.season })
    } else if (cmd === 'save') {
      if (fn) fn({})
    } else if (cmd === 'load') {
      if (fn) fn({ progress: this.localLoad() })
    }
  }

  /**
   * 主动释放连接：标记离线，阻止重连，并关闭底层 socket
   * @returns {void}
   */
  dispose() {
    this.offline = true
    this.handlers = {}
    if (this.ws) {
      try {
        this.ws.close()
      } catch (e) {
        /* 忽略关闭异常 */
      }
      this.ws = null
    }
  }

  /** 本地排行榜（仅当前赛季） */
  localBoard() {
    try {
      const all = JSON.parse(localStorage.getItem(LB_KEY) || '[]')
      return all.filter((r) => !r.season || r.season === this.season).slice(0, 20)
    } catch (e) {
      return []
    }
  }

  /** 本地档案 */
  localProfile() {
    try {
      const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
      return Object.assign(
        { civilization: 'china', commander: 'sun', age: 5, gems: 0, matches: 0, wins: 0, best: 0 },
        p
      )
    } catch (e) {
      return { civilization: 'china', commander: 'sun', age: 5, gems: 0, matches: 0, wins: 0, best: 0 }
    }
  }

  /**
   * 写入本地档案
   * @param {Object} profile 档案
   */
  writeProfile(profile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {}))
    } catch (e) {
      /* 忽略 */
    }
  }

  /**
   * 本地提交成绩
   * @param {Object} data {nickname, score, civilization, commander, age}
   * @returns {{rank:number, list:Array, season:string, best:number}} 结果
   */
  localSubmit(data) {
    let all = []
    try {
      all = JSON.parse(localStorage.getItem(LB_KEY) || '[]')
    } catch (e) {
      all = []
    }
    const entry = {
      playerId: this.playerId,
      nickname: data.nickname || '执政官',
      score: data.score || 0,
      civilization: data.civilization || 'china',
      commander: data.commander || 'sun',
      age: data.age || 5,
      season: this.season,
      ts: Date.now()
    }
    all.push(entry)
    all = all.filter((r) => !r.season || r.season === this.season)
    all.sort((a, b) => (b.score || 0) - (a.score || 0) || (a.ts || 0) - (b.ts || 0))
    all = all.slice(0, 20)
    try {
      localStorage.setItem(LB_KEY, JSON.stringify(all))
    } catch (e) {
      /* 忽略 */
    }
    const profile = this.localProfile()
    profile.best = Math.max(profile.best || 0, entry.score)
    profile.matches = (profile.matches || 0) + 1
    profile.gems = (profile.gems || 0) + (entry.score >= 1800 ? 40 : entry.score >= 900 ? 15 : 5)
    this.writeProfile(profile)
    return { rank: all.findIndex((r) => r.ts === entry.ts) + 1, list: all, season: this.season, best: profile.best }
  }

  /** 本地存档 */
  localLoad() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')
    } catch (e) {
      return {}
    }
  }

  /**
   * 提交成绩并拉榜（超时 1.5s 降级本地）
   * @param {Object} payload {nickname, score, win, civilization, commander, age}
   * @returns {Promise<{rank:number, list:Array, season:string}>} 名次与榜单
   */
  submit(payload) {
    if (this.offline) {
      return Promise.resolve(this.localSubmit(payload))
    }
    return new Promise((resolve) => {
      let done = false
      const finish = (p) => {
        if (done) {
          return
        }
        done = true
        resolve(p)
      }
      const timer = setTimeout(() => {
        finish(this.localSubmit(payload))
      }, 1500)
      const prev = this.handlers.submitScore
      this.handlers.submitScore = (data) => {
        if (prev) {
          prev(data)
        }
        clearTimeout(timer)
        finish({ rank: (data && data.rank) || 0, list: (data && data.list) || [], season: (data && data.season) || this.season })
      }
      this.send('submitScore', Object.assign({ playerId: this.playerId }, payload))
    })
  }

  /**
   * 保存档案到服务端（离线时写本地）
   * @param {Object} profile 档案
   * @returns {Promise<void>}
   */
  saveProfile(profile) {
    this.writeProfile(profile)
    this.send('saveProfile', { playerId: this.playerId, profile })
    return Promise.resolve()
  }

  /** 主动拉取排行榜 */
  refreshBoard() {
    this.send('getLeaderboard', { season: this.season })
  }
}

/**
 * @file 万国觉醒·统帅远征 WebSocket 客户端。
 * 与后端约定：每条消息为一行 JSON，形如 {"cmd":"x","data":{...}}（同 ddz-net）。
 * 后端为 cherry（Go Actor 框架）暴露的 WebSocket 端点。
 * 若 WebSocket 不可达，自动降级到 localStorage，保证小游戏独立可玩。
 *
 * 指令集：
 *  - login        {nickname}            -> {playerId, best}
 *  - submitScore  {playerId, score, win}-> {rank}
 *  - getLeaderboard {}                  -> {list:[{nickname, score}]}
 *  - save         {playerId, progress}  -> {}
 *  - load         {playerId}            -> {progress}
 */

const LB_KEY = 'wgjx_leaderboard'
const SAVE_KEY = 'wgjx_save'

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
    this.playerId = 'local-' + Math.floor(Math.random() * 9000 + 1000)
  }

  /**
   * 注册消息处理器
   * @param {string} cmd 指令名
   * @param {Function} fn 回调，入参为 data
   * @returns {WgjxNet} 支持链式调用
   */
  on(cmd, fn) {
    this.handlers[cmd] = fn
    return this
  }

  /**
   * 建立连接（离线模式直接 resolve）
   * @returns {Promise<void>} 连接成功后 resolve
   */
  connect() {
    if (this.offline) {
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
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

  /**
   * 断线后按指数退避重连，最多 6 次，失败则转离线
   */
  scheduleReconnect() {
    if (this.retry >= 6) {
      this.offline = true
      return
    }
    this.retry += 1
    const delay = Math.min(1000 * this.retry, 5000)
    setTimeout(() => {
      this.connect().catch(() => {})
    }, delay)
  }

  /**
   * 解析下行消息并派发
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
      const fn = this.handlers[msg.cmd]
      if (fn) {
        fn(msg.data)
      }
    })
  }

  /**
   * 发送指令
   * @param {string} cmd 指令名
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
   * 离线降级：本地处理排行榜与存档
   * @param {string} cmd 指令名
   * @param {Object} data 载荷
   */
  localHandle(cmd, data) {
    if (cmd === 'login') {
      const best = this.localBest()
      const fn = this.handlers.login
      if (fn) fn({ playerId: this.playerId, best })
    } else if (cmd === 'submitScore') {
      const rank = this.localSubmit(data.nickname, data.score)
      const fn = this.handlers.submitScore
      if (fn) fn({ rank })
    } else if (cmd === 'getLeaderboard') {
      const fn = this.handlers.getLeaderboard
      if (fn) fn({ list: this.localBoard() })
    } else if (cmd === 'save') {
      const fn = this.handlers.save
      if (fn) fn({})
    } else if (cmd === 'load') {
      const fn = this.handlers.load
      if (fn) fn({ progress: this.localLoad() })
    }
  }

  /** @returns {Array} 本地排行榜 */
  localBoard() {
    try {
      return JSON.parse(localStorage.getItem(LB_KEY) || '[]')
    } catch (e) {
      return []
    }
  }

  /** @returns {number} 本地最佳分 */
  localBest() {
    return this.localBoard().reduce((m, r) => Math.max(m, r.score || 0), 0)
  }

  /**
   * 本地提交分数并排序
   * @param {string} nickname 昵称
   * @param {number} score 分数
   * @returns {number} 名次（1 起）
   */
  localSubmit(nickname, score) {
    const list = this.localBoard()
    list.push({ nickname: nickname || '执政官', score: score || 0, ts: Date.now() })
    list.sort((a, b) => b.score - a.score)
    const top = list.slice(0, 10)
    localStorage.setItem(LB_KEY, JSON.stringify(top))
    return top.findIndex((r) => r.score === score && r.nickname === (nickname || '执政官')) + 1
  }

  /** @returns {Object} 本地存档 */
  localLoad() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')
    } catch (e) {
      return {}
    }
  }

  /**
   * 本地保存进度
   * @param {Object} progress 进度对象
   */
  localSave(progress) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress || {}))
  }

  /**
   * 提交分数并拉取排行榜（单回合：后端 submitScore 应回 {rank, list}）。
   * 离线或后端超时（1.5s）时降级到本地排行榜，保证结算面板始终有数据。
   * @param {string} nickname 昵称
   * @param {number} score 分数
   * @param {boolean} win 是否胜利
   * @returns {Promise<{rank:number, list:Array}>} 名次与榜单
   */
  submit(nickname, score, win) {
    if (this.offline) {
      const rank = this.localSubmit(nickname, score)
      return Promise.resolve({ rank, list: this.localBoard() })
    }
    return new Promise((resolve) => {
      const settled = { done: false }
      const finish = (payload) => {
        if (settled.done) {
          return
        }
        settled.done = true
        resolve(payload)
      }
      const timer = setTimeout(() => {
        const rank = this.localSubmit(nickname, score)
        finish({ rank, list: this.localBoard() })
      }, 1500)
      const prev = this.handlers.submitScore
      this.handlers.submitScore = (data) => {
        if (prev) {
          prev(data)
        }
        clearTimeout(timer)
        finish({ rank: (data && data.rank) || 0, list: (data && data.list) || [] })
      }
      this.send('submitScore', { nickname, score, win })
    })
  }
}

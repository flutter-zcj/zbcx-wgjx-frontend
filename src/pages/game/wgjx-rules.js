/**
 * @file 万国觉醒·统帅远征 v2.0 规则数据层。
 *
 * 全部字段均来自 rea 对原著 APK 的证据重构（见 wgjx-analysis/game-rule-ui）：
 *  - 文明：BGM 文明主题 8 族（china / britain / byzantine / france / germany / greece / arab / egypt）
 *  - 统帅：语音与技能音效出现的 Caesar / CaoCao / SunTzu
 *  - 玩法：UI_5V5_HolyCart_*、UI_5V5_Flag_*、TUTOR_BARBARIANFORT、
 *          TUTOR_ENTER_NEW_AGE、TUTOR_WHAT_IS_POWER
 *  - 音效：AudioConfig 中 TUTOR_、UI_、bgm_ 前缀命名对应到具体交互
 *
 * 本文件只放「不可变规则」，表现层在 wgjx-theme.js、编排层在 wgjx-game.js。
 * 后端 Go 侧在 store.go 中维护同构的文明/赛季枚举，字段名保持一致。
 */

/** 单局时长（秒） */
export const MATCH_TIME = 90

/** 主城基础耐久 */
export const CASTLE_HP = 120

/** 旗帜耐久（每次派兵扣 TROOPS[type].dmg） */
export const FLAG_HP = 60

/** 野蛮人营地基础耐久（随等级提升） */
export const CAMP_HP = 90

/** 胜利分数线（未击破主城时按分数判定） */
export const TARGET_SCORE = 1500

/** 圣物车抵达终点的奖励分 */
export const CART_REWARD = 300

/** 圣物车基础推进速度（进度/秒，0→1 即抵达圣坛） */
export const CART_SPEED = 0.0105

/** 圣物车控制判定半径 */
export const CART_RANGE = 150

/** 己方部队进入该半径即视为「护送/控制」 */
export const ESCORT_RANGE = 90

/** 资源初始值与产出 */
export const RESOURCE = {
  food: { key: 'food', label: '粮', start: 220, max: 400, regen: 9 },
  wood: { key: 'wood', label: '木', start: 120, max: 400, regen: 3 },
  stone: { key: 'stone', label: '石', start: 100, max: 400, regen: 2 },
  gold: { key: 'gold', label: '金', start: 120, max: 400, regen: 2.5 },
  gem: { key: 'gem', label: '宝石', start: 0, max: 999, regen: 0 }
}

/**
 * 兵种表。
 * speed  px/s（1280×720 战场，横穿约 6~9 秒）
 * dmg    对建筑/单位的单次伤害
 * hp     单位生命
 * cost   出兵粮耗
 * beats  克制的兵种（伤害 ×1.5）
 */
export const TROOPS = {
  infantry: {
    key: 'infantry',
    label: '步兵',
    short: '步',
    color: 0xe8c25a,
    speed: 108,
    dmg: 15,
    hp: 110,
    cost: 12,
    beats: 'archer',
    desc: '盾墙推进，克制弓兵'
  },
  cavalry: {
    key: 'cavalry',
    label: '骑兵',
    short: '骑',
    color: 0x5aa05a,
    speed: 158,
    dmg: 17,
    hp: 90,
    cost: 16,
    beats: 'infantry',
    desc: '冲锋迂回，克制步兵'
  },
  archer: {
    key: 'archer',
    label: '弓兵',
    short: '弓',
    color: 0x4f8fc0,
    speed: 124,
    dmg: 13,
    hp: 80,
    cost: 10,
    beats: 'cavalry',
    desc: '远程齐射，克制骑兵'
  }
}

/** 兵种顺序（UI 三按钮） */
export const TROOP_ORDER = ['infantry', 'cavalry', 'archer']

/**
 * 克制系数
 * @param {string} atk 攻击方兵种
 * @param {string} def 防御方兵种
 * @returns {number} 伤害倍率
 */
export function counterRate(atk, def) {
  if (!atk || !def) {
    return 1
  }
  if (TROOPS[atk] && TROOPS[atk].beats === def) {
    return 1.5
  }
  if (TROOPS[def] && TROOPS[def].beats === atk) {
    return 0.7
  }
  return 1
}

/**
 * 八大文明。
 * bonus 中的字段由战斗场景解释，避免在数据层散落 if-else：
 *  score     最终得分倍率
 *  troopDmg  指定兵种伤害倍率（键为兵种 key）
 *  troopSpd  指定兵种速度倍率
 *  foodCost  出兵粮耗倍率
 *  foodRegen 粮产倍率
 *  castleHp  主城耐久加成（绝对值）
 *  cd        技能冷却倍率
 *  loot      讨伐资源倍率
 *  rally     统帅值获取倍率
 */
export const CIVS = [
  {
    key: 'china',
    name: '中国',
    emblem: '中',
    color: 0xc0392b,
    accent: 0xf0c060,
    title: '天朝上国',
    bonus: { score: 1.1, foodCost: 0.85 },
    desc: '得分 +10% · 出兵粮耗 -15%',
    commander: 'sun'
  },
  {
    key: 'britain',
    name: '不列颠',
    emblem: '英',
    color: 0x2f5d8a,
    accent: 0xd8e4f0,
    title: '长弓之国',
    bonus: { troopDmg: { archer: 1.25 } },
    desc: '弓兵伤害 +25%',
    commander: 'sun'
  },
  {
    key: 'byzantine',
    name: '拜占庭',
    emblem: '拜',
    color: 0x6b3f8a,
    accent: 0xe8c25a,
    title: '紫衣贵族',
    bonus: { troopSpd: { cavalry: 1.2 }, castleHp: 15 },
    desc: '骑兵速度 +20% · 主城耐久 +15',
    commander: 'caesar'
  },
  {
    key: 'france',
    name: '法兰克',
    emblem: '法',
    color: 0x234f8a,
    accent: 0xf0d27a,
    title: '骑士之花',
    bonus: { troopDmg: { cavalry: 1.2 } },
    desc: '骑兵伤害 +20%',
    commander: 'caesar'
  },
  {
    key: 'germany',
    name: '德意志',
    emblem: '德',
    color: 0x4a4f56,
    accent: 0xd8d8d8,
    title: '铁血军团',
    bonus: { troopSpd: { infantry: 1.12, cavalry: 1.12, archer: 1.12 }, foodRegen: 1.2 },
    desc: '全军移速 +12% · 粮产 +20%',
    commander: 'caesar'
  },
  {
    key: 'greece',
    name: '希腊',
    emblem: '希',
    color: 0x2b7a78,
    accent: 0xf5efe0,
    title: '城邦之光',
    bonus: { cd: 0.75 },
    desc: '统帅技能冷却 -25%',
    commander: 'sun'
  },
  {
    key: 'arab',
    name: '阿拉伯',
    emblem: '阿',
    color: 0x8a6a2f,
    accent: 0xf0e0b0,
    title: '沙漠商路',
    bonus: { loot: 1.2, troopDmg: { cavalry: 1.1 } },
    desc: '讨伐资源 +20% · 骑兵伤害 +10%',
    commander: 'cao'
  },
  {
    key: 'egypt',
    name: '埃及',
    emblem: '埃',
    color: 0x9a6b1e,
    accent: 0x7fd4c1,
    title: '尼罗河畔',
    bonus: { loot: 1.3, rally: 1.2 },
    desc: '讨伐资源 +30% · 统帅值 +20%',
    commander: 'cao'
  }
]

/**
 * 统帅（原著语音/技能音效明确出现的三位）。
 * skill.type 由场景执行：
 *  charge  全军加速 + 范围伤害
 *  aegis   主城护盾 + 全军减伤 + 召唤步兵
 *  fire    全场伤害 + 旗帜灼烧
 */
export const COMMANDERS = [
  {
    key: 'cao',
    name: '曹操',
    title: '虎豹骑',
    emblem: '曹',
    color: 0x8a2f2f,
    skill: {
      key: 'charge',
      name: '虎豹突袭',
      cd: 22,
      duration: 5000,
      text: '全军移速 +80%，并对 220 范围内敌军造成 40 伤害'
    },
    passive: { troopDmg: { cavalry: 1.15 } },
    passiveText: '骑兵伤害 +15%'
  },
  {
    key: 'caesar',
    name: '凯撒',
    title: '罗马军团',
    emblem: '凯',
    color: 0xb8860b,
    skill: {
      key: 'aegis',
      name: '军团壁垒',
      cd: 24,
      duration: 8000,
      text: '主城免伤 8 秒，全军减伤 50%，并召唤 2 名步兵'
    },
    passive: { troopDmg: { infantry: 1.15 }, castleHp: 20 },
    passiveText: '步兵伤害 +15% · 主城耐久 +20'
  },
  {
    key: 'sun',
    name: '孙武',
    title: '兵家至圣',
    emblem: '孙',
    color: 0x2f6b4a,
    skill: {
      key: 'fire',
      name: '火攻',
      cd: 20,
      duration: 5000,
      text: '全场敌军受到 50 伤害，旗帜区灼烧 5 秒'
    },
    passive: { troopDmg: { archer: 1.15 }, cd: 0.85 },
    passiveText: '弓兵伤害 +15% · 技能冷却 -15%'
  }
]

/** 时代阶梯（市政厅 5→9，对应 TUTOR_TOWNHALL_5~9 / TUTOR_ENTER_NEW_AGE） */
export const AGES = [
  { age: 5, roman: 'V', need: 0, label: '城邦时代' },
  { age: 6, roman: 'VI', need: 500, label: '王国时代' },
  { age: 7, roman: 'VII', need: 1200, label: '帝国时代' },
  { age: 8, roman: 'VIII', need: 2100, label: '盛世时代' },
  { age: 9, roman: 'IX', need: 3200, label: '王权时代' }
]

/**
 * 按分数推导当前时代
 * @param {number} score 当前得分
 * @returns {Object} 时代条目
 */
export function ageOf(score) {
  let cur = AGES[0]
  for (let i = 0; i < AGES.length; i += 1) {
    if (score >= AGES[i].need) {
      cur = AGES[i]
    }
  }
  return cur
}

/**
 * 时代进度（用于结算面板进度条）
 * @param {number} score 得分
 * @returns {{ratio:number, next:Object|null}} 进度与下一时代
 */
export function ageProgress(score) {
  const cur = ageOf(score)
  const idx = AGES.findIndex((a) => a.age === cur.age)
  const next = AGES[idx + 1] || null
  if (!next) {
    return { ratio: 1, next: null }
  }
  const span = next.need - cur.need
  return { ratio: Math.max(0, Math.min(1, (score - cur.need) / span)), next }
}

/**
 * 品质判定（对应 UI_..._Gacha_Blue / Purple / Golden 的色阶）
 * @param {number} score 得分
 * @returns {{key:string, name:string, color:number}} 品质
 */
export function qualityOf(score) {
  if (score >= 1800) {
    return { key: 'gold', name: '传说', color: 0xffd45e }
  }
  if (score >= 900) {
    return { key: 'purple', name: '史诗', color: 0xa87ad8 }
  }
  return { key: 'blue', name: '精良', color: 0x4f8fc0 }
}

/** 本地档案默认值（与后端 Profile 同构） */
export function defaultProfile() {
  return {
    civilization: 'china',
    commander: 'sun',
    age: 5,
    gems: 0,
    matches: 0,
    best: 0,
    wins: 0
  }
}

/**
 * 取文明条目
 * @param {string} key 文明 key
 * @returns {Object} 文明
 */
export function civOf(key) {
  return CIVS.find((c) => c.key === key) || CIVS[0]
}

/**
 * 取统帅条目
 * @param {string} key 统帅 key
 * @returns {Object} 统帅
 */
export function commanderOf(key) {
  return COMMANDERS.find((c) => c.key === key) || COMMANDERS[0]
}

/**
 * 汇总「文明 + 统帅」的被动加成，供场景直接查表
 * @param {string} civKey 文明
 * @param {string} cmdKey 统帅
 * @returns {Object} 合并后的加成
 */
export function mergeBonus(civKey, cmdKey) {
  const civ = civOf(civKey)
  const cmd = commanderOf(cmdKey)
  const out = {
    score: 1,
    foodCost: 1,
    foodRegen: 1,
    loot: 1,
    rally: 1,
    cd: 1,
    castleHp: 0,
    troopDmg: { infantry: 1, cavalry: 1, archer: 1 },
    troopSpd: { infantry: 1, cavalry: 1, archer: 1 }
  }
  const apply = (b) => {
    if (!b) {
      return
    }
    if (b.score) out.score *= b.score
    if (b.foodCost) out.foodCost *= b.foodCost
    if (b.foodRegen) out.foodRegen *= b.foodRegen
    if (b.loot) out.loot *= b.loot
    if (b.rally) out.rally *= b.rally
    if (b.cd) out.cd *= b.cd
    if (b.castleHp) out.castleHp += b.castleHp
    if (b.troopDmg) {
      Object.keys(b.troopDmg).forEach((k) => {
        out.troopDmg[k] *= b.troopDmg[k]
      })
    }
    if (b.troopSpd) {
      Object.keys(b.troopSpd).forEach((k) => {
        out.troopSpd[k] *= b.troopSpd[k]
      })
    }
  }
  apply(civ.bonus)
  apply(cmd.passive)
  return out
}

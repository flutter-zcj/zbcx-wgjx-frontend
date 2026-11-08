<template>
  <view class="wgjx-page">
    <view id="wgjx-canvas" class="wgjx-canvas"></view>
    <view class="wgjx-brand">
      <image class="wgjx-brand-ico" src="/static/images/wgjx/icon.png" mode="aspectFit" />
      <text class="wgjx-brand-txt">万国觉醒 · 统帅远征</text>
      <text v-if="season" class="wgjx-season">{{ season }}</text>
    </view>
    <view v-if="tips" class="wgjx-tips">{{ tips }}</view>
    <view class="wgjx-rotate">
      <view class="rotate-icon"></view>
      <text class="rotate-txt">请将设备横屏以获得最佳体验</text>
    </view>
  </view>
</template>

<script>
/**
 * @file 万国觉醒·统帅远征 页面。
 *
 * 职责：
 *  1. 动态加载 Phaser（此前依赖 window.Phaser 但构建产物未注入，导致「引擎未加载」，
 *     这里改为运行时按序尝试 /static/game/phaser.min.js 等路径，彻底修复）；
 *  2. 初始化场景、注入音频/网络/生命周期 hooks；
 *  3. 建立同源 WebSocket（失败自动离线），同步赛季档案与排行榜。
 */

import WgjxNet from './wgjx-net.js';
import WgjxAudio from './wgjx-audio.js';
import createWgjxScene from './wgjx-game.js';

/**
 * 模块级单例：uni-app H5 在同一路由下可能同时存在两个页面实例，
 * 若不干预会创建两份 Phaser + 两条 WebSocket（重复登录/重复提交）。
 * 这里只保留最后创建的一份，旧实例在 shutdown 时不误伤新实例。
 */
let ACTIVE_GAME = null;
let ACTIVE_NET = null;
let BOOT_SEQ = 0;

export default
{
  data()
  {
    return {
      tips: '',
      season: '',
      net: null,
      audio: null,
      nickname: '执政官',
      profile: null,
      lastAge: 5,
      game: null,
      scene: null,
      booted: false,
      unmounted: false,
      phaserPromise: null
    };
  },


  beforeDestroy()
  {
    this.restorePcAdapt();
  },

  mounted()
  {
    this.unmounted = false;
    this.audio = new WgjxAudio();
    this.boot();
  },

  beforeUnmount()
  {
    this.shutdown();
  },

  methods:
  {
    /**
     * 动态加载 Phaser（构建产物未内置引擎，需运行时拉取）
     * @returns {Promise<Object|null>} Phaser 全局对象
     */
    loadPhaser()
    {
      if (typeof window === 'undefined')
      {
        return Promise.resolve(null);
      }
      if (window.Phaser)
      {
        return Promise.resolve(window.Phaser);
      }
      if (this.phaserPromise)
      {
        return this.phaserPromise;
      }
      const urls = ['/static/game/phaser.min.js', './static/game/phaser.min.js', 'static/game/phaser.min.js'];
      this.phaserPromise = new Promise((resolve) =>
      {
        const tryNext = (i) =>
        {
          if (i >= urls.length)
          {
            resolve(null);
            return;
          }
          const s = document.createElement('script');
          s.src = urls[i];
          s.async = true;
          s.onload = () => resolve(window.Phaser || null);
          s.onerror = () =>
          {
            s.remove();
            tryNext(i + 1);
          };
          document.head.appendChild(s);
        };
        tryNext(0);
      });
      return this.phaserPromise;
    },

    /**
     * 解除宿主工程的 PC 宽屏适配，避免横屏页面被装入竖屏模拟框
     * @returns {void}
     */
    clearPcAdapt()
    {
      document.body.removeAttribute('adapt');
      const el = document.querySelector('uni-adapt-pc');
      if (el)
      {
        el.style.display = 'none';
        // 关键：宿主 pc.js 会在宽屏下把「同一页面」塞进 iframe 里再跑一遍，
        // 造成第二份 Phaser 与第二条 WebSocket（重复登录）。这里直接卸载 iframe。
        const frame = el.querySelector('iframe');
        if (frame)
        {
          try { frame.src = 'about:blank'; } catch (e) { /* 忽略 */ }
        }
        el.innerHTML = '';
      }
    },

    /**
     * 离开页面时恢复 PC 宽屏适配
     * @returns {void}
     */
    restorePcAdapt()
    {
      const el = document.querySelector('uni-adapt-pc');
      if (!el)
      {
        return;
      }
      el.style.display = '';
      if (window.innerWidth >= 768)
      {
        // 还原宿主模板，保持其它页面原有的 PC 宽屏适配
        if (!el.querySelector('iframe'))
        {
          const tpl = document.querySelector('#tpl-adapt-pc');
          if (tpl)
          {
            el.innerHTML = (tpl.innerHTML || '').replace('helang-mobile-href', window.location.href);
          }
        }
        document.body.setAttribute('adapt', 'pc');
      }
    },

    /**
     * 初始化引擎、网络并注入场景 hooks
     * @returns {Promise<void>}
     */
    async boot()
    {
      if (this.booted)
      {
        return;
      }
      this.booted = true;
      this.bootSeq = ++BOOT_SEQ;
      const Phaser = await this.loadPhaser();
      // 路由切换时 uni-app 可能瞬时创建又销毁页面实例，等一帧再判断，
      // 避免为已销毁的实例创建 Phaser/WebSocket（否则会重复登录）。
      await new Promise((r) => setTimeout(r, 150));
      if (this.unmounted)
      {
        return;
      }
      if (!Phaser)
      {
        this.tips = '游戏引擎加载失败，请刷新重试';
        return;
      }
      this.clearPcAdapt();
      this.nickname = this.resolveNickname();
      this.net = new WgjxNet(this.resolveUrl());
      this.profile = this.net.localProfile();
      this.season = this.net.season;

      await this.$nextTick();
      // 同一路由下若有更新的实例在启动，本实例主动让位，避免双份引擎/双条连接
      if (this.unmounted || this.bootSeq !== BOOT_SEQ)
      {
        return;
      }
      {
        const SceneClass = createWgjxScene(Phaser, {
          profile: this.profile,
          onReady: (scene) =>
          {
            this.scene = scene;
            if (typeof window !== 'undefined')
            {
              window.__wgjxScene = scene;
            }
          },
          onSelect: () =>
          {
            if (this.audio) this.audio.pick();
          },
          onStart: () =>
          {
            this.lastAge = 5;
            if (this.audio) this.audio.startBgm();
          },
          onSend: () =>
          {
            if (this.audio) this.audio.send();
          },
          onFlag: () =>
          {
            if (this.audio) this.audio.flag();
          },
          onCart: () =>
          {
            if (this.audio) this.audio.cart();
          },
          onSkill: () =>
          {
            if (this.audio) this.audio.skill();
          },
          onRepair: () =>
          {
            if (this.audio) this.audio.repair();
          },
          onScore: () =>
          {
            if (this.audio) this.audio.score();
          },
          onHit: () =>
          {
            if (this.audio) this.audio.hit();
          },
          onRally: () =>
          {
            if (this.audio) this.audio.rally();
          },
          onAge: () =>
          {
            if (this.audio) this.audio.age();
          },
          onWin: () =>
          {
            if (this.audio) this.audio.win();
          },
          onLose: () =>
          {
            if (this.audio) this.audio.lose();
          },
          onTick: () =>
          {
            if (this.audio) this.audio.tick();
          },
          onAction: (key) =>
          {
            if (key === 'quit')
            {
              this.goBack();
            }
          },
          onHud: (state) =>
          {
            // 仅在时代真正提升时提示，避免每次 HUD 同步都弹
            if (state && state.age && state.age > this.lastAge)
            {
              this.lastAge = state.age;
              this.tips = '时代 ' + state.age + ' · ' + state.civ;
              setTimeout(() => { this.tips = ''; }, 1400);
            }
          },
          onSaveProfile: (profile) =>
          {
            this.profile = profile;
            if (this.net)
            {
              this.net.saveProfile(profile);
            }
          },
          onGameOver: ({ score, win, civilization, commander, age }) =>
          {
            if (!this.net)
            {
              return Promise.resolve({ rank: 0, list: [] });
            }
            return this.net.submit({
              nickname: this.nickname,
              score,
              win,
              civilization,
              commander,
              age
            }).then((res) =>
            {
              if (res && res.season)
              {
                this.season = res.season;
              }
              return res;
            });
          }
        });
        // 清理同路由下残留的旧实例（若有）
        if (ACTIVE_GAME)
        {
          try { ACTIVE_GAME.destroy(true); } catch (e) { /* 忽略重复销毁 */ }
          ACTIVE_GAME = null;
        }
        if (ACTIVE_NET)
        {
          try { if (ACTIVE_NET.ws) ACTIVE_NET.ws.close(); } catch (e) { /* 忽略关闭失败 */ }
          ACTIVE_NET = null;
        }
        this.game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: 'wgjx-canvas',
          width: 1280,
          height: 720,
          backgroundColor: '#1e150c',
          scale:
          {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
          },
          scene: [SceneClass]
        });
        ACTIVE_GAME = this.game;
        ACTIVE_NET = this.net;
        this.connect();
      }
    },

    /**
     * 建立 WebSocket、登录并同步赛季档案
     * @returns {void}
     */
    connect()
    {
      const net = this.net;
      net.on('login', (data) =>
      {
        if (!data)
        {
          return;
        }
        if (data.season)
        {
          this.season = data.season;
        }
        if (data.profile)
        {
          const serverMatches = data.profile.matches || 0;
          const localMatches = (this.profile && this.profile.matches) || 0;
          if (serverMatches > localMatches)
          {
            this.profile = data.profile;
            if (this.scene)
            {
              this.scene.applyProfile(data.profile);
            }
          }
        }
        if (data.best)
        {
          this.tips = '历史最佳 ' + data.best;
          setTimeout(() => { this.tips = ''; }, 1600);
        }
      });
      net.connect().then(() =>
      {
        net.send('login', { nickname: this.nickname, playerId: net.playerId });
      }).catch(() =>
      {
        this.tips = '服务器未连接，已切换离线模式';
        setTimeout(() => { this.tips = ''; }, 1600);
      });
    },

    /**
     * 读取/生成玩家昵称与 UID（持久化到本地）
     * @returns {string} 昵称
     */
    resolveNickname()
    {
      let name = uni.getStorageSync('wgjx_nickname');
      let uid = uni.getStorageSync('wgjx_uid');
      if (!uid)
      {
        uid = 'WG' + Math.floor(Math.random() * 900000 + 100000);
        uni.setStorageSync('wgjx_uid', uid);
      }
      if (!name)
      {
        name = '执政官' + uid.slice(-4);
        uni.setStorageSync('wgjx_nickname', name);
      }
      return name;
    },

    /**
     * 按当前页面地址推导 WebSocket 地址（后端同源托管，WS 端点 /wgjx-ws）
     * 关键：必须把页面查询串（含分享链接的 ?sharecode=）附到 WS 地址，
     * 否则网关会对无 sharecode 的 WS 升级返回 403，真实用户会落到离线模式。
     * @returns {string} WebSocket 地址
     */
    resolveUrl()
    {
      if (typeof window === 'undefined')
      {
        return 'ws://127.0.0.1:9105/wgjx-ws';
      }
      const loc = window.location;
      const qs = loc.search || '';
      if (loc.protocol === 'https:')
      {
        return 'wss://' + loc.host + '/wgjx-ws' + qs;
      }
      return 'ws://' + loc.host + '/wgjx-ws' + qs;
    },

    /**
     * 释放场景与连接
     * @returns {void}
     */
    shutdown()
    {
      this.unmounted = true;
      if (this.audio)
      {
        this.audio.stopBgm();
      }
      if (this.game && this.game === ACTIVE_GAME)
      {
        this.game.destroy(true);
        ACTIVE_GAME = null;
      }
      else if (this.game)
      {
        this.game = null;
      }
      if (this.net && this.net === ACTIVE_NET)
      {
        if (this.net.ws)
        {
          this.net.ws.close();
        }
        ACTIVE_NET = null;
      }
    },

    /**
     * 返回大厅
     * @returns {void}
     */
    goBack()
    {
      uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/game/hall' }) });
    }
  }
};
</script>

<style lang="scss" scoped>
.wgjx-page { position: absolute; top: 0; left: 0; width: 100%; height: 100vh; overflow: hidden; background: #1e150c; }
.wgjx-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.wgjx-brand { position: absolute; top: 8px; right: 8px; z-index: 5; display: flex; align-items: center; padding: 4px 10px 4px 4px; border-radius: 20px; background: rgba(20, 14, 8, 0.6); box-shadow: inset 0 0 0 1px rgba(200, 162, 75, 0.6); pointer-events: none; }
.wgjx-brand-ico { width: 22px; height: 22px; border-radius: 5px; }
.wgjx-brand-txt { margin-left: 6px; font-size: 12px; color: #ffe9a8; font-weight: bold; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }
.wgjx-season { margin-left: 6px; padding: 1px 6px; border-radius: 8px; background: rgba(200, 162, 75, 0.28); font-size: 10px; color: #ffe9a8; }
.wgjx-tips { position: absolute; bottom: 14%; left: 50%; transform: translateX(-50%); padding: 6px 16px; border-radius: 18px; background: rgba(0, 0, 0, 0.62); color: #ffe9a8; font-size: 13px; }
.wgjx-rotate { display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999; background: #1e150c; flex-direction: column; align-items: center; justify-content: center; }
.rotate-icon { width: 120rpx; height: 76rpx; border: 8rpx solid #c8a24b; border-radius: 14rpx; margin-bottom: 30rpx; animation: wgjx-turn 1.6s ease-in-out infinite; }
.rotate-txt { color: #ffe9a8; font-size: 30rpx; text-align: center; padding: 0 60rpx; }
@keyframes wgjx-turn { 0% { transform: rotate(0deg); } 50% { transform: rotate(90deg); } 100% { transform: rotate(90deg); } }
@media (orientation: portrait) { .wgjx-rotate { display: flex; } }
</style>

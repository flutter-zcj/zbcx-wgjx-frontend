<template>
  <view class="wgjx-page">
    <view id="wgjx-canvas" class="wgjx-canvas"></view>
    <view class="wgjx-brand">
      <image class="wgjx-brand-ico" src="/static/images/wgjx/icon.png" mode="aspectFit" />
      <text class="wgjx-brand-txt">万国觉醒 · 统帅远征</text>
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
 * 初始化 Phaser 场景、建立 WebSocket（不可达时自动降级 localStorage），
 * 并把场景事件灌入音效与网络，按生命周期驱动 BGM 与结算上报。
 *
 * 美术/音乐/UI 与《游戏资源分析》保持一致：鎏金史诗风、程序化图元、Web Audio 合成。
 */

import WgjxNet from './wgjx-net.js';
import WgjxAudio from './wgjx-audio.js';
import createWgjxScene from './wgjx-game.js';

export default
{
  data()
  {
    return {
      tips: '',
      net: null,
      audio: null,
      nickname: '执政官',
      game: null,
      scene: null
    };
  },


  beforeDestroy()
  {
    this.restorePcAdapt();
  },

  mounted()
  {
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
      }
    },

    /**
     * 离开页面时恢复 PC 宽屏适配
     * @returns {void}
     */
    restorePcAdapt()
    {
      const el = document.querySelector('uni-adapt-pc');
      if (el)
      {
        el.style.display = '';
      }
      if (window.innerWidth >= 768)
      {
        document.body.setAttribute('adapt', 'pc');
      }
    },

    /**
     * 初始化 Phaser 与网络，注入场景 hooks
     * @returns {void}
     */
    boot()
    {
      const Phaser = typeof window !== 'undefined' ? window.Phaser : null;
      if (!Phaser)
      {
        this.tips = '游戏引擎未加载';
        return;
      }
      this.clearPcAdapt();
      this.nickname = this.resolveNickname();
      this.$nextTick(() =>
      {
        const SceneClass = createWgjxScene(Phaser, {
          onReady: (scene) =>
          {
            this.scene = scene;
          },
          onStart: () =>
          {
            if (this.audio) this.audio.startBgm();
          },
          onSend: () =>
          {
            if (this.audio) this.audio.send();
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
          onGameOver: ({ score, win }) =>
          {
            if (!this.net)
            {
              return Promise.resolve({ rank: 0, list: [] });
            }
            return this.net.submit(this.nickname, score, win);
          }
        });
        this.game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: 'wgjx-canvas',
          width: 1280,
          height: 720,
          backgroundColor: '#2a1e12',
          scale:
          {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
          },
          scene: [SceneClass]
        });
        this.connect();
      });
    },

    /**
     * 建立 WebSocket 并登录
     * @returns {void}
     */
    connect()
    {
      const url = this.resolveUrl();
      const net = new WgjxNet(url);
      net.on('login', (data) =>
      {
        if (data && data.best)
        {
          this.tips = '历史最佳 ' + data.best;
          setTimeout(() => { this.tips = ''; }, 1600);
        }
      });
      this.net = net;
      net.connect().then(() =>
      {
        net.send('login', { nickname: this.nickname });
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
     * 按当前页面地址推导 WebSocket 地址（后端 cherry 监听 9105）
     * @returns {string} WebSocket 地址
     */
    resolveUrl()
    {
      if (typeof window === 'undefined')
      {
        return 'ws://127.0.0.1:9105';
      }
      const loc = window.location;
      if (loc.protocol === 'https:')
      {
        return 'wss://' + loc.host + '/wgjx-ws/';
      }
      return 'ws://' + loc.hostname + ':9105';
    },

    /**
     * 释放场景与连接
     * @returns {void}
     */
    shutdown()
    {
      if (this.audio)
      {
        this.audio.stopBgm();
      }
      if (this.game)
      {
        this.game.destroy(true);
        this.game = null;
      }
      if (this.net && this.net.ws)
      {
        this.net.ws.close();
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
.wgjx-page { position: absolute; top: 0; left: 0; width: 100%; height: 100vh; overflow: hidden; background: #2a1e12; }
.wgjx-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.wgjx-brand { position: absolute; top: 28rpx; right: 28rpx; z-index: 5; display: flex; align-items: center; padding: 8rpx 18rpx 8rpx 8rpx; border-radius: 44rpx; background: rgba(20, 14, 8, 0.55); box-shadow: inset 0 0 0 1px rgba(200, 162, 75, 0.6); pointer-events: none; }
.wgjx-brand-ico { width: 52rpx; height: 52rpx; border-radius: 10rpx; }
.wgjx-brand-txt { margin-left: 12rpx; font-size: 24rpx; color: #ffe9a8; font-weight: bold; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }
.wgjx-tips { position: absolute; bottom: 120rpx; left: 50%; transform: translateX(-50%); padding: 12rpx 28rpx; border-radius: 32rpx; background: rgba(0, 0, 0, 0.6); color: #ffe9a8; font-size: 26rpx; }
.wgjx-rotate { display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999; background: #2a1e12; flex-direction: column; align-items: center; justify-content: center; }
.rotate-icon { width: 120rpx; height: 76rpx; border: 8rpx solid #c8a24b; border-radius: 14rpx; margin-bottom: 30rpx; animation: wgjx-turn 1.6s ease-in-out infinite; }
.rotate-txt { color: #ffe9a8; font-size: 30rpx; text-align: center; padding: 0 60rpx; }
@keyframes wgjx-turn { 0% { transform: rotate(0deg); } 50% { transform: rotate(90deg); } 100% { transform: rotate(90deg); } }
@media (orientation: portrait) { .wgjx-rotate { display: flex; } }
</style>

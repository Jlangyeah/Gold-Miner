# ⛏️ 黄金矿工 · 经典复刻

经典 Flash 小游戏《黄金矿工》玩法的 100% 前端复刻。摆动的抓钩、越重收线越慢的手感、逐关递增的目标金额、关卡间商店道具——全部还原，且**不含任何原版受版权保护的素材**：画面为 Canvas 程序化绘制，音效为 WebAudio 实时合成。

🎮 在线试玩：**https://gold-miner-52y.pages.dev/**

## 玩法

- 点击画面 / 按 `空格` 放下钩子，钩子自动摆动、伸出、抓取、收线
- 目标物越重收线越慢：大金子值钱但拖沓，石头占绳子，钻石轻而贵
- 每关 60 秒，挖够目标金额过关，失败则进度清零
- 过关后进商店：咖啡(+时间)、力量药水(收线加速)、炸药(开局炸最大石头)为一次性；指南针(显示价值)、水晶球(预告下关目标)、幸运草(提高贵重物概率)为永久
- `M` 键开关音效；进度自动存档（localStorage）

## 技术栈

Vite + TypeScript + 原生 Canvas 2D + WebAudio，零运行时依赖，构建产物 gzip 后约 8KB。

## 项目结构

```
src/
├── main.ts              # 入口：固定步长(1/60s)游戏循环 + 输入绑定
├── style.css            # 页面与商店/菜单 DOM 覆盖层样式
└── game/
    ├── constants.ts     # 全部可调手感参数（摆速/绳速/目标金额曲线）
    ├── types.ts         # 目标物类型表（价值/重量/半径）
    ├── generation.ts    # 按深度加权的关卡随机生成器
    ├── hook.ts          # 钩子状态机：swing → extend → retract
    ├── game.ts          # 主状态机：菜单/游戏/结算/商店、碰撞、TNT、存档
    ├── render.ts        # 程序化绘制：背景/矿工/绳钩/10 种目标物
    ├── audio.ts         # WebAudio 合成音效与 BGM
    ├── particles.ts     # 飘字与爆炸粒子
    └── save.ts          # localStorage 存档读写
```

核心手感公式：`收线速度 = 560 × 加成 / (1 + 0.45 × 重量)`，在 `constants.ts` 中调整。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 类型检查 + 产出 dist/
```

## 部署

已部署于 Cloudflare Pages（项目名 `gold-miner`）。更新部署：

```bash
npm run build && npx wrangler pages deploy dist --project-name gold-miner
```

## 版权说明

本项目仅为玩法复刻练习。玩法机制不受版权保护；美术、音效均为原创生成，未使用原版游戏任何资源。

# 买房 vs 租房计算器

[English version](README.md)

买房还是租房更划算？

房贷还完之后哪种方式资产更多？

租房省下的钱投资理财会赶上房产增长吗？

这款互动计算器帮你梳理买房和租房的财务对比。请按所在地区和个人情况填写参数，重点看 **净资产走势** 和 **敏感性热力图** —— 参数一变，结论也可能变。

## 在线使用

[https://jinda-li.github.io/buy-vs-rent/](https://jinda-li.github.io/buy-vs-rent/)

## 截图预览

README 里只展示两个核心结果：净资产随时间的变化，以及对租金与投资收益率的敏感性。

### 中文界面

**净资产走势** — 若在某年退出（卖房或清仓），买房与租房方案的税后到手对比。

![中文净资产走势](docs/screenshots/zh-net-worth.png)

**敏感性热力图** — 蓝色为买房净资产更高，绿色为租房更高；颜色越深表示差距越大（占房价百分比）。

![中文敏感性热力图](docs/screenshots/zh-heatmap.png)

### English UI

**Net worth over time** — year-by-year after-tax net worth if you exited that year.

![English net worth chart](docs/screenshots/en-net-worth.png)

**Sensitivity heatmap** — buying vs renting under different rent and return assumptions.

![English sensitivity heatmap](docs/screenshots/en-heatmap.png)

## 两种模式

**模式 1：同等面积**

控制居住面积变量，比较同一套房买下来和租着住的长期财务结果。这更接近理论上的机会成本分析。

**模式 2：不同面积**

还原真实选择：买得起的小房，和租得到的大房。这个模式会把面积差带来的成本差异也算入结果。

## 核心假设

计算器比较的是同一笔起始资金的不同去向：

- **买房方案：** 首付、过户税和手续费投入自住房。之后每月承担月供和额外持有成本。期末资产按房产市值减去贷款余额、卖出中介费，以及可能产生的资本利得税估算。
- **租房方案：** 同样的起始资金在第 0 天投入理财。每月省下的差额，也继续追加投资。期末资产按投资组合税后市值估算。

这里默认租房一方会把省下的钱投资。因为买房本质上有“强制储蓄”的作用，如果租房一方把省下的钱消费掉，那就不再是同等财务条件下的比较。

## 注意声明

结论仅供参考，用于梳理买房和租房的成本与收益，不构成财务建议。

参数敏感性很高！房价涨幅、租金年涨幅、卖房资本利得税、额外月支出、投资收益率等参数因地区而异。简单改变额外月支出或投资收益率，就可能改变结论。

本人在赫尔辛基，因此欧元模式以赫尔辛基 2026 年能搜集到的数据为默认，实际请自己填写本地参数。

## 功能

- 中英文界面，根据浏览器语言自动选择。
- 支持手动切换 中文 / EN，并记住选择。
- 分享链接会保留计算参数和语言。
- 支持 EUR、CNY、USD、GBP 四种预设。
- 包含净资产走势、累计支出、敏感性热力图，并支持导出长图。

## 本地运行

```bash
npm install
npm run dev
```

重新生成截图（需先 `npm run dev` 或 `npm run preview`）。脚本会保存各语言**整页**图（`*-full.png`），并单独导出 README 用的**净资产走势**、**敏感性热力图**（`*-net-worth.png`、`*-heatmap.png`）；上文预览仅引用后两张。

```bash
npx playwright install chromium
npm run build && npm run preview
# 另开终端：
node scripts/capture-readme-screenshots.mjs
```

生产构建：

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

## License

MIT

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useLang } from "./src/i18n";
import { COLOR, GlobalStyles } from "./src/theme";
import { Card, Row, SliderField, ChartTip } from "./src/ui";
import ToolSwitcher from "./src/ToolSwitcher";
import SiteFooter from "./src/SiteFooter";

// ---------- 金融计算核心 ----------
function monthlyPayment(principal, annualRate, years) {
  var r = annualRate / 12;
  var n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function remainingBalance(principal, annualRate, years, monthsPaid) {
  var r = annualRate / 12;
  var n = years * 12;
  var M = monthlyPayment(principal, annualRate, years);
  if (monthsPaid >= n) return 0;
  if (r === 0) return principal - M * monthsPaid;
  var bal = principal * Math.pow(1 + r, monthsPaid) - M * ((Math.pow(1 + r, monthsPaid) - 1) / r);
  return Math.max(0, bal);
}

function buildCashFlows(p) {
  var down = p.price * p.downPct;
  var principal = p.price - down;
  var M = monthlyPayment(principal, p.rate, p.loanYears);
  var annualPayment = M * 12;
  var buyTax = p.price * p.buyTaxPct;
  var flows = [-(down + buyTax)];
  for (var y = 1; y <= p.sellYear; y++) {
    var cf = 0;
    if (y <= p.loanYears) cf -= annualPayment;
    if (y === p.sellYear) {
      var houseValue = p.price * Math.pow(1 + p.growth, p.sellYear);
      var bal = remainingBalance(principal, p.rate, p.loanYears, Math.min(p.sellYear, p.loanYears) * 12);
      var sellCost = houseValue * p.sellCostPct;
      cf += houseValue - sellCost - bal;
    }
    flows.push(cf);
  }
  return flows;
}

function irr(flows) {
  // 二分法求年化内部收益率
  var lo = -0.99, hi = 5;
  function npv(rate) {
    var acc = 0;
    for (var t = 0; t < flows.length; t++) acc += flows[t] / Math.pow(1 + rate, t);
    return acc;
  }
  if (npv(lo) * npv(hi) > 0) return null;
  for (var i = 0; i < 100; i++) {
    var mid = (lo + hi) / 2;
    var v = npv(mid);
    if (Math.abs(v) < 1e-6) return mid;
    if (npv(lo) * v < 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

var INIT = {
  price: 200000, downPct: 0.2, rate: 0.039, loanYears: 25,
  growth: 0.014, sellYear: 15, buyTaxPct: 0.04, sellCostPct: 0.045,
};

var GROWTH_PRESETS = [
  { value: 0.014, zh: "长期均值 1.4%", en: "Long-term avg 1.4%" },
  { value: 0, zh: "近十年 0%", en: "Last decade 0%" },
];

export default function MortgageLeverage() {
  var i18n = useLang();
  var lang = i18n.lang;
  var setLang = i18n.setLang;
  var isZh = lang === "zh";
  function t(zhText, enText) { return isZh ? zhText : enText; }
  function yearUnit() { return isZh ? " 年" : " yr"; }

  var s1 = useState(INIT.price);       var price       = s1[0]; var setPrice       = s1[1];
  var s2 = useState(INIT.downPct);     var downPct     = s2[0]; var setDownPct     = s2[1];
  var s3 = useState(INIT.rate);        var rate        = s3[0]; var setRate        = s3[1];
  var s4 = useState(INIT.loanYears);   var loanYears   = s4[0]; var setLoanYears   = s4[1];
  var s5 = useState(INIT.growth);      var growth      = s5[0]; var setGrowth      = s5[1];
  var s6 = useState(INIT.sellYear);    var sellYear    = s6[0]; var setSellYear    = s6[1];
  var s7 = useState(INIT.buyTaxPct);   var buyTaxPct   = s7[0]; var setBuyTaxPct   = s7[1];
  var s8 = useState(INIT.sellCostPct); var sellCostPct = s8[0]; var setSellCostPct = s8[1];

  function fmt(v) { return Math.round(v).toLocaleString("fi-FI") + " €"; }
  function fmtK(v) {
    var abs = Math.abs(Math.round(v));
    var s = abs >= 1000 ? Math.round(abs / 1000) + "k" : String(abs);
    return (v < 0 ? "-" : "") + s + "€";
  }
  function fmtPct(v) { return v === null || isNaN(v) ? "—" : (v * 100).toFixed(2) + "%"; }

  function doReset() {
    setPrice(INIT.price); setDownPct(INIT.downPct); setRate(INIT.rate); setLoanYears(INIT.loanYears);
    setGrowth(INIT.growth); setSellYear(INIT.sellYear); setBuyTaxPct(INIT.buyTaxPct); setSellCostPct(INIT.sellCostPct);
  }

  var down = price * downPct;
  var principal = price - down;
  var M = monthlyPayment(principal, rate, loanYears);
  var totalInterest = M * loanYears * 12 - principal;
  var buyTax = price * buyTaxPct;

  var flows = useMemo(function() {
    return buildCashFlows({ price: price, downPct: downPct, rate: rate, loanYears: loanYears, growth: growth, sellYear: sellYear, buyTaxPct: buyTaxPct, sellCostPct: sellCostPct });
  }, [price, downPct, rate, loanYears, growth, sellYear, buyTaxPct, sellCostPct]);
  var rIrr = irr(flows);

  var houseValueAtSell = price * Math.pow(1 + growth, sellYear);
  var balAtSell = remainingBalance(principal, rate, loanYears, Math.min(sellYear, loanYears) * 12);
  var sellCost = houseValueAtSell * sellCostPct;
  var equityAtSell = houseValueAtSell - sellCost - balAtSell;
  var totalPaid = down + buyTax + M * 12 * Math.min(sellYear, loanYears);
  var netGain = equityAtSell - totalPaid;

  var curveData = useMemo(function() {
    var maxY = Math.max(loanYears + 5, sellYear + 2, 30);
    var pts = [];
    for (var y = 1; y <= maxY; y++) {
      var f = buildCashFlows({ price: price, downPct: downPct, rate: rate, loanYears: loanYears, growth: growth, sellYear: y, buyTaxPct: buyTaxPct, sellCostPct: sellCostPct });
      var rr = irr(f);
      pts.push({ year: y, irr: rr === null ? null : +(rr * 100).toFixed(2) });
    }
    return pts;
  }, [price, downPct, rate, loanYears, growth, buyTaxPct, sellCostPct, sellYear]);

  var breakeven = null;
  for (var bi = 0; bi < curveData.length; bi++) {
    if (curveData[bi].irr !== null && curveData[bi].irr >= 0) { breakeven = curveData[bi]; break; }
  }

  var irrColor = rIrr === null ? COLOR.muted : rIrr >= 0 ? COLOR.green : COLOR.loss;

  return (
    <div className="bvr-page" style={{ minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: COLOR.text }}>
      <GlobalStyles />
      <div className="bvr-shell">

        {/* ── 顶部导航条 ── */}
        <div className="bvr-nav">
          <div className="bvr-brand">
            <span style={{ fontSize: 16, fontWeight: 800, color: COLOR.text, letterSpacing: "-0.3px" }}>{t("房贷杠杆收益", "Mortgage Leverage")}</span>
          </div>
          <span className="bvr-nav-meta">{t("贷款年限 ", "Loan term ")}{loanYears}{yearUnit()} · {sellYear}{t(" 年后卖出", "-yr hold")}</span>
          <span className="bvr-nav-spacer" />
          <div className="bvr-nav-actions">
            <ToolSwitcher />
            <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 999, background: "#F4F4F8", border: "1px solid " + COLOR.border }}>
              {["zh", "en"].map(function(nextLang) {
                var activeLang = lang === nextLang;
                return (
                  <button key={nextLang} onClick={function() { setLang(nextLang); }}
                    style={{ border: "none", borderRadius: 999, padding: "5px 11px", cursor: "pointer", fontSize: 11, fontWeight: 800,
                      background: activeLang ? COLOR.primary : "transparent", color: activeLang ? "white" : COLOR.muted }}>
                    {nextLang === "zh" ? "中文" : "EN"}
                  </button>
                );
              })}
            </div>
            <button onClick={doReset} style={{ padding: "8px 14px", borderRadius: 999, border: "1.5px solid " + COLOR.border, background: "white", color: COLOR.sub, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              {t("全部重置", "Reset all")}
            </button>
          </div>
        </div>

        {/* ── 说明 ── */}
        <div className="bvr-panel">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: COLOR.text }}>{t("这个计算器在算什么", "What this calculator computes")}</div>
          </div>
          <div style={{ fontSize: 12, color: COLOR.sub, lineHeight: 1.7 }}>
            {t("首付 + 购置税作为初始投入，之后每年支付房贷月供，直到卖房那年一次性收回「房产估值 − 卖房中介费 − 剩余贷款」。把这一串现金流做年化内部收益率（IRR）计算，得到的就是", "The down payment plus transfer tax is the initial outlay. Each year you pay the mortgage, and in the sale year you receive the property value minus selling costs minus the remaining loan balance in one lump sum. Running an annualized internal rate of return (IRR) over that cash flow gives ")}
            <strong style={{ color: COLOR.text }}>{t("这笔钱在贷款杠杆下的真实年化回报率", "the real annualized return on that money under mortgage leverage")}</strong>
            {t("，已经把杠杆效应和交易成本都算在内。", ", already accounting for leverage and transaction costs.")}
          </div>
        </div>

        <div className="bvr-grid">
          <div className="bvr-col">
            {/* ── 参数输入 ── */}
            <Card p="20px" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.primary, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>{t("参数输入", "Inputs")}</div>
              <SliderField label={t("房价", "Home price")} value={price} min={50000} max={800000} step={5000}
                onChange={setPrice} display={fmt(price)} color={COLOR.primary} minLabel={fmtK(50000)} maxLabel={fmtK(800000)} />
              <SliderField label={t("首付比例", "Down payment")} value={downPct} min={0} max={0.8} step={0.01}
                onChange={setDownPct} display={(downPct * 100).toFixed(0) + "%"} color={COLOR.primary} minLabel="0%" maxLabel="80%" />
              <SliderField label={t("贷款利率（年）", "Mortgage rate (annual)")} value={rate} min={0.005} max={0.08} step={0.001}
                onChange={setRate} display={(rate * 100).toFixed(1) + "%"} color={COLOR.primary} minLabel="0.5%" maxLabel="8%" />
              <SliderField label={t("贷款年限", "Loan term")} value={loanYears} min={5} max={35} step={1}
                onChange={setLoanYears} display={loanYears + yearUnit()} color={COLOR.primary} minLabel={"5" + yearUnit()} maxLabel={"35" + yearUnit()} />
              <SliderField label={t("房价年涨幅", "Home price growth")} value={growth} min={-0.03} max={0.08} step={0.001}
                onChange={setGrowth} display={(growth * 100).toFixed(1) + "%"} color={COLOR.primary} minLabel="-3%" maxLabel="8%" />
              <div style={{ display: "flex", gap: 8, marginTop: -10, marginBottom: 18 }}>
                {GROWTH_PRESETS.map(function(p) {
                  var active = growth === p.value;
                  return (
                    <button key={p.value} onClick={function() { setGrowth(p.value); }}
                      style={{ flex: 1, fontSize: 11, padding: "6px 8px", borderRadius: 10, cursor: "pointer",
                        border: "1.5px solid " + (active ? COLOR.primary : COLOR.border),
                        background: active ? "#EEF0FF" : "white",
                        color: active ? COLOR.primary : COLOR.muted, fontWeight: 600 }}>
                      {isZh ? p.zh : p.en}
                    </button>
                  );
                })}
              </div>
              <SliderField label={t("持有 / 卖出年限", "Holding period")} value={sellYear} min={1} max={40} step={1}
                onChange={setSellYear} display={sellYear + t(" 年后卖出", " yr, then sell")} color={COLOR.primary} minLabel={"1" + yearUnit()} maxLabel={"40" + yearUnit()} />
              <SliderField label={t("购置税", "Transfer tax") + " (varainsiirtovero)"} value={buyTaxPct} min={0} max={0.06} step={0.001}
                onChange={setBuyTaxPct} display={(buyTaxPct * 100).toFixed(1) + "%"} color={COLOR.primary} minLabel="0%" maxLabel="6%" />
              <SliderField label={t("卖房中介佣金", "Selling agent fee")} value={sellCostPct} min={0} max={0.08} step={0.001}
                onChange={setSellCostPct} display={(sellCostPct * 100).toFixed(1) + "%"} color={COLOR.primary} minLabel="0%" maxLabel="8%" />
            </Card>
          </div>

          <div className="bvr-col">
            {/* ── 计算结果 ── */}
            <Card p="20px" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.primary, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>{t("计算结果", "Results")}</div>

              <div style={{ borderRadius: 18, padding: "18px 0 20px", textAlign: "center", background: rIrr === null ? COLOR.bg : rIrr >= 0 ? "#EEF9F5" : "#FDECEC", marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: COLOR.muted, letterSpacing: "0.04em" }}>{sellYear}{t(" 年后卖出 · 年化实际收益率", "-yr hold · annualized real return (IRR)")}</div>
                <div style={{ fontFamily: "monospace", fontSize: 42, fontWeight: 800, color: irrColor, marginTop: 6 }}>
                  {fmtPct(rIrr)}
                </div>
              </div>

              <Row label={t("月供", "Monthly payment")} value={fmt(M) + t("/月", "/mo")} />
              <Row label={t("首付", "Down payment")} value={fmt(down)} />
              <Row label={t("购置税（买入时一次性）", "Transfer tax (one-time)")} value={fmt(buyTax)} />
              <Row label={t(sellYear + " 年后房产价值", "Property value after " + sellYear + " yr")} value={fmt(houseValueAtSell)} />
              <Row label={t("卖房中介佣金", "Selling agent fee")} value={"-" + fmt(sellCost)} />
              <Row label={t("剩余贷款余额", "Remaining loan balance")} value={fmt(balAtSell)} />
              <Row label={t("卖房净得（净资产）", "Net proceeds at sale")} value={fmt(equityAtSell)} />
              <Row label={t("累计已付（首付+购置税+月供）", "Total paid (down + tax + payments)")} value={fmt(totalPaid)} />
              <Row label={t("净收益", "Net gain")} value={fmt(netGain)} color={netGain >= 0 ? COLOR.green : COLOR.loss} />
              <Row label={t(loanYears + " 年总利息（若持满全期）", "Total interest over " + loanYears + " yr (if held to term)")} value={fmt(totalInterest)} last />
            </Card>
          </div>
        </div>

        {/* ── 收益率曲线图 ── */}
        <Card p="20px" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t("不同持有年限下的年化收益率曲线", "Annualized return by holding period")}</div>
          <div style={{ fontSize: 12, color: COLOR.muted, marginBottom: 4 }}>
            {breakeven
              ? t("盈亏平衡点约在第 " + breakeven.year + " 年（此后收益率转正）", "Break-even is around year " + breakeven.year + " (return turns positive after that)")
              : t("在当前参数下，该曲线范围内未转正", "Within this range, the return does not turn positive under current inputs")}
          </div>
          <div style={{ height: 300, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="#E8E8EC" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: COLOR.muted, fontSize: 10 }} stroke="none"
                  label={{ value: t("持有年限", "Holding years"), position: "insideBottom", offset: -2, fill: COLOR.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: COLOR.muted, fontSize: 10 }} stroke="none" tickFormatter={function(v) { return v + "%"; }} width={44} />
                <Tooltip content={<ChartTip fmtK={function(v) { return v.toFixed(2) + "%"; }} yearLabel={function(v) { return t("第 " + v + " 年卖出", "Sell in year " + v); }} />} />
                <ReferenceLine y={0} stroke={COLOR.loss} strokeDasharray="4 4" />
                <ReferenceLine x={sellYear} stroke={COLOR.amber} strokeDasharray="2 2"
                  label={{ value: t("当前设定", "Current"), fill: COLOR.amber, fontSize: 10, position: "insideTopRight" }} />
                <Line type="monotone" dataKey="irr" name={t("年化IRR", "Annualized IRR")} stroke={COLOR.primary} strokeWidth={2.5} dot={false} connectNulls activeDot={{ r: 5, fill: COLOR.primary }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ── 注意声明 ── */}
        <Card p="18px" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{t("注意声明", "Disclaimer")}</div>
          <div style={{ fontSize: 12, color: COLOR.sub, lineHeight: 1.7 }}>
            {t("默认参数参考芬兰银行（Suomen Pankki）2026年新贷款平均利率、芬兰统一后的购置税（varainsiirtovero）税率、当地公寓中介佣金行情，以及 Eurostat 2006–2025 房价指数长期均值。计算基于等额本息月供、年度现金流 IRR 估算，未计入年度房产税（kiinteistövero）、维护/公司管理费、房租对比收益或汇率变动，仅供参考，不构成财务建议。", "Defaults reference Bank of Finland (Suomen Pankki) average new-mortgage rates for 2026, Finland's unified transfer tax (varainsiirtovero), local apartment agent-fee norms, and the Eurostat 2006-2025 long-run house price index. The calculation uses an equal-payment mortgage and an annual cash-flow IRR estimate. It excludes annual property tax (kiinteistövero), maintenance/housing-company fees, comparison against renting, and currency effects. For reference only; not financial advice.")}
          </div>
        </Card>

        <SiteFooter />

      </div>
    </div>
  );
}

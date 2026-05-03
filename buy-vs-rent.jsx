import { useState, useMemo, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { toPng } from "html-to-image";

// 各国参数来源：Finland税务局vero.fi / 中国LPR官方 / 美国Bankrate / 英国HMRC及Rightmove
var CURRENCIES = {
  EUR: { sym: "€",  locale: "fi-FI", after: true,  bankFees: 800,
    label: "欧元 EUR", country: "芬兰", example: "以芬兰为例",
    // 过户税: asunto-osake公寓1.5%（2024年起）；贷款利率: 12m Euribor+行margin约3%；中介费: 赫尔辛基3-4.5%；资本利得税30%
    d: { buyPPM: 3300,  rentPPM: 15,  fee: 270, mRate: 3.0, txTax: 1.5, agentFee: 3.5, invTax: 30, downPct: 20 },
    r: { buyPPM: [500, 10000, 100],   rentPPM: [3, 60, 0.5],  fee: [50, 2000, 10]  } },
  CNY: { sym: "¥",  locale: "zh-CN", after: false, bankFees: 5000,
    label: "人民币 CNY", country: "中国", example: "以中国为例",
    // 契税: 首套90-144㎡1.5%；贷款利率: 5年期LPR 3.5%（2025年5月）；中介费: 约2%；资本利得税20%
    d: { buyPPM: 25000, rentPPM: 80,  fee: 500, mRate: 3.5, txTax: 1.5, agentFee: 2.0, invTax: 20, downPct: 20 },
    r: { buyPPM: [3000, 150000, 1000], rentPPM: [20, 300, 5], fee: [100, 5000, 100] } },
  USD: { sym: "$",  locale: "en-US", after: false, bankFees: 4000,
    label: "美元 USD", country: "美国", example: "以美国为例",
    // 过户税: 各州差异大，买方约0.5%（多数closing costs含在bankFees）；30年固定约6.3%（2026）；中介费NAR后约2.5%；资本利得税20%
    d: { buyPPM: 4000,  rentPPM: 25,  fee: 400, mRate: 6.5, txTax: 0.5, agentFee: 2.5, invTax: 20, downPct: 20 },
    r: { buyPPM: [500, 25000, 100],   rentPPM: [5, 100, 1],   fee: [100, 2000, 50] } },
  GBP: { sym: "£",  locale: "en-GB", after: false, bankFees: 2000,
    label: "英镑 GBP", country: "英国", example: "以英国为例",
    // SDLT: £400k房产约2.5%（累进税率）；抵押贷款5年固定约4.5%（2025）；EA中介费约1.5%含VAT；资本利得税20%
    d: { buyPPM: 3500,  rentPPM: 18,  fee: 250, mRate: 4.5, txTax: 2.5, agentFee: 1.5, invTax: 20, downPct: 20 },
    r: { buyPPM: [1000, 30000, 200],  rentPPM: [5, 100, 1],   fee: [50, 2000, 50]  } },
};

var COLOR = {
  bg: "#F4F3FF", card: "#FFFFFF", primary: "#5B5BD6", green: "#1E9B6B",
  text: "#1C2024", sub: "#60646C", muted: "#87909F", border: "#E8E8EC",
  buy: "#5B5BD6", rent: "#1E9B6B",
};

function Label(props) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
      {props.children}
    </div>
  );
}

function Card(props) {
  return (
    <div style={Object.assign({ background: COLOR.card, borderRadius: 20, padding: props.p || "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: props.mb || 12 }, props.style || {})}>
      {props.children}
    </div>
  );
}

function InfoTip(props) {
  var st = useState(false); var show = st[0]; var setShow = st[1];
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 4, verticalAlign: "middle" }}>
      <span
        onMouseEnter={function() { setShow(true); }}
        onMouseLeave={function() { setShow(false); }}
        onClick={function() { setShow(!show); }}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 15, height: 15, borderRadius: "50%", background: "#E8E8EC", color: COLOR.muted, fontSize: 9, fontWeight: 800, cursor: "pointer", userSelect: "none", lineHeight: 1 }}
      >i</span>
      {show && (
        <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: COLOR.text, color: "white", borderRadius: 10, padding: "10px 12px", fontSize: 11, lineHeight: 1.7, whiteSpace: "nowrap", zIndex: 99, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", minWidth: 200 }}>
          {props.children}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid " + COLOR.text }} />
        </div>
      )}
    </span>
  );
}

function EditableNum(props) {
  var es = useState(false); var editing = es[0]; var setEditing = es[1];
  var vs = useState("");    var editVal = vs[0]; var setEditVal = vs[1];
  function startEdit() { setEditVal(String(props.value)); setEditing(true); }
  function commit(v) {
    var n = parseFloat(v);
    if (!isNaN(n) && n > 0) props.onChange(n);
    setEditing(false);
  }
  function handleKey(e) {
    if (e.key === "Enter") { e.preventDefault(); commit(e.target.value); }
    if (e.key === "Escape") setEditing(false);
  }
  var c = props.color || COLOR.primary;
  if (editing) return (
    <input autoFocus type="number" value={editVal}
      onChange={function(e) { setEditVal(e.target.value); }}
      onBlur={function(e) { commit(e.target.value); }}
      onKeyDown={handleKey}
      style={{ width: 88, fontSize: props.fontSize || 16, fontWeight: 700, color: c,
        border: "none", borderBottom: "2px solid " + c, background: "transparent",
        outline: "none", textAlign: "right", padding: 0, fontFamily: "inherit" }} />
  );
  return (
    <span onClick={startEdit} title="点击直接输入数值"
      style={{ fontSize: props.fontSize || 16, fontWeight: 700, color: c, cursor: "text",
        borderBottom: "1.5px dashed " + c + "55" }}>
      {props.display}
    </span>
  );
}

function SliderField(props) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <Label>{props.label}</Label>
        <EditableNum value={props.value} display={props.display} onChange={props.onChange} color={props.color} />
      </div>
      {props.sub && <div style={{ fontSize: 11, color: COLOR.muted, marginBottom: 6 }}>{props.sub}</div>}
      <div style={{ position: "relative", height: 6, borderRadius: 99, background: "#E8E8EC" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99, background: props.color || COLOR.primary, width: ((props.value - props.min) / (props.max - props.min) * 100) + "%" }} />
        <input type="range" min={props.min} max={props.max} step={props.step} value={props.value}
          onChange={function(e) { props.onChange(parseFloat(e.target.value)); }}
          style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", opacity: 0, cursor: "pointer", height: 24, margin: 0 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: "#B0B4BE" }}>{props.minLabel || props.min}</span>
        <span style={{ fontSize: 10, color: "#B0B4BE" }}>{props.maxLabel || props.max}</span>
      </div>
    </div>
  );
}

function Row(props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, marginBottom: 12, borderBottom: props.last ? "none" : "1px solid " + COLOR.border }}>
      <span style={{ fontSize: 13, color: COLOR.sub }}>{props.label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: props.color || COLOR.text, fontFamily: "monospace" }}>{props.value}</span>
    </div>
  );
}

function ChartTip(props) {
  if (!props.active || !props.payload || !props.payload.length) return null;
  var fmtK = props.fmtK || function(v) { return String(Math.round(v)); };
  return (
    <div style={{ background: COLOR.card, border: "1px solid " + COLOR.border, borderRadius: 12, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, marginBottom: 6 }}>第 {props.label} 年</div>
      {props.payload.map(function(p, i) {
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: p.color }}>{p.name}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLOR.text, fontFamily: "monospace" }}>{fmtK(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

var INV_RANGE  = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Parse shared URL state from hash on first load
var _init = (function() {
  try {
    var h = window.location.hash.slice(1);
    if (h) { var p = JSON.parse(atob(h)); if (p && p.c) return p; }
  } catch(e) {}
  return null;
})();

export default function App() {
  var _ic = (_init && CURRENCIES[_init.c]) ? _init.c : "EUR";
  var sc  = useState(_ic);        var currency    = sc[0];  var setCurrency   = sc[1];
  var sm  = useState(_init && _init.mo ? _init.mo : "same"); var mode = sm[0]; var setMode = sm[1];
  var cur = CURRENCIES[currency];
  var mainRef   = useRef(null);
  var sc2 = useState(false); var copied    = sc2[0]; var setCopied    = sc2[1];
  var se  = useState(false); var exporting = se[0];  var setExporting = se[1];

  function fmtN(n) { return Math.abs(Math.round(n)).toLocaleString(cur.locale); }
  function fmt(n)  {
    var abs = fmtN(Math.abs(n));
    return (n < 0 ? "-" : "") + (cur.after ? abs + " " + cur.sym : cur.sym + abs);
  }
  function fmtK(n) {
    var abs = Math.abs(Math.round(n));
    var s = abs >= 1000 ? Math.round(abs / 1000) + "k" : String(abs);
    return (n < 0 ? "-" : "") + (cur.after ? s + cur.sym : cur.sym + s);
  }
  function fmtSym(n) {
    return cur.after ? fmtN(n) + " " + cur.sym : cur.sym + fmtN(n);
  }

  var bankFees = cur.bankFees;

  var s1  = useState(_init ? (_init.bp || cur.d.buyPPM)  : cur.d.buyPPM);  var buyPPM     = s1[0];  var setBuyPPM     = s1[1];
  var s2  = useState(_init ? (_init.a  || 60)            : 60);            var area       = s2[0];  var setArea       = s2[1];
  var s3  = useState(_init ? (_init.f  || cur.d.fee)     : cur.d.fee);     var fee        = s3[0];  var setFee        = s3[1];
  var s4  = useState(_init ? (_init.rp || cur.d.rentPPM) : cur.d.rentPPM); var rentPPM    = s4[0];  var setRentPPM    = s4[1];
  var s5  = useState(_init ? (_init.ir || 3.0)           : 3.0);           var invRet     = s5[0];  var setInvRet     = s5[1];
  var s6  = useState(_init ? (_init.pg || 1.5)           : 1.5);           var propGrowth = s6[0];  var setPropGrowth = s6[1];
  var s7  = useState(_init ? (_init.mr || cur.d.mRate)   : cur.d.mRate);   var mRate      = s7[0];  var setMRate      = s7[1];
  var s8  = useState(_init ? (_init.dp || cur.d.downPct) : cur.d.downPct); var downPct    = s8[0];  var setDownPct    = s8[1];
  var s9  = useState(_init ? (_init.lt || 25)            : 25);            var loanTerm   = s9[0];  var setLoanTerm   = s9[1];
  var s10 = useState(_init ? (_init.rg || 1.3)           : 1.3);           var rentGrowth = s10[0]; var setRentGrowth = s10[1];
  var s11 = useState(_init ? (_init.fg || 2.3)           : 2.3);           var feeGrowth  = s11[0]; var setFeeGrowth  = s11[1];
  var s12 = useState(_init ? (_init.tt || cur.d.txTax)   : cur.d.txTax);   var txTax      = s12[0]; var setTxTax      = s12[1];
  var s13 = useState(_init ? (_init.af || cur.d.agentFee): cur.d.agentFee);var agentFee   = s13[0]; var setAgentFee   = s13[1];
  var s14 = useState(_init ? (_init.pr !== 0)            : true);          var primaryRes = s14[0]; var setPrimaryRes = s14[1];
  var s15 = useState(_init ? (_init.it || cur.d.invTax)  : cur.d.invTax);  var invTax     = s15[0]; var setInvTax     = s15[1];
  var s16 = useState("net");         var tab        = s16[0]; var setTab        = s16[1];
  var s17 = useState(false);         var moreOpen   = s17[0]; var setMoreOpen   = s17[1];
  var s18 = useState(_init ? (_init.ba || 60) : 60); var buyArea  = s18[0]; var setBuyArea  = s18[1];
  var s19 = useState(_init ? (_init.ra || 80) : 80); var rentArea = s19[0]; var setRentArea = s19[1];

  var effBuyArea  = mode === "same" ? area : buyArea;
  var effRentArea = mode === "same" ? area : rentArea;

  var price    = buyPPM * effBuyArea;
  var down     = price * downPct / 100;
  var loan     = price - down;
  var txAmt    = price * txTax / 100;
  var outlay   = down + txAmt + bankFees;
  var rent0    = effRentArea * rentPPM;

  var mortgage = useMemo(function() {
    var r = mRate / 100 / 12;
    var n = loanTerm * 12;
    if (r === 0) return loan / n;
    return loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }, [mRate, loan, loanTerm]);

  var buyMonthly = mortgage + fee;
  var saving     = buyMonthly - rent0;
  var firstMonthInterest = Math.round(loan * mRate / 100 / 12);

  var chartData = useMemo(function() {
    var loanBal = loan, propVal = price;
    var port = outlay, invested = outlay;
    var buyOut = outlay, rentOut = 0;
    var curFee = fee, curRent = rent0;
    var rows = [];
    for (var yr = 1; yr <= loanTerm; yr++) {
      for (var mo = 0; mo < 12; mo++) {
        var interest  = loanBal * (mRate / 100 / 12);
        var principal = Math.min(mortgage - interest, loanBal);
        loanBal  = Math.max(0, loanBal - principal);
        var extra = mortgage + curFee - curRent;
        buyOut  += mortgage + curFee;
        port     = port * (1 + invRet / 100 / 12) + extra;
        invested += Math.max(0, extra);
        rentOut += curRent;
      }
      curFee  = curFee  * (1 + feeGrowth  / 100);
      curRent = curRent * (1 + rentGrowth / 100);
      propVal = propVal * (1 + propGrowth / 100);
      var capGain    = Math.max(0, propVal - price);
      var capTax     = primaryRes ? 0 : capGain * 0.30;
      var buyWealth  = propVal - loanBal - propVal * agentFee / 100 - capTax;
      var invGain    = Math.max(0, port - invested);
      var rentWealth = port - invGain * (invTax / 100);
      rows.push({
        yr: yr,
        BuyNet:  Math.round(buyWealth),
        RentNet: Math.round(rentWealth),
        BuyOut:  Math.round(buyOut),
        RentOut: Math.round(rentOut),
        rawB: buyWealth, rawR: rentWealth,
        rawPV: propVal, rawInv: invested,
      });
    }
    return rows;
  }, [price, loan, outlay, mRate, mortgage, loanTerm, propGrowth, rentGrowth, invRet,
      rent0, fee, feeGrowth, agentFee, primaryRes, invTax]);

  var last    = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  var buyWins = last ? last.rawB > last.rawR : false;

  var breakEvenRate = useMemo(function() {
    var lb0 = loan, pv0 = price, cf0 = fee, cr0 = rent0;
    for (var yr = 1; yr <= loanTerm; yr++) {
      for (var mo = 0; mo < 12; mo++) {
        var int0 = lb0 * (mRate / 100 / 12);
        lb0 = Math.max(0, lb0 - Math.min(mortgage - int0, lb0));
      }
      cf0 = cf0 * (1 + feeGrowth / 100);
      cr0 = cr0 * (1 + rentGrowth / 100);
      pv0 = pv0 * (1 + propGrowth / 100);
    }
    var cg0 = Math.max(0, pv0 - price);
    var ct0 = primaryRes ? 0 : cg0 * 0.30;
    var targetBuy = pv0 - lb0 - pv0 * agentFee / 100 - ct0;
    var calc = function(rate) {
      var port2 = outlay, inv2 = outlay, lb2 = loan;
      var cf2 = fee, cr2 = rent0;
      for (var yr2 = 1; yr2 <= loanTerm; yr2++) {
        for (var mo2 = 0; mo2 < 12; mo2++) {
          var int2 = lb2 * (mRate / 100 / 12);
          lb2 = Math.max(0, lb2 - Math.min(mortgage - int2, lb2));
          var ext2 = mortgage + cf2 - cr2;
          port2 = port2 * (1 + rate / 100 / 12) + ext2;
          inv2 += Math.max(0, ext2);
        }
        cf2 = cf2 * (1 + feeGrowth / 100);
        cr2 = cr2 * (1 + rentGrowth / 100);
      }
      var ig2 = Math.max(0, port2 - inv2);
      return (port2 - ig2 * (invTax / 100)) - targetBuy;
    };
    var lo = 0, hi = 20;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (calc(mid) > 0) hi = mid; else lo = mid;
    }
    return Math.round((lo + hi) / 2 * 10) / 10;
  }, [price, loan, outlay, mRate, mortgage, loanTerm, propGrowth, rentGrowth,
      rent0, fee, feeGrowth, agentFee, primaryRes, invTax]);

  var crossings = [];
  for (var ci = 1; ci < chartData.length; ci++) {
    var cprev = chartData[ci - 1];
    var ccurr = chartData[ci];
    if ((cprev.rawB - cprev.rawR) * (ccurr.rawB - ccurr.rawR) < 0) {
      crossings.push({ yr: ccurr.yr, dir: ccurr.rawB > ccurr.rawR ? "buy" : "rent" });
    }
  }

  var heatmapRentRange = useMemo(function() {
    var base = cur.d.rentPPM;
    return [0.5, 0.65, 0.8, 0.95, 1.1, 1.25, 1.4].map(function(f) { return Math.round(base * f); });
  }, [currency, cur.d.rentPPM]);

  var heatmap = useMemo(function() {
    var cells = [];
    for (var ri = 0; ri < heatmapRentRange.length; ri++) {
      var row = [];
      for (var ii = 0; ii < INV_RANGE.length; ii++) {
        var ir = INV_RANGE[ii];
        var rp = heatmapRentRange[ri];
        var lb = loan, pv = price, port2 = outlay, inv2 = outlay;
        var cf = fee, cr = rp * effRentArea;
        for (var yr2 = 1; yr2 <= loanTerm; yr2++) {
          for (var mo2 = 0; mo2 < 12; mo2++) {
            var int2 = lb * (mRate / 100 / 12);
            lb = Math.max(0, lb - Math.min(mortgage - int2, lb));
            var ext2 = mortgage + cf - cr;
            port2 = port2 * (1 + ir / 100 / 12) + ext2;
            inv2 += Math.max(0, ext2);
          }
          cf = cf * (1 + feeGrowth / 100);
          cr = cr * (1 + rentGrowth / 100);
          pv = pv * (1 + propGrowth / 100);
        }
        var cg2 = Math.max(0, pv - price);
        var ct2 = primaryRes ? 0 : cg2 * 0.30;
        var bw2 = pv - lb - pv * agentFee / 100 - ct2;
        var ig2 = Math.max(0, port2 - inv2);
        var rw2 = port2 - ig2 * (invTax / 100);
        row.push(Math.round((bw2 - rw2) / (price / 100)));
      }
      cells.push(row);
    }
    return cells;
  }, [price, loan, outlay, mRate, mortgage, loanTerm, propGrowth, rentGrowth,
      effRentArea, fee, feeGrowth, agentFee, primaryRes, invTax, heatmapRentRange]);

  function applyPreset(c) {
    var p = CURRENCIES[c];
    setBuyPPM(p.d.buyPPM); setRentPPM(p.d.rentPPM); setFee(p.d.fee);
    setMRate(p.d.mRate); setTxTax(p.d.txTax); setAgentFee(p.d.agentFee);
    setInvTax(p.d.invTax); setDownPct(p.d.downPct);
    setCurrency(c);
  }

  function doReset() {
    setArea(60); setBuyArea(60); setRentArea(80);
    setBuyPPM(cur.d.buyPPM); setFee(cur.d.fee); setRentPPM(cur.d.rentPPM);
    setInvRet(3.0); setPropGrowth(1.5);
    setMRate(cur.d.mRate); setDownPct(cur.d.downPct); setLoanTerm(25);
    setRentGrowth(1.3); setFeeGrowth(2.3);
    setTxTax(cur.d.txTax); setAgentFee(cur.d.agentFee);
    setPrimaryRes(true); setInvTax(cur.d.invTax); setMoreOpen(false);
  }

  function getShareUrl() {
    var p = {
      c: currency, mo: mode,
      a: area, ba: buyArea, ra: rentArea,
      bp: buyPPM, rp: rentPPM, f: fee,
      mr: mRate, dp: downPct, lt: loanTerm,
      ir: invRet, pg: propGrowth, rg: rentGrowth, fg: feeGrowth,
      tt: txTax, af: agentFee, pr: primaryRes ? 1 : 0, it: invTax,
    };
    return window.location.origin + window.location.pathname + "#" + btoa(JSON.stringify(p));
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(getShareUrl()).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2500);
    });
  }

  function exportImage() {
    var node = mainRef.current;
    if (!node || exporting) return;
    setExporting(true);
    var h = node.scrollHeight;
    toPng(node, {
      cacheBust: true,
      backgroundColor: COLOR.bg,
      width: 480,
      height: h,
      pixelRatio: 2,
      style: {
        width: "480px",
        maxWidth: "480px",
        margin: "0",
        overflow: "visible",
        maxHeight: "none",
        height: h + "px",
      },
    })
      .then(function(dataUrl) {
        var link = document.createElement("a");
        link.download = "buy-vs-rent-" + currency + ".png";
        link.href = dataUrl;
        link.click();
        setExporting(false);
      })
      .catch(function() { setExporting(false); });
  }

  var crossStatus = crossings.length === 0
    ? (buyWins ? "买房领先" : "租房领先")
    : crossings.length === 1
      ? "第" + crossings[0].yr + "年" + (crossings[0].dir === "buy" ? "买房" : "租房") + "超越"
      : "第" + crossings[0].yr + "年" + (crossings[0].dir === "buy" ? "买房" : "租房") + "超越，第" + crossings[1].yr + "年再度超越";

  var areaDiff = effRentArea - effBuyArea;

  return (
    <div style={{ minHeight: "100vh", background: COLOR.bg, fontFamily: "system-ui, sans-serif", color: COLOR.text }}>
      <div ref={mainRef} style={{ maxWidth: 480, margin: "0 auto", padding: "0 0 40px", background: COLOR.bg }}>

        {/* ── Header ── */}
        <div style={{ padding: "32px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.primary, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>FINANCIAL CALCULATOR</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: COLOR.text, margin: "0 0 4px", letterSpacing: "-0.5px" }}>买房 vs 租房</h1>
              <div style={{ fontSize: 13, color: COLOR.muted }}>贷款年限 {loanTerm} 年 · {mode === "same" ? "同等面积对比" : "不同面积对比"}</div>
            </div>
            <button onClick={doReset} style={{ marginTop: 8, padding: "8px 14px", borderRadius: 12, border: "1.5px solid " + COLOR.border, background: "white", color: COLOR.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              全部重置
            </button>
          </div>

          {/* 货币选择 */}
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {Object.keys(CURRENCIES).map(function(key) {
              var active = currency === key;
              return (
                <button key={key} onClick={function() { applyPreset(key); }}
                  style={{ padding: "5px 10px", borderRadius: 20, border: "1.5px solid", cursor: "pointer",
                    borderColor: active ? COLOR.primary : COLOR.border,
                    background: active ? "#EEF0FF" : "white",
                    color: active ? COLOR.primary : COLOR.muted,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{CURRENCIES[key].label}</span>
                  <span style={{ fontSize: 9, opacity: active ? 0.75 : 0.55, fontWeight: 500 }}>{CURRENCIES[key].example}</span>
                </button>
              );
            })}
          </div>

          {/* 模式选择 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {[
              ["same", "同等面积", "理论机会成本", "控制面积变量，纯粹比较同一套房：买下来 vs 租着住，钱用在哪里更值？"],
              ["diff", "不同面积", "实际选择对比", "还原真实决策：买得起的小房 vs 租得到的大房，财务与生活品质如何权衡？"],
            ].map(function(item) {
              var active = mode === item[0];
              return (
                <button key={item[0]} onClick={function() { setMode(item[0]); }}
                  style={{ padding: "10px 12px", borderRadius: 14, border: "2px solid", cursor: "pointer", textAlign: "left",
                    borderColor: active ? COLOR.primary : COLOR.border,
                    background: active ? "#EEF0FF" : "white" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? COLOR.primary : COLOR.text, marginBottom: 2 }}>{item[1]}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: active ? COLOR.primary : COLOR.muted, marginBottom: 4, opacity: 0.8 }}>{item[2]}</div>
                  <div style={{ fontSize: 10, color: COLOR.muted, lineHeight: 1.5 }}>{item[3]}</div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 8, padding: "9px 12px", borderRadius: 10, background: mode === "same" ? "#EEF0FF" : "#EEF9F5", fontSize: 11, color: mode === "same" ? COLOR.buy : COLOR.green, lineHeight: 1.6 }}>
            {mode === "same"
              ? "📐 当前模式：买卖面积锁定相同。排除居住空间的影响，单独回答「买 vs 租」这个财务问题。"
              : "🏠 当前模式：买房和租房面积可以不同。模拟真实市场中你实际面临的两个选项，财务结果包含了面积差带来的成本差异。"
            }
          </div>
        </div>

        {/* ── 月支出概览 ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "16px 20px 0" }}>
          <div style={{ background: COLOR.buy, borderRadius: 18, padding: "16px", color: "white" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7, marginBottom: 4 }}>
              买房月支出（首年）{mode === "diff" ? " · " + effBuyArea + "m²" : ""}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>{fmt(buyMonthly)}</div>
            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>月供 {fmt(mortgage)} + 物业 {fmt(fee)}</div>
          </div>
          <div style={{ background: COLOR.green, borderRadius: 18, padding: "16px", color: "white" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7, marginBottom: 4 }}>
              租房月支出（首年）{mode === "diff" ? " · " + effRentArea + "m²" : ""}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace" }}>{fmt(rent0)}</div>
            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>
              {saving >= 0 ? "差额 " + fmt(saving) + " 可投资" : "租房多支出 " + fmt(-saving) + "/月"}
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 20px 0" }}>

          {/* ── 面积设置 ── */}
          {mode === "same" ? (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>居住面积</span>
                <EditableNum value={area} display={area + " 平米"} onChange={setArea} color={COLOR.primary} fontSize={20} />              </div>
              <div style={{ position: "relative", height: 6, borderRadius: 99, background: "#E8E8EC" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99, background: COLOR.primary, width: ((area - 20) / 130 * 100) + "%" }} />
                <input type="range" min={20} max={150} step={1} value={area}
                  onChange={function(e) { setArea(+e.target.value); }}
                  style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", opacity: 0, cursor: "pointer", height: 24, margin: 0 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontSize: 10, color: "#B0B4BE" }}>20 平米</span>
                <span style={{ fontSize: 10, color: "#B0B4BE" }}>150 平米</span>
              </div>
              <div style={{ fontSize: 12, color: COLOR.muted, marginTop: 10, paddingTop: 10, borderTop: "1px solid " + COLOR.border }}>
                买房总价 = {fmtSym(buyPPM)} × {area} = <strong style={{ color: COLOR.text }}>{fmt(price)}</strong>
              </div>
            </Card>
          ) : (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>面积设置</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: areaDiff > 0 ? COLOR.green : areaDiff < 0 ? COLOR.buy : COLOR.muted,
                  background: areaDiff > 0 ? "#EEF9F5" : areaDiff < 0 ? "#EEF0FF" : COLOR.bg,
                  padding: "3px 10px", borderRadius: 999 }}>
                  {areaDiff > 0 ? "租房多 +" + areaDiff : areaDiff < 0 ? "买房多 +" + (-areaDiff) : "面积相同"} m²
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.buy, marginBottom: 8 }}>买房面积</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: COLOR.buy, marginBottom: 8 }}>
                    <EditableNum value={buyArea} display={buyArea + " m²"} onChange={setBuyArea} color={COLOR.buy} fontSize={22} />
                  </div>
                  <div style={{ position: "relative", height: 6, borderRadius: 99, background: "#E8E8EC", marginBottom: 4 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99, background: COLOR.buy, width: ((buyArea - 20) / 130 * 100) + "%" }} />
                    <input type="range" min={20} max={150} step={1} value={buyArea}
                      onChange={function(e) { setBuyArea(+e.target.value); }}
                      style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", opacity: 0, cursor: "pointer", height: 24, margin: 0 }} />
                  </div>
                  <div style={{ fontSize: 11, color: COLOR.muted }}>总价 {fmt(price)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.green, marginBottom: 8 }}>租房面积</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: COLOR.green, marginBottom: 8 }}>
                    <EditableNum value={rentArea} display={rentArea + " m²"} onChange={setRentArea} color={COLOR.green} fontSize={22} />
                  </div>
                  <div style={{ position: "relative", height: 6, borderRadius: 99, background: "#E8E8EC", marginBottom: 4 }}>
                    <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99, background: COLOR.green, width: ((rentArea - 20) / 130 * 100) + "%" }} />
                    <input type="range" min={20} max={150} step={1} value={rentArea}
                      onChange={function(e) { setRentArea(+e.target.value); }}
                      style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", opacity: 0, cursor: "pointer", height: 24, margin: 0 }} />
                  </div>
                  <div style={{ fontSize: 11, color: COLOR.muted }}>月租 {fmt(rent0)}</div>
                </div>
              </div>
            </Card>
          )}

          {/* ── 买房/租房参数 ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card p="18px">
              <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.buy, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>买房</div>
              <SliderField label="购买单价" value={buyPPM}
                min={cur.r.buyPPM[0]} max={cur.r.buyPPM[1]} step={cur.r.buyPPM[2]}
                onChange={setBuyPPM} display={fmtSym(buyPPM) + "/m²"}
                color={COLOR.buy} sub={"参考均价 " + fmtSym(cur.d.buyPPM) + "/m²"} />
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Label>额外月支出</Label>
                    <InfoTip>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>相比租房多出来的固定开支</div>
                      <div>· 物业管理费 + 维修基金</div>
                      <div>· 房屋保险（买房后更贵）</div>
                      <div>· 水费（租房通常含在租金里）</div>
                      <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 10 }}>
                        这些费用租房时由房东承担<br />或已包含在租金中
                      </div>
                    </InfoTip>
                  </div>
                  <EditableNum value={fee} display={fmt(fee) + "/月"} onChange={setFee} color={COLOR.buy} />
                </div>
                <div style={{ fontSize: 11, color: COLOR.muted, marginBottom: 6 }}>含物业管理、维修基金、保险等</div>
                <div style={{ position: "relative", height: 6, borderRadius: 99, background: "#E8E8EC" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99, background: COLOR.buy, width: ((fee - cur.r.fee[0]) / (cur.r.fee[1] - cur.r.fee[0]) * 100) + "%" }} />
                  <input type="range" min={cur.r.fee[0]} max={cur.r.fee[1]} step={cur.r.fee[2]} value={fee}
                    onChange={function(e) { setFee(+e.target.value); }}
                    style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", width: "100%", opacity: 0, cursor: "pointer", height: 24, margin: 0 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: "#B0B4BE" }}>{cur.r.fee[0]}</span>
                  <span style={{ fontSize: 10, color: "#B0B4BE" }}>{cur.r.fee[1]}</span>
                </div>
              </div>
            </Card>

            <Card p="18px">
              <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.green, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>租房</div>
              <SliderField label="租金单价" value={rentPPM}
                min={cur.r.rentPPM[0]} max={cur.r.rentPPM[1]} step={cur.r.rentPPM[2]}
                onChange={setRentPPM} display={fmtSym(rentPPM) + "/m²"}
                color={COLOR.green} sub={"月租 " + fmt(rent0)} />
              <SliderField label="投资收益率" value={invRet} min={1} max={10} step={0.5}
                onChange={setInvRet} display={invRet + "% / 年"}
                color={COLOR.green} sub={"节省差额放入理财"} />
              <div style={{ display: "flex", gap: 6, marginTop: -8 }}>
                {[[2,"保守"],[5,"中等"],[8,"激进"]].map(function(item) {
                  return (
                    <button key={item[0]} onClick={function() { setInvRet(item[0]); }} style={{ flex: 1, padding: "5px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600, background: invRet === item[0] ? COLOR.green : "#EEF9F5", color: invRet === item[0] ? "white" : COLOR.green }}>
                      {item[1]}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* ── 更多设置 ── */}
          <div>
            <button onClick={function() { setMoreOpen(!moreOpen); }} style={{ width: "100%", padding: "14px 20px", borderRadius: 16, border: "none", background: COLOR.card, cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: COLOR.text }}>更多设置</span>
              <span style={{ fontSize: 13, color: COLOR.muted }}>{moreOpen ? "收起 ▲" : "展开 ▼"}</span>
            </button>
            {moreOpen && (
              <Card p="20px" mb={0} style={{ marginTop: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.buy, marginBottom: 14 }}>买房参数</div>
                    <SliderField label="贷款利率" value={mRate} min={1} max={7} step={0.1} onChange={setMRate} display={mRate + "%"} color={COLOR.buy} sub={cur.country + " 参考 " + cur.d.mRate + "%"} />
                    <SliderField label="首付比例" value={downPct} min={5} max={50} step={5} onChange={setDownPct} display={downPct + "%"} color={COLOR.buy} sub={"= " + fmt(down)} />
                    <SliderField label="贷款年限" value={loanTerm} min={5} max={30} step={1} onChange={setLoanTerm} display={loanTerm + " 年"} color={COLOR.buy} />
                    <SliderField label="房价年涨幅" value={propGrowth} min={-2} max={6} step={0.5} onChange={setPropGrowth} display={propGrowth + "%"} color={COLOR.buy} sub="历史均值参考" />
                    <SliderField label="过户税/契税" value={txTax} min={0} max={5} step={0.5} onChange={setTxTax} display={txTax + "%"} color={COLOR.buy} sub={cur.country + " 参考 " + cur.d.txTax + "%，= " + fmt(txAmt)} />
                    <SliderField label="卖房中介费" value={agentFee} min={0} max={6} step={0.5} onChange={setAgentFee} display={agentFee + "%"} color={COLOR.buy} sub={cur.country + " 参考 " + cur.d.agentFee + "%"} />
                    <SliderField label="物业费涨幅" value={feeGrowth} min={0} max={5} step={0.5} onChange={setFeeGrowth} display={feeGrowth + "%"} color={COLOR.buy} sub="历史均值参考" />
                    <div style={{ marginBottom: 14 }}>
                      <Label>卖房资本利得税</Label>
                      <div style={{ fontSize: 11, color: COLOR.muted, marginBottom: 8 }}>自住满年限可免税（各地政策不同）</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[[true,"自住免税"],[false,"缴税30%"]].map(function(item) {
                          return (
                            <button key={String(item[0])} onClick={function() { setPrimaryRes(item[0]); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "2px solid", cursor: "pointer", fontSize: 12, fontWeight: 600, borderColor: primaryRes === item[0] ? COLOR.buy : COLOR.border, background: primaryRes === item[0] ? "#EEF0FF" : "white", color: primaryRes === item[0] ? COLOR.buy : COLOR.muted }}>
                              {item[1]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.green, marginBottom: 14 }}>租房参数</div>
                    <SliderField label="租金年增幅" value={rentGrowth} min={0} max={5} step={0.1} onChange={setRentGrowth} display={rentGrowth + "%"} color={COLOR.green} sub="历史参考约1-2%/年" />
                    <div style={{ marginBottom: 14 }}>
                      <Label>投资资本利得税</Label>
                      <div style={{ fontSize: 11, color: COLOR.muted, marginBottom: 8 }}>各地税率不同，按实际填写</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[[20,"20%"],[30,"30%"],[0,"免税"]].map(function(item) {
                          return (
                            <button key={item[0]} onClick={function() { setInvTax(item[0]); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "2px solid", cursor: "pointer", fontSize: 12, fontWeight: 600, borderColor: invTax === item[0] ? COLOR.green : COLOR.border, background: invTax === item[0] ? "#EEF9F5" : "white", color: invTax === item[0] ? COLOR.green : COLOR.muted }}>
                              {item[1]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* ── 净资产走势图 ── */}
          <Card mb={0} p="20px" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>净资产走势</span>
              <span style={{ fontSize: 12, color: buyWins ? COLOR.buy : COLOR.green, fontWeight: 700 }}>{crossStatus}</span>
            </div>
            <div style={{ fontSize: 12, color: COLOR.muted, marginBottom: 16 }}>如当年退出（卖房/清仓）的税后到手金额</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["net","净资产走势"],["cost","累计支出"]].map(function(item) {
                return (
                  <button key={item[0]} onClick={function() { setTab(item[0]); }} style={{ flex: 1, padding: "9px 0", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: tab === item[0] ? COLOR.primary : "#F4F3FF", color: tab === item[0] ? "white" : COLOR.muted }}>
                    {item[1]}
                  </button>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR.buy} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLOR.buy} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLOR.green} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLOR.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#E8E8EC" vertical={false} />
                <XAxis dataKey="yr" tick={{ fill: COLOR.muted, fontSize: 10 }} stroke="none" interval={4} tickFormatter={function(v) { return "Y" + v; }} />
                <YAxis tick={{ fill: COLOR.muted, fontSize: 10 }} stroke="none" tickFormatter={fmtK} width={52} />
                <Tooltip content={<ChartTip fmtK={fmtK} />} />
                {crossings.map(function(cx, idx) {
                  var lc = cx.dir === "buy" ? COLOR.buy : COLOR.green;
                  return (
                    <ReferenceLine key={idx} x={cx.yr} stroke={lc} strokeDasharray="4 3"
                      label={{ value: "第" + cx.yr + "年", fill: lc, fontSize: 10, position: idx % 2 === 0 ? "insideTopRight" : "insideBottomRight" }} />
                  );
                })}
                {tab === "net" && <Area type="monotone" dataKey="BuyNet" name={"买房净资产" + (mode === "diff" ? "(" + effBuyArea + "m²)" : "")} stroke={COLOR.buy} strokeWidth={2.5} fill="url(#gBuy)" dot={false} activeDot={{ r: 5, fill: COLOR.buy }} />}
                {tab === "net" && <Area type="monotone" dataKey="RentNet" name={"租房投资组合" + (mode === "diff" ? "(" + effRentArea + "m²)" : "")} stroke={COLOR.green} strokeWidth={2.5} fill="url(#gRent)" dot={false} activeDot={{ r: 5, fill: COLOR.green }} />}
                {tab === "cost" && <Area type="monotone" dataKey="BuyOut" name="买房累计支出" stroke={COLOR.buy} strokeWidth={2.5} fill="url(#gBuy)" dot={false} />}
                {tab === "cost" && <Area type="monotone" dataKey="RentOut" name="租房累计支出" stroke={COLOR.green} strokeWidth={2.5} fill="url(#gRent)" dot={false} />}
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* ── Mode 2 切换分析（已移除）── */}

          {/* ── 敏感性热力图 ── */}
          <Card p="20px" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>敏感性热力图</div>
            <div style={{ fontSize: 12, color: COLOR.muted, marginBottom: 14, lineHeight: 1.6 }}>
              横轴：投资收益率 · 纵轴：租金单价<br />
              <span style={{ fontSize: 11 }}>蓝色 = 买房净资产更高 · 绿色 = 租房净资产更高 · 颜色越深差距越大（占房价%）</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 360 }}>
                <div style={{ display: "flex", marginBottom: 4 }}>
                  <div style={{ width: 88, flexShrink: 0 }} />
                  {INV_RANGE.map(function(ir) {
                    return (
                      <div key={ir} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: Math.round(invRet) === ir ? 800 : 400, color: Math.round(invRet) === ir ? COLOR.primary : COLOR.muted }}>
                        {ir}%
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 9, color: COLOR.muted, textAlign: "center", marginBottom: 6, marginLeft: 88 }}>
                  投资收益率（年化）
                </div>
                <div style={{ position: "relative" }}>
                  {heatmapRentRange.map(function(rp, ri) {
                    var diff0 = Math.round(mortgage + fee - rp * effRentArea);
                    return (
                      <div key={rp} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
                        <div style={{ width: 88, flexShrink: 0, paddingRight: 8, overflow: "hidden" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.text, textAlign: "right", whiteSpace: "nowrap" }}>
                            {diff0 > 0 ? ("差 " + fmtK(diff0)) : diff0 < 0 ? ("差 " + fmtK(diff0)) : "持平"}
                          </div>
                          <div style={{ fontSize: 9, color: COLOR.muted, textAlign: "right", whiteSpace: "nowrap" }}>
                            {fmtSym(rp) + "/m²"}
                          </div>
                        </div>
                        {heatmap[ri] && heatmap[ri].map(function(diff, ii) {
                          var absD = Math.abs(diff);
                          var opacity = Math.min(absD / 60, 0.85);
                          var bg = diff > 0 ? "rgba(91,91,214," + opacity + ")" : diff < 0 ? "rgba(30,155,107," + opacity + ")" : "#F4F3FF";
                          var tc = opacity > 0.45 ? "white" : (diff > 0 ? COLOR.buy : diff < 0 ? COLOR.green : COLOR.muted);
                          return (
                            <div key={ii} style={{ flex: 1, height: 34, borderRadius: 6, background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginRight: ii < INV_RANGE.length - 1 ? 2 : 0, overflow: "hidden", minWidth: 0 }}>
                              <div style={{ fontSize: 8, fontWeight: 700, color: tc, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                                {diff > 0 ? "买+" : diff < 0 ? "租+" : "平"}
                              </div>
                              {absD > 0 && (
                                <div style={{ fontSize: 8, color: tc, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                                  {absD + "%"}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {(function() {
                    var ROW_H = 37;
                    var rentRangeMin = heatmapRentRange[0];
                    var rentRangeMax = heatmapRentRange[heatmapRentRange.length - 1];
                    var cInv  = Math.min(Math.max(invRet, INV_RANGE[0]), INV_RANGE[INV_RANGE.length - 1]);
                    var cRent = Math.min(Math.max(rentPPM, rentRangeMin), rentRangeMax);
                    var xFrac = (cInv - INV_RANGE[0]) / (INV_RANGE[INV_RANGE.length - 1] - INV_RANGE[0]);
                    var yFrac = (cRent - rentRangeMin) / (rentRangeMax - rentRangeMin);
                    var topPx = yFrac * (heatmapRentRange.length - 1) * ROW_H + ROW_H / 2;
                    return (
                      <div style={{ position: "absolute", top: topPx + "px", left: "calc(88px + " + xFrac + " * (100% - 88px))", transform: "translate(-50%, -50%)", width: 12, height: 12, borderRadius: "50%", background: COLOR.text, border: "2.5px solid white", boxShadow: "0 0 0 1.5px " + COLOR.text, pointerEvents: "none", zIndex: 2 }} />
                    );
                  })()}
                </div>
                <div style={{ marginLeft: 88, marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ width: 20, height: 12, borderRadius: 3, background: "rgba(91,91,214,0.7)" }} />
                  <span style={{ fontSize: 10, color: COLOR.muted }}>买房领先</span>
                  <div style={{ width: 20, height: 12, borderRadius: 3, background: "rgba(30,155,107,0.7)", marginLeft: 8 }} />
                  <span style={{ fontSize: 10, color: COLOR.muted }}>租房领先</span>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: COLOR.text, border: "2px solid white", boxShadow: "0 0 0 1.5px " + COLOR.text, marginLeft: 8 }} />
                  <span style={{ fontSize: 10, color: COLOR.muted }}>当前参数位置</span>
                </div>
              </div>
            </div>
          </Card>

          {/* ── N年后资产构成 ── */}
          <Card p="20px" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{loanTerm} 年后资产构成</div>
            <div style={{ fontSize: 12, color: COLOR.muted, marginBottom: 14 }}>如当年退出（卖房 / 清仓）税后到手</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.buy, marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid " + COLOR.buy }}>买房方案{mode === "diff" ? " (" + effBuyArea + "m²)" : ""}</div>
                {[
                  ["首次投入", fmt(outlay), COLOR.text, false, "首付 + 过户税 + 手续费"],
                  ["净投入", fmt(last ? last.BuyOut : 0), COLOR.text, false, loanTerm + "年全部现金流出"],
                  ["净资产", fmt(last ? last.rawB : 0), COLOR.buy, true, "税后可变现净值"],
                  ["流动性", "极低（3-6月）", COLOR.muted, false, null],
                  ["分散度", "单一不动产", COLOR.muted, false, null],
                  ["杠杆", Math.round(100/downPct) + " 倍", COLOR.muted, false, null],
                ].map(function(r, i) {
                  return (
                    <div key={i} style={{ padding: "7px 0", borderBottom: i < 5 ? "1px solid " + COLOR.border : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: COLOR.muted }}>{r[0]}</span>
                        <span style={{ fontSize: 11, fontWeight: r[3] ? 800 : 600, color: r[2] }}>{r[1]}</span>
                      </div>
                      {r[4] && <div style={{ fontSize: 10, color: "#B0B4BE", marginTop: 2 }}>{r[4]}</div>}
                    </div>
                  );
                })}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLOR.green, marginBottom: 10, paddingBottom: 8, borderBottom: "2px solid " + COLOR.green }}>租房方案{mode === "diff" ? " (" + effRentArea + "m²)" : ""}</div>
                {[
                  ["首次投入", fmt(outlay), COLOR.text, false, "同等金额第0天全部入市"],
                  ["净投入", fmt(last ? last.RentOut : 0), COLOR.text, false, loanTerm + "年租金（沉没成本）"],
                  ["净资产", fmt(last ? last.rawR : 0), COLOR.green, true, "税后投资组合市值"],
                  ["流动性", "极高（1-3天）", COLOR.muted, false, null],
                  ["分散度", "可全球分散", COLOR.muted, false, null],
                  ["杠杆", "无", COLOR.muted, false, null],
                ].map(function(r, i) {
                  return (
                    <div key={i} style={{ padding: "7px 0", borderBottom: i < 5 ? "1px solid " + COLOR.border : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: COLOR.muted }}>{r[0]}</span>
                        <span style={{ fontSize: 11, fontWeight: r[3] ? 800 : 600, color: r[2] }}>{r[1]}</span>
                      </div>
                      {r[4] && <div style={{ fontSize: 10, color: "#B0B4BE", marginTop: 2 }}>{r[4]}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ background: buyWins ? "#EEF0FF" : "#EEF9F5", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: buyWins ? COLOR.buy : COLOR.green }}>
                {loanTerm} 年后{buyWins ? "买房" : "租房"}净资产领先
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: COLOR.text, fontFamily: "monospace" }}>
                {fmt(last ? Math.abs(last.rawB - last.rawR) : 0)}
              </span>
            </div>
          </Card>

          {/* ── 保本收益率 ── */}
          <Card p="20px" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>保本收益率</div>
            <div style={{ fontSize: 12, color: COLOR.muted, marginBottom: 16, lineHeight: 1.6 }}>
              租房方案中，每月节省的差额用于投资。<strong style={{ color: COLOR.text }}>理财年化收益率需达到多少，{loanTerm} 年后净资产才能追平买房？</strong>
            </div>
            <div style={{ display: "flex", alignItems: "stretch", gap: 14, marginBottom: 16 }}>
              <div style={{ background: invRet >= breakEvenRate ? "#EEF9F5" : "#EEF0FF", borderRadius: 16, padding: "16px 20px", textAlign: "center", minWidth: 90 }}>
                <div style={{ fontSize: 11, color: COLOR.muted, marginBottom: 4 }}>保本线</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: invRet >= breakEvenRate ? COLOR.green : COLOR.buy, fontFamily: "monospace", lineHeight: 1 }}>
                  {breakEvenRate}%
                </div>
                <div style={{ fontSize: 10, color: COLOR.muted, marginTop: 4 }}>年化收益率</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: invRet >= breakEvenRate ? COLOR.green : COLOR.buy, marginBottom: 6 }}>
                  {invRet >= breakEvenRate ? "你设定的 " + invRet + "% ≥ 保本线 ✓" : "你设定的 " + invRet + "% < 保本线"}
                </div>
                <div style={{ fontSize: 12, color: COLOR.sub, lineHeight: 1.6 }}>
                  {invRet >= breakEvenRate ? "当前收益率已超过保本线，租房+投资的净资产更高。" : "当前收益率低于保本线，" + loanTerm + "年后买房净资产更高。"}
                </div>
              </div>
            </div>
            <div style={{ background: COLOR.bg, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.text, marginBottom: 6 }}>为什么保本线是 {breakEvenRate}%？</div>
              <div style={{ fontSize: 11, color: COLOR.muted, lineHeight: 1.7 }}>
                · 房价年涨 {propGrowth}% 是最大的买房优势来源<br />
                · 月差额 {fmt(Math.abs(saving))} {saving >= 0 ? "越大，可投资的钱越多，保本线越低" : "（租房更贵），拉低租房净资产"}<br />
                · 买房交易成本（过户税 {txTax}% + 中介费 {agentFee}%）增加买房阻力<br />
                · 投资收益需缴 {invTax}% 资本利得税，而买房自住免税
              </div>
            </div>
          </Card>

          {/* ── 综合对比 ── */}
          <Card p="20px" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>综合对比</div>
            <div style={{ fontSize: 12, color: COLOR.muted, marginBottom: 14, lineHeight: 1.6 }}>
              买房和租房各有真实的好处。有明显优劣之分的维度会标注占优方，各有各好处的则并列展示。
            </div>

            {/* 列标题 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.buy, background: "#EEF0FF", borderRadius: 8, padding: "7px 10px" }}>买房能获得</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.green, background: "#EEF9F5", borderRadius: 8, padding: "7px 10px" }}>租房能获得</div>
            </div>

            {/* 财务维度 */}
            <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>财务维度</div>
            {[
              {
                label: "初始资金",
                buy: "首付+手续费共 " + fmt(outlay) + "，换来 " + fmt(price) + " 的房产，" + Math.round(100 / downPct) + " 倍杠杆从第一天起放大增值空间",
                rent: "同等 " + fmt(outlay) + " 全部入市，立即开始复利滚动，随时可动用或调仓，不被单一资产锁定",
                adv: "tie",
              },
              {
                label: "月度积累",
                buy: "月供本金部分是强制储蓄，" + loanTerm + " 年后房产完全属于自己，还清后彻底告别月供",
                rent: saving >= 0
                  ? "月租 " + fmt(rent0) + "，每月节省 " + fmt(saving) + " 可追加投资，现金流更充裕"
                  : "月租 " + fmt(rent0) + "，收入下降时可换小房主动降负，月支出灵活可调",
                adv: saving >= 0 ? COLOR.green : COLOR.buy,
              },
              {
                label: loanTerm + " 年后净资产",
                buy: "房产预计市值 " + fmt(last ? last.rawPV : 0) + "，扣除贷款余额和交易成本后到手 " + fmt(last ? last.rawB : 0),
                rent: "投资组合年化 " + invRet + "%，" + loanTerm + " 年后税后到手 " + fmt(last ? last.rawR : 0),
                adv: buyWins ? COLOR.buy : COLOR.green,
              },
              {
                label: "资产分散",
                buy: "持有实物资产，抵御通胀效果显著，房产兼具使用价值和资产价值",
                rent: "可分散至全球股票、债券等多类资产，单一市场下跌不会摧毁全部积累",
                adv: COLOR.green,
              },
              {
                label: "流动性",
                buy: "产权完整归属自己，可随时申请抵押贷款，出售后全部净值归属自己",
                rent: "投资组合 1–3 个工作日可变现，生活有重大变化时资金随时响应",
                adv: COLOR.green,
              },
              {
                label: "执行门槛",
                buy: "月供自动扣款，强制储蓄，执行率 100%，不依赖意志力，任何市场行情下都持续积累",
                rent: "需主动把 " + fmt(Math.abs(saving)) + "/月 纪律性投入理财，坚持 " + loanTerm + " 年，市场暴跌时尤其考验定力",
                adv: "tie",
              },
            ].map(function(row, idx) {
              var isTie = row.adv === "tie";
              var buyWinsRow = !isTie && row.adv === COLOR.buy;
              var rentWinsRow = !isTie && row.adv === COLOR.green;
              return (
                <div key={idx} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid " + COLOR.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{row.label}</span>
                    {isTie
                      ? <span style={{ fontSize: 10, fontWeight: 600, color: COLOR.muted, background: "#F2F2F5", padding: "2px 8px", borderRadius: 999 }}>各有优势</span>
                      : <span style={{ fontSize: 10, fontWeight: 700, color: row.adv, background: buyWinsRow ? "#EEF0FF" : "#EEF9F5", padding: "2px 8px", borderRadius: 999 }}>
                          {buyWinsRow ? "买房占优" : "租房占优"}
                        </span>
                    }
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.6, paddingLeft: 8,
                      borderLeft: "2.5px solid " + (isTie ? "#DDD" : buyWinsRow ? COLOR.buy : "#DDD"),
                      fontWeight: isTie ? 400 : buyWinsRow ? 600 : 400,
                      color: isTie ? COLOR.sub : buyWinsRow ? COLOR.text : "#ABABAB" }}>{row.buy}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, paddingLeft: 8,
                      borderLeft: "2.5px solid " + (isTie ? "#DDD" : rentWinsRow ? COLOR.green : "#DDD"),
                      fontWeight: isTie ? 400 : rentWinsRow ? 600 : 400,
                      color: isTie ? COLOR.sub : rentWinsRow ? COLOR.text : "#ABABAB" }}>{row.rent}</div>
                  </div>
                </div>
              );
            })}

            {/* 财务结论 */}
            <div style={{ background: buyWins ? "#EEF0FF" : "#EEF9F5", borderRadius: 12, padding: "12px 14px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: buyWins ? COLOR.buy : COLOR.green }}>
                  财务结论：{buyWins ? "买房" : "租房"}方案净资产更高
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", color: COLOR.text }}>
                  {loanTerm}年领先 {fmt(last ? Math.abs(last.rawB - last.rawR) : 0)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: COLOR.sub, lineHeight: 1.6 }}>
                保本收益率 <strong>{breakEvenRate}%</strong> — 租房方案年化收益需超过此值，净资产才能追平买房。当前设定 {invRet}% {invRet >= breakEvenRate ? "已超过，租房胜出" : "未超过，买房胜出"}。
              </div>
            </div>

            {/* 生活维度 */}
            <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>生活维度</div>
            {[
              {
                label: "居住保障",
                buy: "永久产权，住多久由自己决定，不受任何人驱逐，心理上真正的家",
                rent: "灵活自由，随时可以换环境，没有长期居住义务，生活选项始终开放",
                adv: "tie",
              },
              {
                label: "生活自由度",
                buy: "在一座城市深耕，建立稳定根基，适合长期规划定居",
                rent: "换城市、换工作零障碍，人生重大转折无需先解决房产",
                adv: COLOR.green,
              },
              {
                label: "个性化空间",
                buy: "完全自主改造装修，按自己的想法生活，添置长期物品无后顾之忧",
                rent: "无装修负担，入住即可使用，维修保养交给房东，省时省力",
                adv: "tie",
              },
              {
                label: "财务弹性",
                buy: "月供固定，不受租金市场波动影响，长期住房成本可准确预期",
                rent: "收入下降可主动换小房，月支出始终在自己掌控中",
                adv: "tie",
              },
              {
                label: "维修管理",
                buy: "完全掌控房屋，可按自己意愿升级改善，增值归属自己",
                rent: "维修保养联系房东即可，省去时间和精力，专注自己的生活",
                adv: "tie",
              },
              {
                label: "社区归属",
                buy: "长期定居形成深度邻里关系，归属感和安全感更强",
                rent: "接触不同社区和人群，生活体验更多元，适应力更强",
                adv: "tie",
              },
            ].map(function(row, idx) {
              var isTie = row.adv === "tie";
              var buyWinsRow = !isTie && row.adv === COLOR.buy;
              var rentWinsRow = !isTie && row.adv === COLOR.green;
              var isLast = idx === 5;
              return (
                <div key={idx} style={{ marginBottom: isLast ? 0 : 14, paddingBottom: isLast ? 0 : 14, borderBottom: isLast ? "none" : "1px solid " + COLOR.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{row.label}</span>
                    {isTie
                      ? <span style={{ fontSize: 10, fontWeight: 600, color: COLOR.muted, background: "#F2F2F5", padding: "2px 8px", borderRadius: 999 }}>各有优势</span>
                      : <span style={{ fontSize: 10, fontWeight: 700, color: row.adv, background: buyWinsRow ? "#EEF0FF" : "#EEF9F5", padding: "2px 8px", borderRadius: 999 }}>
                          {buyWinsRow ? "买房占优" : "租房占优"}
                        </span>
                    }
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.6, paddingLeft: 8,
                      borderLeft: "2.5px solid " + (isTie ? "#DDD" : buyWinsRow ? COLOR.buy : "#DDD"),
                      fontWeight: isTie ? 400 : buyWinsRow ? 600 : 400,
                      color: isTie ? COLOR.sub : buyWinsRow ? COLOR.text : "#ABABAB" }}>{row.buy}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, paddingLeft: 8,
                      borderLeft: "2.5px solid " + (isTie ? "#DDD" : rentWinsRow ? COLOR.green : "#DDD"),
                      fontWeight: isTie ? 400 : rentWinsRow ? 600 : 400,
                      color: isTie ? COLOR.sub : rentWinsRow ? COLOR.text : "#ABABAB" }}>{row.rent}</div>
                  </div>
                </div>
              );
            })}

            {/* 注脚 */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid " + COLOR.border, fontSize: 11, color: COLOR.muted, lineHeight: 1.8 }}>
              以上就是机会成本的本质：在另一方案中你能获得的这些好处，正是你选择当前方案时必须放弃的真实代价——你为这个决定所付出的隐性成本。
            </div>
          </Card>

          {/* ── 分享 & 导出 ── */}
          <div style={{ padding: "0 20px 8px" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyShareUrl}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "13px 0", borderRadius: 14, border: "1.5px solid",
                  borderColor: copied ? COLOR.green : COLOR.border,
                  background: copied ? "#EEF9F5" : "white",
                  color: copied ? COLOR.green : COLOR.sub,
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <span>{copied ? "✓" : "🔗"}</span>
                <span>{copied ? "链接已复制" : "复制分享链接"}</span>
              </button>
              <button onClick={exportImage} disabled={exporting}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "13px 0", borderRadius: 14, border: "1.5px solid " + COLOR.border,
                  background: exporting ? "#F4F3FF" : "white",
                  color: exporting ? COLOR.primary : COLOR.sub,
                  fontSize: 13, fontWeight: 600, cursor: exporting ? "default" : "pointer",
                  opacity: exporting ? 0.7 : 1, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <span>{exporting ? "⏳" : "🖼"}</span>
                <span>{exporting ? "生成中..." : "导出长图"}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

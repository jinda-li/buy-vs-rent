import { useState } from "react";
import { COLOR } from "./theme";
import { useLang } from "./i18n";

export function Label(props) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
      {props.children}
    </div>
  );
}

export function Card(props) {
  return (
    <div style={Object.assign({ background: COLOR.card, borderRadius: 22, padding: props.p || "20px", boxShadow: "0 16px 40px rgba(39,45,77,0.08)", border: "1px solid rgba(255,255,255,0.72)", marginBottom: props.mb || 12 }, props.style || {})}>
      {props.children}
    </div>
  );
}

export function InfoTip(props) {
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

export function clampNum(n, min, max) {
  if (min != null) n = Math.max(min, n);
  if (max != null) n = Math.min(max, n);
  return n;
}

export function sliderFillPct(value, min, max) {
  if (max <= min) return 0;
  var t = (value - min) / (max - min);
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  return t * 100;
}

export function EditableNum(props) {
  var i18n = useLang();
  var isZh = i18n.lang === "zh";
  var es = useState(false); var editing = es[0]; var setEditing = es[1];
  var vs = useState("");    var editVal = vs[0]; var setEditVal = vs[1];
  function startEdit() { setEditVal(String(props.value)); setEditing(true); }
  function commit(v) {
    var n = parseFloat(v);
    if (isNaN(n)) { setEditing(false); return; }
    props.onChange(n);
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
    <span onClick={startEdit} title={props.title || (isZh ? "点击直接输入数值" : "Click to type a value")}
      style={{ fontSize: props.fontSize || 16, fontWeight: 700, color: c, cursor: "text",
        borderBottom: "1.5px dashed " + c + "55" }}>
      {props.display}
    </span>
  );
}

export function SliderField(props) {
  var sliderVal = clampNum(props.value, props.min, props.max);
  var fillPct = sliderFillPct(props.value, props.min, props.max);
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <Label>{props.label}</Label>
        <EditableNum value={props.value} display={props.display} onChange={props.onChange} color={props.color} />
      </div>
      {props.sub && <div style={{ fontSize: 11, color: COLOR.muted, marginBottom: 6 }}>{props.sub}</div>}
      <div style={{ position: "relative", height: 6, borderRadius: 99, background: "#E8E8EC", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 99, background: props.color || COLOR.primary, width: fillPct + "%" }} />
        <input type="range" min={props.min} max={props.max} step={props.step} value={sliderVal}
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

export function Row(props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, marginBottom: 12, borderBottom: props.last ? "none" : "1px solid " + COLOR.border }}>
      <span style={{ fontSize: 13, color: COLOR.sub }}>{props.label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: props.color || COLOR.text, fontFamily: "monospace" }}>{props.value}</span>
    </div>
  );
}

export function ChartTip(props) {
  if (!props.active || !props.payload || !props.payload.length) return null;
  var fmtK = props.fmtK || function(v) { return String(Math.round(v)); };
  var yearLabel = props.yearLabel || function(v) { return "Year " + v; };
  return (
    <div style={{ background: COLOR.card, border: "1px solid " + COLOR.border, borderRadius: 12, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: COLOR.muted, marginBottom: 6 }}>{yearLabel(props.label)}</div>
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

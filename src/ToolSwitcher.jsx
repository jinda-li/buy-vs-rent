import { COLOR } from "./theme";
import { useLang } from "./i18n";
import { useTool } from "./tool";

var ORDER = ["rent", "leverage"];

export default function ToolSwitcher(props) {
  var i18n = useLang();
  var copy = i18n.copy;
  var toolState = useTool();
  var tool = toolState.tool;
  var setTool = toolState.setTool;

  return (
    <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 999, background: "#F4F4F8", border: "1px solid " + COLOR.border }}>
      {ORDER.map(function(key) {
        var active = tool === key;
        var label = (copy.tools && copy.tools[key] && copy.tools[key].nav) || key;
        return (
          <button key={key} onClick={function() { setTool(key); }}
            style={{ border: "none", borderRadius: 999, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
              background: active ? COLOR.primary : "transparent", color: active ? "white" : COLOR.muted }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

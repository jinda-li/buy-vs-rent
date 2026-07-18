import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";

var STORAGE_KEY = "bvr-tool";
var TOOLS = ["rent", "leverage"];

function normalizeTool(value) {
  return TOOLS.indexOf(value) !== -1 ? value : null;
}

function readQueryTool() {
  if (typeof window === "undefined") return null;
  var params = new URLSearchParams(window.location.search);
  return normalizeTool(params.get("tool"));
}

export function detectTool() {
  if (typeof window === "undefined") return "rent";
  return readQueryTool()
    || normalizeTool(window.localStorage.getItem(STORAGE_KEY))
    || "rent";
}

var ToolContext = createContext(null);

export function ToolProvider(props) {
  var state = useState(detectTool);
  var tool = state[0];
  var setToolState = state[1];

  function setTool(next) {
    var normalized = normalizeTool(next) || "rent";
    setToolState(normalized);
  }

  useEffect(function() {
    window.localStorage.setItem(STORAGE_KEY, tool);
    var url = new URL(window.location.href);
    url.searchParams.set("tool", tool);
    window.history.replaceState(null, "", url.pathname + "?" + url.searchParams.toString() + url.hash);
  }, [tool]);

  var value = useMemo(function() { return { tool: tool, setTool: setTool }; }, [tool]);
  return createElement(ToolContext.Provider, { value: value }, props.children);
}

export function useTool() {
  var value = useContext(ToolContext);
  if (!value) throw new Error("useTool must be used inside ToolProvider");
  return value;
}

import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
import en from "./en";
import zh from "./zh";

const STORAGE_KEY = "bvr-lang";
const messages = { en, zh };

function normalizeLang(value) {
  if (!value) return null;
  return String(value).toLowerCase().startsWith("zh") ? "zh" : String(value).toLowerCase().startsWith("en") ? "en" : null;
}

function readHashLang() {
  try {
    var h = window.location.hash.slice(1);
    if (!h) return null;
    var p = JSON.parse(atob(h));
    return normalizeLang(p && p.lang);
  } catch (e) {
    return null;
  }
}

export function detectLang() {
  if (typeof window === "undefined") return "en";
  var params = new URLSearchParams(window.location.search);
  return normalizeLang(params.get("lang"))
    || readHashLang()
    || normalizeLang(window.localStorage.getItem(STORAGE_KEY))
    || normalizeLang(window.navigator.language)
    || "en";
}

const LangContext = createContext(null);

export function LangProvider(props) {
  var state = useState(detectLang);
  var lang = state[0];
  var setLangState = state[1];

  function setLang(nextLang) {
    var normalized = normalizeLang(nextLang) || "en";
    setLangState(normalized);
  }

  useEffect(function() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  var value = useMemo(function() {
    var dict = messages[lang] || messages.en;
    return {
      lang: lang,
      setLang: setLang,
      copy: dict,
    };
  }, [lang]);

  return createElement(LangContext.Provider, { value: value }, props.children);
}

export function useLang() {
  var value = useContext(LangContext);
  if (!value) throw new Error("useLang must be used inside LangProvider");
  return value;
}

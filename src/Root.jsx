import { useEffect } from "react";
import BuyVsRent from "../buy-vs-rent.jsx";
import MortgageLeverage from "../mortgage-leverage.jsx";
import { useLang } from "./i18n";
import { useTool } from "./tool";

export default function Root() {
  var i18n = useLang();
  var toolState = useTool();
  var tool = toolState.tool;
  var copy = i18n.copy;

  useEffect(function() {
    var meta = (copy.tools && copy.tools[tool]) || { title: copy.metaTitle, description: copy.metaDescription };
    document.title = meta.title;
    var descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.setAttribute("content", meta.description);
  }, [tool, copy]);

  return tool === "leverage" ? <MortgageLeverage /> : <BuyVsRent />;
}

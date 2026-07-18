import { useLang } from "./i18n";
import ToolSwitcher from "./ToolSwitcher";

export default function SiteFooter() {
  var i18n = useLang();
  var copy = i18n.copy;
  return (
    <div className="bvr-footer">
      <span className="bvr-footer-note">{copy.footerMore}</span>
      <ToolSwitcher />
    </div>
  );
}

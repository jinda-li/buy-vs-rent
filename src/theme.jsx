export var COLOR = {
  bg: "#F4F3FF", card: "#FFFFFF", primary: "#5B5BD6", green: "#1E9B6B",
  text: "#1C2024", sub: "#60646C", muted: "#87909F", border: "#E8E8EC",
  buy: "#5B5BD6", rent: "#1E9B6B",
  amber: "#B45309", loss: "#D14343",
};

export function GlobalStyles() {
  return (
    <style>{`
      .bvr-page { background: #EDEFF4; }
      .bvr-shell {
        width: min(1200px, calc(100vw - 40px));
        margin: 0 auto;
        padding: 20px 0 48px;
      }
      .bvr-nav {
        display: flex;
        align-items: center;
        gap: 18px;
        background: #FFFFFF;
        border: 1px solid #ECEDF2;
        border-radius: 18px;
        box-shadow: 0 10px 30px rgba(39, 45, 77, 0.05);
        padding: 12px 20px;
        margin-bottom: 16px;
      }
      .bvr-brand { display: flex; align-items: center; }
      .bvr-nav-meta { color: ${COLOR.muted}; font-size: 13px; }
      .bvr-nav-spacer { flex: 1; }
      .bvr-nav-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
      .bvr-card-base {
        background: #FFFFFF;
        border: 1px solid #ECEDF2;
        border-radius: 22px;
        box-shadow: 0 12px 34px rgba(39, 45, 77, 0.06);
      }
      .bvr-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 14px;
        margin-bottom: 16px;
      }
      .bvr-currency-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
      }
      .bvr-mode-grid,
      .bvr-card-grid,
      .bvr-settings-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
      }
      .bvr-assume-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        align-items: start;
      }
      .bvr-panel {
        background: #FFFFFF;
        border: 1px solid #ECEDF2;
        border-radius: 22px;
        box-shadow: 0 12px 34px rgba(39, 45, 77, 0.06);
        padding: 22px;
        margin-bottom: 16px;
      }
      .bvr-setup-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        align-items: start;
      }
      .bvr-setup-block { min-width: 0; }
      .bvr-setup-currency .bvr-currency-grid {
        grid-template-columns: 1fr 1fr !important;
      }
      .bvr-setup-mode .bvr-mode-grid {
        grid-template-columns: 1fr 1fr !important;
      }
      .bvr-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: stretch;
        margin-bottom: 16px;
      }
      .bvr-col {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
      }
      .bvr-col > * { margin: 0 !important; }
      .bvr-col-chart { min-height: 100%; }
      .bvr-col-chart > div {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        height: 100%;
      }
      .bvr-col-chart .bvr-chart-body {
        flex: 1;
        min-height: 280px;
      }
      .bvr-col-inputs > .bvr-param-pair { flex: 1; }
      .bvr-param-pair {
        align-items: stretch !important;
      }
      .bvr-param-pair > * {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .bvr-more-wrap { grid-column: 1 / -1; min-width: 0; align-self: start; }
      .bvr-more-btn {
        width: 100%;
        padding: 12px 16px;
        border-radius: 16px;
        border: none;
        background: #FFFFFF;
        cursor: pointer;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        text-align: left;
      }
      .bvr-more-btn-main {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
        overflow: hidden;
      }
      .bvr-more-btn-title {
        font-size: 14px;
        font-weight: 600;
        color: ${COLOR.text};
        flex-shrink: 0;
      }
      .bvr-more-btn-hint {
        font-size: 11px;
        color: ${COLOR.muted};
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bvr-more-btn-toggle {
        font-size: 13px;
        color: ${COLOR.muted};
        flex-shrink: 0;
      }
      .bvr-insights {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: stretch;
        margin-bottom: 16px;
      }
      .bvr-insights > * { margin: 0 !important; min-width: 0; }
      .bvr-insights-heatmap,
      .bvr-insights-asset { display: flex; flex-direction: column; }
      .bvr-insights-heatmap > *,
      .bvr-insights-asset > * { flex: 1; width: 100%; }
      .bvr-insights-breakeven { grid-column: 1 / -1; }
      .bvr-tail {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .bvr-tail > * { margin: 0 !important; }
      .bvr-actions { padding: 0 !important; }
      .bvr-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
        background: #FFFFFF;
        border: 1px solid #ECEDF2;
        border-radius: 18px;
        box-shadow: 0 10px 30px rgba(39, 45, 77, 0.05);
        padding: 14px 20px;
        margin-top: 20px;
      }
      .bvr-footer-note { font-size: 12px; color: ${COLOR.muted}; line-height: 1.6; }
      @media (max-width: 880px) {
        .bvr-shell { width: calc(100vw - 24px); padding-top: 12px; }
        .bvr-nav { flex-wrap: wrap; gap: 12px; padding: 12px 14px; }
        .bvr-nav-meta { width: 100%; order: 3; }
        .bvr-nav-spacer { display: none; }
        .bvr-nav-actions { width: 100%; justify-content: flex-start; }
        .bvr-card-grid,
        .bvr-settings-grid,
        .bvr-assume-grid { grid-template-columns: 1fr !important; }
        .bvr-grid { grid-template-columns: 1fr !important; }
        .bvr-insights { grid-template-columns: 1fr; }
        .bvr-insights-breakeven { grid-column: 1; }
        .bvr-setup-row { grid-template-columns: 1fr; }
        .bvr-setup-mode .bvr-mode-grid { grid-template-columns: 1fr !important; }
        .bvr-footer { flex-direction: column; align-items: stretch; text-align: center; }
      }
    `}</style>
  );
}

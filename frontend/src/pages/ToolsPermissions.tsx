import { useState } from "react";
import { DEMO_TOOLS, CATEGORY_LABELS, type DemoTool } from "../fixtures/tools";
import { ToolCategoryBadge, RoleBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { Wrench, X, Search, Filter } from "lucide-react";

type Category = DemoTool["category"] | "all";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all",         label: "All Categories" },
  { value: "data-read",   label: "Data Read" },
  { value: "data-write",  label: "Data Write" },
  { value: "admin",       label: "Administrative" },
  { value: "reporting",   label: "Reporting" },
];

export default function ToolsPermissions() {
  const [search, setSearch]   = useState("");
  const [cat, setCat]         = useState<Category>("all");
  const [selected, setSelected] = useState<DemoTool | null>(null);

  const filtered = DEMO_TOOLS.filter(
    (t) =>
      (cat === "all" || t.category === cat) &&
      (t.name.toLowerCase().includes(search.toLowerCase()) ||
       t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Tools & Permissions</div>
          <div className="page-subtitle">
            Inventory of authorized tools. Each tool's access is governed by a backend policy.
          </div>
        </div>
        <div className="page-actions">
          <span style={{ fontSize:"10.5px", color:"var(--text-tertiary)", background:"var(--warning-bg)", border:"1px solid var(--warning-line)", padding:"3px 8px", borderRadius:"var(--r-xs)", fontWeight:600 }}>
            DEMO DATA
          </span>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 320px" : "1fr", gap:"var(--sp-4)", alignItems:"start" }}>
        <div className="card">
          {/* Filter bar */}
          <div className="filter-bar">
            <div className="search-field" style={{ flex:1, maxWidth:260 }}>
              <span className="search-field-icon"><Search size={13} strokeWidth={2} /></span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools…"
                style={{ fontSize:"12px" }}
                aria-label="Search tools"
              />
            </div>
            <Filter size={13} strokeWidth={2} style={{ color:"var(--text-tertiary)", flexShrink:0 }} />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value as Category)}
              style={{ width:"auto", fontSize:"12px", padding:"5px 10px" }}
              aria-label="Filter by category"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <span style={{ fontSize:"11px", color:"var(--text-tertiary)", marginLeft:"auto" }}>
              {filtered.length} tool{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState Icon={Wrench} title="No tools found" message="Try adjusting the search or category filter." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Category</th>
                    <th>Min Role</th>
                    <th>Resource Scope</th>
                    <th>Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tool) => (
                    <tr
                      key={tool.id}
                      onClick={() => setSelected(selected?.id === tool.id ? null : tool)}
                      style={{ background: selected?.id === tool.id ? "var(--accent-dim)" : undefined }}
                    >
                      <td>
                        <code className="code-token" style={{ fontSize:"12px" }}>{tool.name}</code>
                        <div style={{ fontSize:"11px", color:"var(--text-tertiary)", marginTop:3, maxWidth:260 }}>
                          {tool.description}
                        </div>
                      </td>
                      <td><ToolCategoryBadge category={tool.category} /></td>
                      <td><RoleBadge role={tool.requiredRole} /></td>
                      <td className="mono" style={{ fontSize:"10.5px", color:"var(--text-secondary)" }}>
                        {tool.resourceScope}
                      </td>
                      <td className="mono" style={{ fontSize:"10.5px", color:"var(--text-tertiary)" }}>
                        {tool.policyId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="detail-panel">
            <div style={{ padding:"var(--sp-4) var(--sp-5)", borderBottom:"1px solid var(--border-soft)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:700, fontSize:"13px" }}>Tool Detail</div>
              <button className="btn btn-ghost btn-xs" onClick={() => setSelected(null)} aria-label="Close">
                <X size={13} />
              </button>
            </div>
            <div style={{ padding:"var(--sp-5)" }}>
              <div style={{ marginBottom:"var(--sp-4)" }}>
                <code style={{ fontFamily:"var(--mono)", fontSize:"14px", fontWeight:700, color:"var(--text-primary)" }}>
                  {selected.name}
                </code>
                <div style={{ marginTop:"var(--sp-2)", display:"flex", gap:"var(--sp-2)", flexWrap:"wrap" }}>
                  <ToolCategoryBadge category={selected.category} />
                  <RoleBadge role={selected.requiredRole} />
                </div>
              </div>

              <div style={{ fontSize:"12.5px", color:"var(--text-secondary)", lineHeight:1.65, marginBottom:"var(--sp-4)" }}>
                {selected.description}
              </div>

              <div className="info-list">
                {[
                  ["Category",       CATEGORY_LABELS[selected.category]],
                  ["Required Role",  selected.requiredRole],
                  ["Resource Scope", selected.resourceScope],
                  ["Governing Policy", selected.policyId],
                ].map(([k, v]) => (
                  <div key={k} className="info-item">
                    <span className="info-key">{k}</span>
                    <span className="info-val">{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:"var(--sp-5)", padding:"10px 12px", background:"var(--surface-raised)", border:"1px solid var(--border)", borderRadius:"var(--r)", fontSize:"11px", color:"var(--text-tertiary)", lineHeight:1.6 }}>
                Tool availability and permissions are enforced by the backend. This display reflects the policy configuration at last inspection.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

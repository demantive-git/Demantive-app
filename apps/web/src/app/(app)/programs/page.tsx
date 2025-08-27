"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AppNav } from "@/components/AppNav";

function ProgramsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [coverage, setCoverage] = useState<{ total: number; mapped: number }>({
    total: 0,
    mapped: 0,
  });
  const orgId = searchParams.get("org");

  useEffect(() => {
    if (!orgId) {
      router.replace("/orgs");
      return;
    }
    loadPrograms();
    calculateCoverage();
  }, [orgId]);

  async function loadPrograms() {
    const { data, error } = await supabase
      .from("programs")
      .select(
        `
        *,
        program_rules (
          id,
          rule_type,
          field,
          pattern,
          enabled,
          priority
        )
      `,
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPrograms(data);
    }
    setLoading(false);
  }

  async function calculateCoverage() {
    // Get total opportunities
    const { count: totalOpps } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);

    // Get mapped opportunities
    const { count: mappedOpps } = await supabase
      .from("record_programs")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("record_type", "opportunity");

    setCoverage({
      total: totalOpps || 0,
      mapped: mappedOpps || 0,
    });
  }

  async function createProgram(name: string, description: string, color: string) {
    const { error } = await supabase.from("programs").insert({
      org_id: orgId,
      name,
      description,
      color,
    });

    if (!error) {
      loadPrograms();
      setShowCreateModal(false);
    }
  }

  async function updateProgram(programId: string, updates: any) {
    const { error } = await supabase.from("programs").update(updates).eq("id", programId);

    if (!error) {
      loadPrograms();
      setShowEditModal(false);
      setEditingProgram(null);
    }
  }

  async function runProgramMapping() {
    // This will apply all active rules to map opportunities to programs
    const response = await fetch("/api/programs/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });

    if (response.ok) {
      loadPrograms();
      calculateCoverage();
    }
  }

  const coveragePercent =
    coverage.total > 0 ? Math.round((coverage.mapped / coverage.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600">Loading programs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Programs</h1>
              <p className="text-gray-500 mt-2 text-lg">
                Map your marketing campaigns to track ROI
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create program
            </button>
          </div>
        </div>
      </div>

      {/* Coverage Meter */}
      <div className="px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Pipeline Coverage</h3>
                <p className="text-gray-500 mt-1">
                  {coverage.mapped} of {coverage.total} opportunities mapped to programs
                </p>
              </div>
              {programs.length > 0 && (
                <button
                  onClick={runProgramMapping}
                  className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Run mapping
                </button>
              )}
            </div>
            <div className="relative">
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-indigo-600 h-4 rounded-full transition-all duration-700 relative overflow-hidden"
                  style={{ width: `${coveragePercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm font-medium text-gray-700">{coveragePercent}% coverage</p>
                {coveragePercent < 100 && (
                  <p className="text-xs text-gray-500">{100 - coveragePercent}% unmapped</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Programs List */}
      <div className="px-6 sm:px-8 lg:px-12 pb-12">
        <div className="max-w-7xl mx-auto">
          {programs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">No programs yet</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg">
                Programs help you group opportunities by marketing campaign source. Create your
                first program to start tracking what's driving pipeline.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-hover transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create your first program
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="p-8">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-5">
                        <div
                          className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0 ring-4 ring-opacity-20"
                          style={{
                            backgroundColor: program.color,
                            boxShadow: `0 0 0 4px ${program.color}20`,
                          }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-xl text-gray-900 mb-1">
                            {program.name}
                          </h3>
                          {program.description && (
                            <p className="text-gray-500 mb-4">{program.description}</p>
                          )}
                          <div className="space-y-2">
                            {program.program_rules?.length > 0 ? (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                  Mapping Rules
                                </p>
                                <div className="space-y-2">
                                  {program.program_rules.map((rule: any) => (
                                    <div key={rule.id} className="flex items-center gap-3">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                                          rule.enabled
                                            ? "bg-success/10 text-success"
                                            : "bg-gray-100 text-gray-500"
                                        }`}
                                      >
                                        {rule.enabled ? (
                                          <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        ) : (
                                          <svg
                                            className="w-3 h-3"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M6 18L18 6M6 6l12 12"
                                            />
                                          </svg>
                                        )}
                                        {rule.enabled ? "Active" : "Disabled"}
                                      </span>
                                      <span className="text-sm text-gray-600">
                                        {rule.field} {rule.rule_type} "{rule.pattern}"
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic">No rules defined</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditingProgram(program);
                          setShowEditModal(true);
                        }}
                        className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors group-hover:text-primary"
                      >
                        Edit →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProgramModal onClose={() => setShowCreateModal(false)} onCreate={createProgram} />
      )}

      {/* Edit Modal */}
      {showEditModal && editingProgram && (
        <EditProgramModal
          program={editingProgram}
          orgId={orgId!}
          onClose={() => {
            setShowEditModal(false);
            setEditingProgram(null);
          }}
          onUpdate={(updates: any) => updateProgram(editingProgram.id, updates)}
          onRulesUpdated={() => loadPrograms()}
        />
      )}
    </div>
  );
}

// Create Program Modal Component
function CreateProgramModal({ onClose, onCreate }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#007AFF");

  const colors = [
    "#007AFF", // Blue
    "#34C759", // Green
    "#FF9500", // Orange
    "#FF3B30", // Red
    "#5856D6", // Purple
    "#FF2D55", // Pink
    "#5AC8FA", // Light Blue
    "#FFCC00", // Yellow
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md animate-slide-in">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create Program</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 placeholder-gray-400"
              placeholder="e.g., Webinar Series"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 placeholder-gray-400 resize-none"
              rows={3}
              placeholder="What does this program track?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Color</label>
            <div className="flex gap-3">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-xl transition-all ${color === c ? "ring-2 ring-offset-2 ring-gray-900 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => {
              if (name) onCreate(name, description, color);
            }}
            disabled={!name}
            className="flex-1 bg-primary text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            Create Program
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-gray-200 px-5 py-3 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Program Modal Component
function EditProgramModal({ program, orgId, onClose, onUpdate, onRulesUpdated }: any) {
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description || "");
  const [rules, setRules] = useState(program.program_rules || []);
  const [newRule, setNewRule] = useState({
    field: "source",
    rule_type: "contains",
    pattern: "",
  });

  async function addRule() {
    if (!newRule.pattern) return;

    const { error } = await supabase.from("program_rules").insert({
      org_id: orgId,
      program_id: program.id,
      ...newRule,
    });

    if (!error) {
      onRulesUpdated();
      setNewRule({ field: "source", rule_type: "contains", pattern: "" });
    }
  }

  async function toggleRule(ruleId: string, enabled: boolean) {
    const { error } = await supabase.from("program_rules").update({ enabled }).eq("id", ruleId);

    if (!error) {
      onRulesUpdated();
    }
  }

  async function deleteRule(ruleId: string) {
    const { error } = await supabase.from("program_rules").delete().eq("id", ruleId);

    if (!error) {
      onRulesUpdated();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-slide-in">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Edit Program</h2>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-gray-900 resize-none"
                rows={2}
              />
            </div>
          </div>

          {/* Rules Section */}
          <div className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mapping Rules</h3>
            <p className="text-gray-500 mb-6">
              Define rules to automatically assign opportunities to this program based on their
              properties.
            </p>

            {/* Existing Rules */}
            {rules.length > 0 && (
              <div className="space-y-3 mb-6">
                {rules.map((rule: any) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => toggleRule(rule.id, e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary/20 border-gray-300"
                    />
                    <span className="flex-1 text-gray-700">
                      <span className="font-medium">{rule.field}</span>
                      <span className="text-gray-500 mx-2">{rule.rule_type}</span>
                      <span className="font-mono text-sm bg-white px-2 py-0.5 rounded">
                        "{rule.pattern}"
                      </span>
                    </span>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-danger hover:text-danger/80 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Rule */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-4">Add New Rule</h4>
              <div className="flex flex-wrap gap-3">
                <select
                  value={newRule.field}
                  onChange={(e) => setNewRule({ ...newRule, field: e.target.value })}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="source">Source</option>
                  <option value="name">Deal Name</option>
                  <option value="stage">Stage</option>
                </select>

                <select
                  value={newRule.rule_type}
                  onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                  className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="contains">Contains</option>
                  <option value="equals">Equals</option>
                  <option value="starts_with">Starts with</option>
                  <option value="ends_with">Ends with</option>
                </select>

                <input
                  type="text"
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                  placeholder="Pattern to match"
                  className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 placeholder-gray-400"
                />

                <button
                  onClick={addRule}
                  disabled={!newRule.pattern}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  Add Rule
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => onUpdate({ name, description })}
            className="flex-1 bg-primary text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-hover transition-all shadow-sm hover:shadow-md"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-gray-200 px-5 py-3 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-neutral-600">Loading...</p>
        </div>
      }
    >
      <ProgramsContent />
    </Suspense>
  );
}

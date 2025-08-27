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
    <div className="min-h-screen bg-neutral-50">
      <AppNav />

      {/* Page Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Programs</h1>
              <p className="text-neutral-600 mt-1">Map your marketing campaigns to track ROI</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-black text-white px-4 py-2 rounded-md hover:bg-neutral-800"
            >
              Create program
            </button>
          </div>
        </div>
      </div>

      {/* Coverage Meter */}
      <div className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Pipeline Coverage</h3>
                <p className="text-sm text-neutral-600 mt-1">
                  {coverage.mapped} of {coverage.total} opportunities mapped to programs
                </p>
              </div>
              {programs.length > 0 && (
                <button
                  onClick={runProgramMapping}
                  className="text-sm bg-neutral-100 text-black px-4 py-2 rounded-md hover:bg-neutral-200"
                >
                  Run mapping
                </button>
              )}
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
            <p className="text-sm text-neutral-600 mt-2">{coveragePercent}% coverage</p>
          </div>
        </div>
      </div>

      {/* Programs List */}
      <div className="px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          {programs.length === 0 ? (
            <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-neutral-400"
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
              <h3 className="text-lg font-semibold mb-2">No programs yet</h3>
              <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                Programs help you group opportunities by marketing campaign source. Create your
                first program to start tracking what's driving pipeline.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-black text-white px-6 py-3 rounded-md hover:bg-neutral-800"
              >
                Create your first program
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {programs.map((program) => (
                <div key={program.id} className="bg-white rounded-lg border shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: program.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-lg">{program.name}</h3>
                        {program.description && (
                          <p className="text-sm text-neutral-600 mt-1">{program.description}</p>
                        )}
                        <div className="mt-3 space-y-2">
                          {program.program_rules?.length > 0 ? (
                            program.program_rules.map((rule: any) => (
                              <div key={rule.id} className="flex items-center gap-2 text-sm">
                                <span
                                  className={`px-2 py-1 rounded ${rule.enabled ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"}`}
                                >
                                  {rule.enabled ? "Active" : "Disabled"}
                                </span>
                                <span className="text-neutral-600">
                                  {rule.field} {rule.rule_type} "{rule.pattern}"
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-neutral-500">No rules defined</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingProgram(program);
                        setShowEditModal(true);
                      }}
                      className="text-sm text-neutral-600 hover:text-neutral-900"
                    >
                      Edit →
                    </button>
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
          onUpdate={(updates) => updateProgram(editingProgram.id, updates)}
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
  const [color, setColor] = useState("#3B82F6");

  const colors = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#EF4444", // Red
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#F97316", // Orange
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create Program</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black"
              placeholder="e.g., Webinar Series"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black"
              rows={3}
              placeholder="What does this program track?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-black" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              if (name) onCreate(name, description, color);
            }}
            disabled={!name}
            className="flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-neutral-800 disabled:opacity-50"
          >
            Create
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-neutral-300 px-4 py-2 rounded-md hover:bg-neutral-50"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Edit Program</h2>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black"
                rows={2}
              />
            </div>
          </div>

          {/* Rules Section */}
          <div>
            <h3 className="font-medium mb-3">Mapping Rules</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Define rules to automatically assign opportunities to this program based on their
              properties.
            </p>

            {/* Existing Rules */}
            {rules.length > 0 && (
              <div className="space-y-2 mb-4">
                {rules.map((rule: any) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-3 bg-neutral-50 rounded-md"
                  >
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => toggleRule(rule.id, e.target.checked)}
                      className="rounded"
                    />
                    <span className="flex-1 text-sm">
                      {rule.field} {rule.rule_type} "{rule.pattern}"
                    </span>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Rule */}
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-3">Add Rule</h4>
              <div className="flex gap-3">
                <select
                  value={newRule.field}
                  onChange={(e) => setNewRule({ ...newRule, field: e.target.value })}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="source">Source</option>
                  <option value="name">Deal Name</option>
                  <option value="stage">Stage</option>
                </select>

                <select
                  value={newRule.rule_type}
                  onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                  className="px-3 py-2 border rounded-md"
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
                  className="flex-1 px-3 py-2 border rounded-md"
                />

                <button
                  onClick={addRule}
                  disabled={!newRule.pattern}
                  className="bg-black text-white px-4 py-2 rounded-md hover:bg-neutral-800 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onUpdate({ name, description })}
            className="flex-1 bg-black text-white px-4 py-2 rounded-md hover:bg-neutral-800"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-neutral-300 px-4 py-2 rounded-md hover:bg-neutral-50"
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

import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { signOut } from "firebase/auth";

const CREDITS_PER_ACCOUNT = 50; // Google Flow's per-account credit allowance
const CREDITS_PER_VIDEO = 10;

function seedFlowState() {
  return {
    accounts: [
      { id: "fa1", name: "Flow Account 1" },
      { id: "fa2", name: "Flow Account 2" },
      { id: "fa3", name: "Flow Account 3" },
      { id: "fa4", name: "Flow Account 4" },
      { id: "fa5", name: "Flow Account 5" },
    ],
    topics: [
      { id: "ft1", name: "New Topic", script: "", numScenes: 20, selectedAccounts: [], sceneAssignments: {}, completedScenes: {}, environments: {}, updated: Date.now() },
    ],
  };
}

// Parses free text like "1-5" or "3,7,9,12,15" or "1-3, 8, 10-11" into a flat
// list of scene labels (strings, in the order the person typed them).
function parseSceneInput(text) {
  if (!text) return [];
  const tokens = [];
  text.split(",").forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      let a = parseInt(rangeMatch[1], 10);
      let b = parseInt(rangeMatch[2], 10);
      if (a <= b) {
        for (let n = a; n <= b; n++) tokens.push(String(n));
      } else {
        for (let n = a; n >= b; n--) tokens.push(String(n));
      }
    } else {
      tokens.push(trimmed);
    }
  });
  return tokens;
}

export default function FlowPlanner({ user }) {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("synced");
  const [syncFlash, setSyncFlash] = useState("");
  const [addingAccountFor, setAddingAccountFor] = useState(null); // topic id currently showing the account picker
  const saveTimer = useRef(null);
  const suppressNextSnapshot = useRef(false);
  const docRef = useRef(doc(db, "users", user.uid, "flowPlanner", "main"));

  useEffect(() => {
    let unsub;
    (async () => {
      const snap = await getDoc(docRef.current);
      if (snap.exists()) {
        const data = snap.data();
        if (!data.topics) {
          data.topics = [{ id: "ft1", name: "Migrated Script", script: data.script || "", numScenes: data.numScenes || 20, selectedAccounts: [], sceneAssignments: {}, completedScenes: data.completedScenes || {}, environments: {}, updated: Date.now() }];
        } else {
          data.topics = data.topics.map((t) => ({
            ...t,
            selectedAccounts: t.selectedAccounts || [],
            sceneAssignments: t.sceneAssignments || {},
            environments: t.environments || {},
          }));
        }
        setState(data);
      } else {
        const seed = seedFlowState();
        await setDoc(docRef.current, seed);
        setState(seed);
      }
      setLoaded(true);
      unsub = onSnapshot(docRef.current, (snap2) => {
        if (suppressNextSnapshot.current) {
          suppressNextSnapshot.current = false;
          return;
        }
        if (snap2.exists()) {
          setState(snap2.data());
          setSyncFlash("updated from another device");
          setTimeout(() => setSyncFlash(""), 2500);
        }
      });
    })();
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded || !state) return;
    clearTimeout(saveTimer.current);
    setSaveState("saving…");
    saveTimer.current = setTimeout(async () => {
      suppressNextSnapshot.current = true;
      await setDoc(docRef.current, state);
      setSaveState("synced");
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [state, loaded]);

  if (!loaded || !state) {
    return (
      <div style={{ background: "#14212B", color: "#E9E1CC", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
        Loading Flow planner…
      </div>
    );
  }

  const updateAccountName = (id, name) => {
    setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, name } : a)) }));
  };
  const addGlobalAccount = () => {
    setState((s) => ({ ...s, accounts: [...s.accounts, { id: "fa" + Date.now(), name: `Flow Account ${s.accounts.length + 1}` }] }));
  };
  const removeAccount = (id) => {
    setState((s) => {
      if (s.accounts.length <= 1) return s;
      return {
        ...s,
        accounts: s.accounts.filter((a) => a.id !== id),
        topics: s.topics.map((t) => ({ ...t, selectedAccounts: (t.selectedAccounts || []).filter((aid) => aid !== id) })),
      };
    });
  };

  const updateTopic = (id, patch) => {
    setState((s) => ({ ...s, topics: s.topics.map((t) => (t.id === id ? { ...t, ...patch, updated: Date.now() } : t)) }));
  };
  const toggleScene = (topicId, key) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) =>
        t.id === topicId ? { ...t, completedScenes: { ...t.completedScenes, [key]: !t.completedScenes[key] }, updated: Date.now() } : t
      ),
    }));
  };
  const updateEnvironment = (topicId, accountId, value) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) =>
        t.id === topicId ? { ...t, environments: { ...t.environments, [accountId]: value }, updated: Date.now() } : t
      ),
    }));
  };
  const updateSceneAssignment = (topicId, accountId, value) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) =>
        t.id === topicId ? { ...t, sceneAssignments: { ...t.sceneAssignments, [accountId]: value }, updated: Date.now() } : t
      ),
    }));
  };
  const addTopic = () => {
    const id = "ft" + Date.now();
    setState((s) => ({
      ...s,
      topics: [{ id, name: "New Topic", script: "", numScenes: 20, selectedAccounts: [], sceneAssignments: {}, completedScenes: {}, environments: {}, updated: Date.now() }, ...s.topics],
    }));
  };
  const removeTopic = (id) => {
    setState((s) => ({ ...s, topics: s.topics.filter((t) => t.id !== id) }));
  };

  const addAccountToTopic = (topicId, accountId) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) =>
        t.id === topicId && !(t.selectedAccounts || []).includes(accountId)
          ? { ...t, selectedAccounts: [...(t.selectedAccounts || []), accountId], updated: Date.now() }
          : t
      ),
    }));
    setAddingAccountFor(null);
  };
  const addNewAccountToTopic = (topicId) => {
    const newId = "fa" + Date.now();
    setState((s) => ({
      ...s,
      accounts: [...s.accounts, { id: newId, name: `Flow Account ${s.accounts.length + 1}` }],
      topics: s.topics.map((t) =>
        t.id === topicId ? { ...t, selectedAccounts: [...(t.selectedAccounts || []), newId], updated: Date.now() } : t
      ),
    }));
    setAddingAccountFor(null);
  };
  const removeAccountFromTopic = (topicId, accountId) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) =>
        t.id === topicId ? { ...t, selectedAccounts: (t.selectedAccounts || []).filter((id) => id !== accountId), updated: Date.now() } : t
      ),
    }));
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 600px at 10% -10%, #1a2c3a 0%, #14212B 55%), #14212B", color: "#E9E1CC", fontFamily: "'Inter', sans-serif", padding: "24px 16px 60px" }}>
      <style>{`
        * { box-sizing: border-box; }
        input, textarea { font-family:'Inter',sans-serif; background:#14212B; border:1px solid #33475A; color:#E9E1CC; border-radius:4px; padding:6px 8px; font-size:13px; outline:none; }
        input:focus, textarea:focus { border-color:#C9A54B; }
        textarea { resize:vertical; }
        button { font-family:'Inter',sans-serif; cursor:pointer; }
        ::placeholder { color:#6B7D8C; }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", paddingLeft: 40 }}>
        <div style={{ borderBottom: "1px solid #33475A", paddingBottom: 18, marginBottom: 22, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "2.5px", color: "#5C8A80", marginBottom: 6 }}>GOOGLE FLOW · CREDIT & SCENE PLANNER</div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 600, margin: 0 }}>Scene Allocation</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, color: "#8FA5B3" }}>{syncFlash}</div>
            <div style={{ fontSize: 11, color: saveState === "synced" ? "#4C9A5B" : "#6B7D8C", minWidth: 60, textAlign: "right" }}>{saveState}</div>
            <button onClick={() => signOut(auth)} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>Sign out</button>
          </div>
        </div>

        <div style={{ marginBottom: 10, fontSize: 11, color: "#6B7D8C" }}>ALL FLOW ACCOUNTS (rename here — pick which ones to use per topic below)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
          {state.accounts.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 4, padding: "4px 6px" }}>
              <input value={a.name} onChange={(e) => updateAccountName(a.id, e.target.value)} style={{ border: "none", background: "transparent", width: 130, padding: "2px 4px" }} />
              {state.accounts.length > 1 && (
                <button onClick={() => removeAccount(a.id)} style={{ background: "transparent", border: "none", color: "#5A6E7C", fontSize: 13, padding: "0 4px" }}>×</button>
              )}
            </div>
          ))}
          <button onClick={addGlobalAccount} style={{ background: "transparent", border: "1px dashed #3D5468", borderRadius: 4, color: "#8FA5B3", fontSize: 12, padding: "6px 10px" }}>+ Add Flow account</button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button onClick={addTopic} style={{ background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: "8px 14px", fontWeight: 600, fontSize: 13 }}>+ New Topic</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {state.topics.map((t) => {
            const selectedIds = t.selectedAccounts || [];
            const selectedAccountObjs = selectedIds.map((id) => state.accounts.find((a) => a.id === id)).filter(Boolean);
            const sceneAssignments = t.sceneAssignments || {};
            const perAccount = selectedAccountObjs.map((account) => ({
              account,
              scenes: parseSceneInput(sceneAssignments[account.id] || ""),
            }));
            const totalScenes = Math.max(0, parseInt(t.numScenes, 10) || 0);
            const doneCount = Object.values(t.completedScenes || {}).filter(Boolean).length;
            const totalNeeded = totalScenes * CREDITS_PER_VIDEO;
            const totalAdded = selectedAccountObjs.length * CREDITS_PER_ACCOUNT;
            const scenesCovered = perAccount.reduce((sum, a) => sum + a.scenes.length, 0);
            const balance = totalAdded - totalNeeded;
            const unselectedAccounts = state.accounts.filter((a) => !selectedIds.includes(a.id));

            return (
              <div key={t.id} style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <input
                    value={t.name}
                    onChange={(e) => updateTopic(t.id, { name: e.target.value })}
                    style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 600, flex: "1 1 200px", border: "none", background: "transparent", padding: "2px 0" }}
                  />
                  <button onClick={() => removeTopic(t.id)} style={{ background: "transparent", border: "1px solid #8C5A3C", color: "#C98C6E", borderRadius: 4, padding: "5px 9px", fontSize: 12 }}>Remove</button>
                </div>

                <div style={{ fontSize: 10, color: "#C9A54B", marginBottom: 6 }}>SCRIPT</div>
                <textarea
                  value={t.script}
                  onChange={(e) => updateTopic(t.id, { script: e.target.value })}
                  placeholder="Paste or write the script for this topic — it autosaves and stays here across sessions."
                  style={{ width: "100%", minHeight: 110, marginBottom: 14 }}
                />

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>NUMBER OF SCENES IN SCRIPT</div>
                  <input
                    type="number"
                    min="0"
                    value={t.numScenes}
                    onChange={(e) => updateTopic(t.id, { numScenes: e.target.value })}
                    style={{ width: 90 }}
                  />
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{totalNeeded}</div>
                    <div style={{ fontSize: 9, color: "#8FA5B3" }}>credits needed ({totalScenes} scenes)</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedAccountObjs.length} × {CREDITS_PER_ACCOUNT} = {totalAdded}</div>
                    <div style={{ fontSize: 9, color: "#8FA5B3" }}>credits added ({selectedAccountObjs.length} account{selectedAccountObjs.length === 1 ? "" : "s"})</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: balance < 0 ? "#C98C6E" : "#4C9A5B" }}>{balance >= 0 ? `+${balance}` : balance}</div>
                    <div style={{ fontSize: 9, color: "#8FA5B3" }}>{balance < 0 ? "credits still short" : "credits left over"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#D9A73B" }}>{scenesCovered}/{totalScenes}</div>
                    <div style={{ fontSize: 9, color: "#8FA5B3" }}>scenes assigned to an account</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#4C9A5B" }}>{doneCount}</div>
                    <div style={{ fontSize: 9, color: "#8FA5B3" }}>scenes generated</div>
                  </div>
                </div>
                {scenesCovered < totalScenes && (
                  <div style={{ fontSize: 12, color: "#C98C6E", background: "#2A1F1A", border: "1px solid #8C5A3C", borderRadius: 4, padding: "8px 10px", marginBottom: 14 }}>
                    {totalScenes - scenesCovered} scene{totalScenes - scenesCovered === 1 ? "" : "s"} haven't been typed into an account yet.
                  </div>
                )}
                {balance < 0 && (
                  <div style={{ fontSize: 12, color: "#C98C6E", background: "#2A1F1A", border: "1px solid #8C5A3C", borderRadius: 4, padding: "8px 10px", marginBottom: 14 }}>
                    The scenes you've assigned need {balance * -1} more credits than your added accounts provide — add another account.
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "#C9A54B", marginBottom: 8 }}>ACCOUNTS ON THIS TOPIC — TYPE IN WHICH SCENE NUMBERS EACH ONE COVERS</div>
                  {perAccount.length === 0 && (
                    <div style={{ fontSize: 12, color: "#6B7D8C", marginBottom: 8 }}>No accounts added yet — add one below, then type in which scene numbers it covers.</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {perAccount.map(({ account, scenes }) => {
                      const creditsUsed = scenes.length * CREDITS_PER_VIDEO;
                      const creditsLeft = CREDITS_PER_ACCOUNT - creditsUsed;
                      const done = scenes.filter((s) => t.completedScenes[`${account.id}:${s}`]).length;
                      return (
                        <div key={account.id} style={{ background: "#14212B", border: "1px solid #2C4053", borderRadius: 6, padding: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{account.name}</span>
                            <button onClick={() => removeAccountFromTopic(t.id, account.id)} style={{ background: "transparent", border: "none", color: "#8C5A3C", fontSize: 13, cursor: "pointer" }}>×</button>
                          </div>
                          <input
                            value={sceneAssignments[account.id] || ""}
                            onChange={(e) => updateSceneAssignment(t.id, account.id, e.target.value)}
                            placeholder="Scene numbers for this account, e.g. 1-5 or 3, 7, 9, 12"
                            style={{ width: "100%", marginBottom: 6 }}
                          />
                          <div style={{ fontSize: 11, color: creditsLeft < 0 ? "#C98C6E" : "#8FA5B3" }}>
                            {scenes.length} scene{scenes.length === 1 ? "" : "s"} · {creditsUsed}/{CREDITS_PER_ACCOUNT} credits used · {creditsLeft} left · {done}/{scenes.length} done
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {addingAccountFor === t.id ? (
                    <div style={{ marginTop: 8, background: "#14212B", border: "1px solid #33475A", borderRadius: 6, padding: 10 }}>
                      {unselectedAccounts.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C", marginBottom: 8 }}>Every existing Flow account is already on this topic.</div>}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {unselectedAccounts.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => addAccountToTopic(t.id, a.id)}
                            style={{ fontSize: 12, background: "#1D2E3B", border: "1px solid #3D5468", borderRadius: 4, padding: "6px 10px", color: "#E9E1CC" }}
                          >
                            {a.name}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => addNewAccountToTopic(t.id)} style={{ fontSize: 12, background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: "6px 10px", fontWeight: 600 }}>+ Create new Flow account</button>
                        <button onClick={() => setAddingAccountFor(null)} style={{ fontSize: 12, background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingAccountFor(t.id)}
                      style={{ marginTop: 8, fontSize: 12, background: "transparent", border: "1px dashed #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px" }}
                    >
                      + Add account to this topic
                    </button>
                  )}
                </div>

                {perAccount.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: "#C9A54B", marginBottom: 8 }}>ENVIRONMENT & COMPLETION BY ACCOUNT</div>
                    {perAccount.map(({ account, scenes }) => (
                      <div key={account.id} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, color: "#B9C3CB", marginBottom: 5 }}>{account.name}</div>
                        {scenes.length > 0 && (
                          <input
                            value={(t.environments && t.environments[account.id]) || ""}
                            onChange={(e) => updateEnvironment(t.id, account.id, e.target.value)}
                            placeholder="Environment to use for these scenes (e.g. ancient library interior)"
                            style={{ width: "100%", marginBottom: 6 }}
                          />
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {scenes.length === 0 && <span style={{ fontSize: 11, color: "#5A6E7C" }}>No scenes typed in above yet</span>}
                          {scenes.map((sceneLabel) => {
                            const key = `${account.id}:${sceneLabel}`;
                            const done = !!t.completedScenes[key];
                            return (
                              <button
                                key={key}
                                onClick={() => toggleScene(t.id, key)}
                                title={`Scene ${sceneLabel} — ${done ? "done" : "not started"}`}
                                style={{
                                  minWidth: 28, height: 28, padding: "0 6px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  border: `2px solid ${done ? "#4C9A5B" : "#33475A"}`,
                                  background: done ? "#4C9A5B" : "transparent",
                                  color: done ? "#14212B" : "#E9E1CC",
                                }}
                              >
                                {sceneLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
          {state.topics.length === 0 && <div style={{ color: "#6B7D8C", fontSize: 13 }}>No topics yet. Add one above.</div>}
        </div>
      </div>
    </div>
  );
}

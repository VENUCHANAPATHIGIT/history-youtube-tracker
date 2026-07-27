import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { signOut } from "firebase/auth";

const CREDITS_PER_ACCOUNT = 100; // Google Flow's per-account credit allowance
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
      { id: "ft1", name: "New Topic", script: "", numScenes: 20, completedScenes: {}, updated: Date.now() },
    ],
  };
}

// Distribute N scenes across accounts as evenly as possible.
// Extra scenes (remainder) go to the first accounts in the list.
function allocateScenes(numScenes, accounts) {
  const n = Math.max(0, parseInt(numScenes, 10) || 0);
  const count = accounts.length || 1;
  const base = Math.floor(n / count);
  const remainder = n % count;
  let cursor = 1;
  return accounts.map((acc, i) => {
    const size = base + (i < remainder ? 1 : 0);
    const scenes = [];
    for (let s = 0; s < size; s++) scenes.push(cursor++);
    return { account: acc, scenes };
  });
}

export default function FlowPlanner({ user }) {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("synced");
  const [syncFlash, setSyncFlash] = useState("");
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
          data.topics = [{ id: "ft1", name: "Migrated Script", script: data.script || "", numScenes: data.numScenes || 20, completedScenes: data.completedScenes || {}, updated: Date.now() }];
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
  const addAccount = () => {
    setState((s) => ({ ...s, accounts: [...s.accounts, { id: "fa" + Date.now(), name: `Flow Account ${s.accounts.length + 1}` }] }));
  };
  const removeAccount = (id) => {
    setState((s) => {
      if (s.accounts.length <= 1) return s;
      return { ...s, accounts: s.accounts.filter((a) => a.id !== id) };
    });
  };

  const updateTopic = (id, patch) => {
    setState((s) => ({ ...s, topics: s.topics.map((t) => (t.id === id ? { ...t, ...patch, updated: Date.now() } : t)) }));
  };
  const toggleScene = (topicId, sceneNum) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) =>
        t.id === topicId ? { ...t, completedScenes: { ...t.completedScenes, [sceneNum]: !t.completedScenes[sceneNum] }, updated: Date.now() } : t
      ),
    }));
  };
  const addTopic = () => {
    const id = "ft" + Date.now();
    setState((s) => ({
      ...s,
      topics: [{ id, name: "New Topic", script: "", numScenes: 20, completedScenes: {}, updated: Date.now() }, ...s.topics],
    }));
  };
  const removeTopic = (id) => {
    setState((s) => ({ ...s, topics: s.topics.filter((t) => t.id !== id) }));
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

        <div style={{ marginBottom: 10, fontSize: 11, color: "#6B7D8C" }}>FLOW ACCOUNTS ({state.accounts.length}× {CREDITS_PER_ACCOUNT} credits = {state.accounts.length * CREDITS_PER_ACCOUNT} total)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {state.accounts.map((a) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 4, padding: "4px 6px" }}>
              <input value={a.name} onChange={(e) => updateAccountName(a.id, e.target.value)} style={{ border: "none", background: "transparent", width: 130, padding: "2px 4px" }} />
              {state.accounts.length > 1 && (
                <button onClick={() => removeAccount(a.id)} style={{ background: "transparent", border: "none", color: "#5A6E7C", fontSize: 13, padding: "0 4px" }}>×</button>
              )}
            </div>
          ))}
          <button onClick={addAccount} style={{ background: "transparent", border: "1px dashed #3D5468", borderRadius: 4, color: "#8FA5B3", fontSize: 12, padding: "6px 10px" }}>+ Add Flow account</button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button onClick={addTopic} style={{ background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: "8px 14px", fontWeight: 600, fontSize: 13 }}>+ New Topic</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {state.topics.map((t) => {
            const allocation = allocateScenes(t.numScenes, state.accounts);
            const totalScenes = Math.max(0, parseInt(t.numScenes, 10) || 0);
            const doneCount = Object.values(t.completedScenes || {}).filter(Boolean).length;
            const totalAvailable = state.accounts.length * CREDITS_PER_ACCOUNT;
            const totalNeeded = totalScenes * CREDITS_PER_VIDEO;

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

                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>NUMBER OF SCENES</div>
                    <input
                      type="number"
                      min="0"
                      value={t.numScenes}
                      onChange={(e) => updateTopic(t.id, { numScenes: e.target.value })}
                      style={{ width: 90 }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: totalNeeded > totalAvailable ? "#C98C6E" : "#4C9A5B" }}>{totalNeeded}</div>
                    <div style={{ fontSize: 9, color: "#8FA5B3" }}>credits needed</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{totalAvailable}</div>
                    <div style={{ fontSize: 9, color: "#8FA5B3" }}>credits available</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#D9A73B" }}>{doneCount}/{totalScenes}</div>
                    <div style={{ fontSize: 9, color: "#8FA5B3" }}>scenes generated</div>
                  </div>
                </div>
                {totalNeeded > totalAvailable && (
                  <div style={{ fontSize: 12, color: "#C98C6E", background: "#2A1F1A", border: "1px solid #8C5A3C", borderRadius: 4, padding: "8px 10px", marginBottom: 14 }}>
                    This script needs more credits than your accounts have available — add another Flow account or split it into two runs.
                  </div>
                )}

                <div style={{ overflowX: "auto", marginBottom: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "#8FA5B3", fontSize: 10 }}>
                        <th style={{ padding: "5px 6px", borderBottom: "1px solid #2C4053" }}>Account</th>
                        <th style={{ padding: "5px 6px", borderBottom: "1px solid #2C4053" }}>Scenes</th>
                        <th style={{ padding: "5px 6px", borderBottom: "1px solid #2C4053" }}>Videos</th>
                        <th style={{ padding: "5px 6px", borderBottom: "1px solid #2C4053" }}>Credits needed</th>
                        <th style={{ padding: "5px 6px", borderBottom: "1px solid #2C4053" }}>Credits left</th>
                        <th style={{ padding: "5px 6px", borderBottom: "1px solid #2C4053" }}>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocation.map(({ account, scenes }) => {
                        const creditsNeeded = scenes.length * CREDITS_PER_VIDEO;
                        const creditsRemaining = CREDITS_PER_ACCOUNT - creditsNeeded;
                        const done = scenes.filter((s) => t.completedScenes[s]).length;
                        const rangeLabel = scenes.length === 0 ? "—" : scenes.length === 1 ? `Scene ${scenes[0]}` : `Scenes ${scenes[0]}–${scenes[scenes.length - 1]}`;
                        return (
                          <tr key={account.id}>
                            <td style={{ padding: "6px", borderBottom: "1px solid #2C4053", fontWeight: 600 }}>{account.name}</td>
                            <td style={{ padding: "6px", borderBottom: "1px solid #2C4053", color: "#B9C3CB" }}>{rangeLabel}</td>
                            <td style={{ padding: "6px", borderBottom: "1px solid #2C4053" }}>{scenes.length}</td>
                            <td style={{ padding: "6px", borderBottom: "1px solid #2C4053" }}>{creditsNeeded}</td>
                            <td style={{ padding: "6px", borderBottom: "1px solid #2C4053", color: creditsRemaining < 0 ? "#C98C6E" : "#4C9A5B" }}>{creditsRemaining}</td>
                            <td style={{ padding: "6px", borderBottom: "1px solid #2C4053", color: "#8FA5B3" }}>{done}/{scenes.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ fontSize: 10, color: "#C9A54B", marginBottom: 8 }}>COMPLETION TRACKER</div>
                {allocation.map(({ account, scenes }) => (
                  <div key={account.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#B9C3CB", marginBottom: 5 }}>{account.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {scenes.length === 0 && <span style={{ fontSize: 11, color: "#5A6E7C" }}>No scenes assigned</span>}
                      {scenes.map((sceneNum) => {
                        const done = !!t.completedScenes[sceneNum];
                        return (
                          <button
                            key={sceneNum}
                            onClick={() => toggleScene(t.id, sceneNum)}
                            title={`Scene ${sceneNum} — ${done ? "done" : "not started"}`}
                            style={{
                              width: 28, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 600,
                              border: `2px solid ${done ? "#4C9A5B" : "#33475A"}`,
                              background: done ? "#4C9A5B" : "transparent",
                              color: done ? "#14212B" : "#E9E1CC",
                            }}
                          >
                            {sceneNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {state.topics.length === 0 && <div style={{ color: "#6B7D8C", fontSize: 13 }}>No topics yet. Add one above.</div>}
        </div>
      </div>
    </div>
  );
}

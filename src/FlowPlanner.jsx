import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { signOut } from "firebase/auth";

const CREDITS_PER_ACCOUNT = 100; // Google Flow's per-account credit allowance
const CREDITS_PER_VIDEO = 10;
const MAX_VIDEOS_PER_ACCOUNT = CREDITS_PER_ACCOUNT / CREDITS_PER_VIDEO; // 10

function seedFlowState() {
  return {
    script: "",
    numScenes: 20,
    accounts: [
      { id: "fa1", name: "Flow Account 1" },
      { id: "fa2", name: "Flow Account 2" },
      { id: "fa3", name: "Flow Account 3" },
      { id: "fa4", name: "Flow Account 4" },
      { id: "fa5", name: "Flow Account 5" },
    ],
    completedScenes: {}, // { "3": true, ... } scene number -> done
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
        setState(snap.data());
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

  const allocation = allocateScenes(state.numScenes, state.accounts);
  const totalScenes = Math.max(0, parseInt(state.numScenes, 10) || 0);
  const doneCount = Object.values(state.completedScenes).filter(Boolean).length;

  const toggleScene = (sceneNum) => {
    setState((s) => ({
      ...s,
      completedScenes: { ...s.completedScenes, [sceneNum]: !s.completedScenes[sceneNum] },
    }));
  };

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

        {/* Script section */}
        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#C9A54B", marginBottom: 8 }}>SCRIPT</div>
          <textarea
            value={state.script}
            onChange={(e) => setState((s) => ({ ...s, script: e.target.value }))}
            placeholder="Paste or write the script you're working on — it autosaves and stays here across sessions."
            style={{ width: "100%", minHeight: 160 }}
          />
        </div>

        {/* Credits overview */}
        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>NUMBER OF SCENES IN THIS SCRIPT</div>
              <input
                type="number"
                min="0"
                value={state.numScenes}
                onChange={(e) => setState((s) => ({ ...s, numScenes: e.target.value }))}
                style={{ width: 100 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{state.accounts.length}</div>
              <div style={{ fontSize: 10, color: "#8FA5B3" }}>Flow accounts</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{state.accounts.length * CREDITS_PER_ACCOUNT}</div>
              <div style={{ fontSize: 10, color: "#8FA5B3" }}>total credits available</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: totalScenes * CREDITS_PER_VIDEO > state.accounts.length * CREDITS_PER_ACCOUNT ? "#C98C6E" : "#4C9A5B" }}>
                {totalScenes * CREDITS_PER_VIDEO}
              </div>
              <div style={{ fontSize: 10, color: "#8FA5B3" }}>credits this script needs</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#D9A73B" }}>{doneCount}/{totalScenes}</div>
              <div style={{ fontSize: 10, color: "#8FA5B3" }}>scenes generated</div>
            </div>
          </div>
          {totalScenes * CREDITS_PER_VIDEO > state.accounts.length * CREDITS_PER_ACCOUNT && (
            <div style={{ fontSize: 12, color: "#C98C6E", background: "#2A1F1A", border: "1px solid #8C5A3C", borderRadius: 4, padding: "8px 10px" }}>
              This script needs more credits than your accounts have available — add another Flow account or split the script across two runs.
            </div>
          )}
        </div>

        {/* Accounts editor */}
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

        {/* Allocation table */}
        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 16, marginBottom: 20, overflowX: "auto" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#C9A54B", marginBottom: 12 }}>SCENE ALLOCATION BY ACCOUNT</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#8FA5B3", fontSize: 11 }}>
                <th style={{ padding: "6px 8px", borderBottom: "1px solid #2C4053" }}>Account</th>
                <th style={{ padding: "6px 8px", borderBottom: "1px solid #2C4053" }}>Scenes assigned</th>
                <th style={{ padding: "6px 8px", borderBottom: "1px solid #2C4053" }}>Videos to generate</th>
                <th style={{ padding: "6px 8px", borderBottom: "1px solid #2C4053" }}>Credits needed</th>
                <th style={{ padding: "6px 8px", borderBottom: "1px solid #2C4053" }}>Credits remaining</th>
                <th style={{ padding: "6px 8px", borderBottom: "1px solid #2C4053" }}>Progress</th>
              </tr>
            </thead>
            <tbody>
              {allocation.map(({ account, scenes }) => {
                const creditsNeeded = scenes.length * CREDITS_PER_VIDEO;
                const creditsRemaining = CREDITS_PER_ACCOUNT - creditsNeeded;
                const done = scenes.filter((s) => state.completedScenes[s]).length;
                const rangeLabel = scenes.length === 0 ? "—" : scenes.length === 1 ? `Scene ${scenes[0]}` : `Scenes ${scenes[0]}–${scenes[scenes.length - 1]}`;
                return (
                  <tr key={account.id}>
                    <td style={{ padding: "8px", borderBottom: "1px solid #2C4053", fontWeight: 600 }}>{account.name}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #2C4053", color: "#B9C3CB" }}>{rangeLabel}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #2C4053" }}>{scenes.length}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #2C4053" }}>{creditsNeeded}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #2C4053", color: creditsRemaining < 0 ? "#C98C6E" : "#4C9A5B" }}>{creditsRemaining}</td>
                    <td style={{ padding: "8px", borderBottom: "1px solid #2C4053", color: "#8FA5B3" }}>{done}/{scenes.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Completion tracker */}
        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#C9A54B", marginBottom: 4 }}>COMPLETION TRACKER</div>
          <div style={{ fontSize: 11, color: "#6B7D8C", marginBottom: 14 }}>Tap a scene number as its video finishes generating.</div>
          {allocation.map(({ account, scenes }) => (
            <div key={account.id} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#B9C3CB", marginBottom: 6 }}>{account.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {scenes.length === 0 && <span style={{ fontSize: 11, color: "#5A6E7C" }}>No scenes assigned</span>}
                {scenes.map((sceneNum) => {
                  const done = !!state.completedScenes[sceneNum];
                  return (
                    <button
                      key={sceneNum}
                      onClick={() => toggleScene(sceneNum)}
                      title={`Scene ${sceneNum} — ${done ? "done" : "not started"}`}
                      style={{
                        width: 30, height: 30, borderRadius: 6, fontSize: 12, fontWeight: 600,
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
      </div>
    </div>
  );
}

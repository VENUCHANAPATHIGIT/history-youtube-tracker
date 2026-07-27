import React, { useState, useEffect, useRef, useCallback } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import FlowPlanner from "./FlowPlanner.jsx";

const PHASES = [
  { n: 1, label: "Topic Generator" },
  { n: 2, label: "Script / Narration" },
  { n: 3, label: "Host/Character Design" },
  { n: 4, label: "Environment Prompts" },
  { n: 5, label: "Scene Image Prompts" },
  { n: 6, label: "Image-to-Video Prompts" },
  { n: 7, label: "Metadata Package" },
  { n: 8, label: "Video Editing" },
  { n: 9, label: "Upload Status" },
];

const emptyPhases = () => ({ 1: "pending", 2: "pending", 3: "skipped", 4: "pending", 5: "pending", 6: "pending", 7: "pending", 8: "pending", 9: "pending" });

const seedState = () => {
  const now = Date.now();
  const mk = (p) => Object.assign(emptyPhases(), p);
  return {
    accounts: [
      { id: "a1", name: "Account 1", note: "" },
      { id: "a2", name: "Account 2", note: "" },
      { id: "a3", name: "Account 3", note: "" },
    ],
    topics: [
      { id: "t1", name: "Nalanda Palm-Leaf Texts", account: "a1", phases: mk({ 1: "done", 2: "done", 4: "done", 5: "done", 6: "done" }), scenes: 30, targetMin: 7, actualMin: "", source: "", startDate: "", completionDate: "", notes: "Phase 7/8 pending.", updated: now },
      { id: "t2", name: "Baghdad Battery", account: "a2", phases: mk({ 1: "done", 2: "done", 4: "done", 5: "done", 6: "done", 7: "done", 8: "done" }), scenes: 10, targetMin: 7, actualMin: 7, source: "", startDate: "", completionDate: "", notes: "Full pipeline complete.", updated: now },
      { id: "t3", name: "Iron Pillar of Delhi", account: "a3", phases: mk({ 1: "done", 2: "done", 4: "done", 5: "done", 6: "done", 7: "done", 8: "done" }), scenes: 15, targetMin: 7, actualMin: 7, source: "", startDate: "", completionDate: "", notes: "Full package compiled.", updated: now },
      { id: "t4", name: "Antikythera Mechanism", account: "a1", phases: mk({ 1: "done", 2: "done", 4: "done", 5: "done", 6: "done", 7: "done", 8: "done" }), scenes: 30, targetMin: 7, actualMin: 7, source: "", startDate: "", completionDate: "", notes: "Full pipeline complete.", updated: now },
      { id: "t5", name: "Seven Wonders of the Modern World", account: "a2", phases: mk({ 1: "done", 2: "active" }), scenes: 30, targetMin: 7, actualMin: "", source: "", startDate: "", completionDate: "", notes: "30-scene script came in short of runtime target.", updated: now },
      { id: "t6", name: "Bermuda Triangle", account: "a3", phases: mk({ 1: "done", 2: "active" }), scenes: 0, targetMin: 7, actualMin: "", source: "", startDate: "", completionDate: "", notes: "", updated: now },
    ],
  };
};

function cyclePhase(status) {
  if (status === "pending" || !status) return "active";
  if (status === "active") return "done";
  if (status === "done") return "skipped";
  return "pending";
}
function phaseColor(status) {
  if (status === "done") return "#4C9A5B";
  if (status === "active") return "#D9A73B";
  if (status === "skipped") return "#8C5A3C";
  return "transparent";
}
function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------- Login screen ----------------
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError("Sign-in failed — check email/password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#14212B", color: "#E9E1CC", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={submit} style={{ width: 320, textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "2.5px", color: "#5C8A80", marginBottom: 6 }}>HISTORY YOUTUBE CONTENT</div>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, marginBottom: 4 }}>Sign in to your ledger</h1>
        <p style={{ color: "#8FA5B3", fontSize: 13, marginBottom: 22 }}>Same login on every device keeps data in sync.</p>
        <input
          type="email"
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 10, background: "#14212B", border: "1px solid #33475A", color: "#E9E1CC", borderRadius: 4 }}
        />
        <input
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 10, padding: 10, background: "#14212B", border: "1px solid #33475A", color: "#E9E1CC", borderRadius: 4 }}
        />
        <button
          type="submit"
          disabled={busy}
          style={{ width: "100%", background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: 10, fontWeight: 600 }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div style={{ color: "#C98C6E", fontSize: 12, marginTop: 10, minHeight: 16 }}>{error}</div>
      </form>
    </div>
  );
}

// ---------------- Main tracker ----------------
function Tracker({ user }) {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [saveState, setSaveState] = useState("synced");
  const [syncFlash, setSyncFlash] = useState("");
  const saveTimer = useRef(null);
  const suppressNextSnapshot = useRef(false);
  const docRef = useRef(doc(db, "users", user.uid, "tracker", "main"));

  useEffect(() => {
    let unsub;
    (async () => {
      const snap = await getDoc(docRef.current);
      if (snap.exists()) {
        setState(snap.data());
      } else {
        const seed = seedState();
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
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [state, loaded]);

  const updateTopic = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) => (t.id === id ? { ...t, ...patch, updated: Date.now() } : t)),
    }));
  }, []);

  const togglePhase = (topic, n) => {
    const cur = topic.phases[n] || "pending";
    updateTopic(topic.id, { phases: { ...topic.phases, [n]: cyclePhase(cur) } });
  };

  const addTopic = () => {
    const id = "t" + Date.now();
    setState((s) => ({
      ...s,
      topics: [
        { id, name: "New Topic", account: s.accounts[0]?.id || "a1", phases: emptyPhases(), scenes: "", targetMin: 7, actualMin: "", source: "", startDate: "", completionDate: "", notes: "", updated: Date.now() },
        ...s.topics,
      ],
    }));
  };

  const removeTopic = (id) => setState((s) => ({ ...s, topics: s.topics.filter((t) => t.id !== id) }));

  const updateAccount = (id, patch) => setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

  const addAccount = () =>
    setState((s) => ({ ...s, accounts: [...s.accounts, { id: "a" + Date.now(), name: `Account ${s.accounts.length + 1}`, note: "" }] }));

  const removeAccount = (id) => {
    setState((s) => {
      if (s.accounts.length <= 1) return s;
      const remaining = s.accounts.filter((a) => a.id !== id);
      const fallback = remaining[0].id;
      return { ...s, accounts: remaining, topics: s.topics.map((t) => (t.account === id ? { ...t, account: fallback } : t)) };
    });
    if (filterAccount === id) setFilterAccount("all");
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `history-youtube-content-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef(null);
  const triggerImport = () => fileInputRef.current?.click();
  const importJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.accounts || !parsed.topics) throw new Error("bad shape");
        setState(parsed);
      } catch {
        alert("That file doesn't look like a valid backup — restore cancelled.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!loaded || !state) {
    return (
      <div style={{ background: "#14212B", color: "#E9E1CC", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
        Unrolling the ledger…
      </div>
    );
  }

  const visibleTopics = state.topics.filter(
    (t) => (filterAccount === "all" || t.account === filterAccount) && (filterTopic === "all" || t.id === filterTopic)
  );
  const accountCounts = state.accounts.reduce((acc, a) => {
    acc[a.id] = state.topics.filter((t) => t.account === a.id).length;
    return acc;
  }, {});

  // ---- Summary stats ----
  const currentPhaseOf = (topic) => {
    for (const p of PHASES) {
      const status = topic.phases[p.n] || (p.n === 3 ? "skipped" : "pending");
      if (status === "pending" || status === "active") return p;
    }
    return null; // all phases done/skipped = fully complete
  };
  const phaseCounts = {};
  PHASES.forEach((p) => (phaseCounts[p.n] = 0));
  let completedTopics = 0;
  state.topics.forEach((t) => {
    const cp = currentPhaseOf(t);
    if (cp) phaseCounts[cp.n]++;
    else completedTopics++;
  });
  let resolvedDots = 0;
  let totalDots = 0;
  state.topics.forEach((t) => {
    PHASES.forEach((p) => {
      const status = t.phases[p.n] || (p.n === 3 ? "skipped" : "pending");
      totalDots++;
      if (status === "done" || status === "skipped") resolvedDots++;
    });
  });
  const overallPct = totalDots ? Math.round((resolvedDots / totalDots) * 100) : 0;
  const totalTopics = state.topics.length;

  const doneCountOf = (t) => PHASES.filter((p) => t.phases[p.n] === "done").length;
  const isFullyComplete = (t) => currentPhaseOf(t) === null;
  const backlogTopics = state.topics.filter((t) => !isFullyComplete(t) && doneCountOf(t) === 0);
  const inProgressTopics = state.topics.filter((t) => !isFullyComplete(t) && doneCountOf(t) >= 1);
  const accountName = (id) => state.accounts.find((a) => a.id === id)?.name || "—";

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 600px at 10% -10%, #1a2c3a 0%, #14212B 55%), #14212B", color: "#E9E1CC", fontFamily: "'Inter', sans-serif", padding: "24px 16px 60px" }}>
      <style>{`
        * { box-sizing: border-box; }
        input, textarea, select { font-family:'Inter',sans-serif; background:#14212B; border:1px solid #33475A; color:#E9E1CC; border-radius:4px; padding:6px 8px; font-size:13px; outline:none; }
        input:focus, textarea:focus, select:focus { border-color:#C9A54B; }
        textarea { resize:vertical; min-height:40px; }
        button { font-family:'Inter',sans-serif; cursor:pointer; }
        ::placeholder { color:#6B7D8C; }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ borderBottom: "1px solid #33475A", paddingBottom: 18, marginBottom: 22, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "2.5px", color: "#5C8A80", marginBottom: 6 }}>HISTORY YOUTUBE CONTENT · PRODUCTION LEDGER</div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 600, margin: 0 }}>Expedition Log</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, color: "#8FA5B3" }}>{syncFlash}</div>
            <div style={{ fontSize: 11, color: saveState === "synced" ? "#4C9A5B" : "#6B7D8C", minWidth: 60, textAlign: "right" }}>{saveState}</div>
            <button onClick={exportJSON} style={{ background: "transparent", border: "1px solid #3D5468", color: "#C9A54B", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>Export JSON</button>
            <button onClick={triggerImport} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>Restore</button>
            <button onClick={() => signOut(auth)} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>Sign out</button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importJSON} style={{ display: "none" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "center", background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: `conic-gradient(#4C9A5B ${overallPct * 3.6}deg, #2C4053 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#1D2E3B", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{overallPct}%</div>
                <div style={{ fontSize: 8, color: "#8FA5B3" }}>complete</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>{totalTopics}</div>
                <div style={{ fontSize: 10, color: "#8FA5B3" }}>total topics</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, color: "#4C9A5B" }}>{completedTopics}</div>
                <div style={{ fontSize: 10, color: "#8FA5B3" }}>fully done</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, color: "#D9A73B" }}>{totalTopics - completedTopics}</div>
                <div style={{ fontSize: 10, color: "#8FA5B3" }}>still in progress</div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 8, letterSpacing: 1 }}>TOPICS BY CURRENT PHASE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {PHASES.map((p) => {
                const count = phaseCounts[p.n];
                const pct = totalTopics ? (count / totalTopics) * 100 : 0;
                return (
                  <div key={p.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 130, fontSize: 11, color: "#B9C3CB", flexShrink: 0 }}>{p.n}. {p.label}</div>
                    <div style={{ flex: 1, height: 8, background: "#14212B", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#D9A73B" }} />
                    </div>
                    <div style={{ width: 18, fontSize: 11, color: "#8FA5B3", textAlign: "right" }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#D9A73B" }}>IN PROGRESS</div>
              <div style={{ fontSize: 11, color: "#6B7D8C" }}>{inProgressTopics.length}</div>
            </div>
            {inProgressTopics.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C" }}>Nothing mid-flight right now.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {inProgressTopics.map((t) => {
                const cp = currentPhaseOf(t);
                return (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, borderBottom: "1px solid #2C4053", paddingBottom: 6 }}>
                    <div style={{ color: "#E9E1CC" }}>{t.name}</div>
                    <div style={{ color: "#8FA5B3", fontSize: 11, textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                      {accountName(t.account)} · {doneCountOf(t)}/{PHASES.length} done{cp ? ` · at ${cp.label}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#8C5A3C" }}>BACKLOG — NOT STARTED</div>
              <div style={{ fontSize: 11, color: "#6B7D8C" }}>{backlogTopics.length}</div>
            </div>
            {backlogTopics.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C" }}>Backlog is clear.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {backlogTopics.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, borderBottom: "1px solid #2C4053", paddingBottom: 6 }}>
                  <div style={{ color: "#E9E1CC" }}>{t.name}</div>
                  <div style={{ color: "#8FA5B3", fontSize: 11, textAlign: "right", flexShrink: 0, marginLeft: 8 }}>{accountName(t.account)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 24 }}>
          {state.accounts.map((a) => (
            <div key={a.id} style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 6, padding: 12, position: "relative" }}>
              {state.accounts.length > 1 && (
                <button onClick={() => removeAccount(a.id)} title="Remove account" style={{ position: "absolute", top: 8, right: 8, background: "transparent", border: "none", color: "#5A6E7C", fontSize: 14, lineHeight: 1, padding: 2 }}>×</button>
              )}
              <input value={a.name} onChange={(e) => updateAccount(a.id, { name: e.target.value })} style={{ width: "calc(100% - 18px)", fontWeight: 600, marginBottom: 6, border: "none", padding: "2px 0", background: "transparent" }} />
              <div style={{ fontSize: 11, color: "#8FA5B3", marginBottom: 6 }}>{accountCounts[a.id] || 0} topic{accountCounts[a.id] === 1 ? "" : "s"} assigned</div>
              <input value={a.note} onChange={(e) => updateAccount(a.id, { note: e.target.value })} placeholder="rate-limit / quota note" style={{ width: "100%" }} />
            </div>
          ))}
          <button onClick={addAccount} style={{ background: "transparent", border: "1px dashed #3D5468", borderRadius: 6, color: "#8FA5B3", fontSize: 13, minHeight: 84, display: "flex", alignItems: "center", justifyContent: "center" }}>+ Add account</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
              <option value="all">All accounts</option>
              {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)}>
              <option value="all">All topics</option>
              {state.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button onClick={addTopic} style={{ background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: "8px 14px", fontWeight: 600, fontSize: 13 }}>+ New Topic</button>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 11, color: "#8FA5B3", marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4C9A5B", display: "inline-block" }} /> done</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#D9A73B", display: "inline-block" }} /> in progress</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #33475A", display: "inline-block" }} /> not started</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#8C5A3C", display: "inline-block" }} /> skipped</span>
          <span style={{ color: "#5A6E7C" }}>— tap a dot to cycle status</span>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "#8FA5B3", marginBottom: 18 }}>
          {PHASES.map((p) => <span key={p.n}>{p.n}. {p.label}</span>)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visibleTopics.length === 0 && <div style={{ color: "#6B7D8C", fontSize: 13, padding: "20px 0" }}>No topics for this account yet. Add one above.</div>}
          {visibleTopics.map((t) => (
            <div key={t.id} style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <input value={t.name} onChange={(e) => updateTopic(t.id, { name: e.target.value })} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, fontWeight: 600, flex: "1 1 220px", border: "none", background: "transparent", padding: "2px 0" }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select value={t.account} onChange={(e) => updateTopic(t.id, { account: e.target.value })}>
                    {state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <button onClick={() => removeTopic(t.id)} style={{ background: "transparent", border: "1px solid #8C5A3C", color: "#C98C6E", borderRadius: 4, padding: "5px 9px", fontSize: 12 }}>Remove</button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
                {PHASES.map((p, i) => {
                  const status = t.phases[p.n] || (p.n === 3 ? "skipped" : "pending");
                  return (
                    <React.Fragment key={p.n}>
                      <button
                        onClick={() => togglePhase(t, p.n)}
                        title={`${p.label} — ${status}`}
                        style={{
                          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${status === "pending" ? "#33475A" : phaseColor(status)}`,
                          background: status === "pending" ? "transparent" : phaseColor(status),
                          color: status === "done" || status === "skipped" ? "#14212B" : "#E9E1CC",
                          fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", opacity: status === "skipped" ? 0.75 : 1,
                        }}
                      >
                        {status === "skipped" ? "×" : p.n}
                      </button>
                      {i < PHASES.length - 1 && <div style={{ width: 18, height: 2, background: "#2C4053", flexShrink: 0 }} />}
                    </React.Fragment>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 10 }}>
                <div><div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>SCENES</div><input value={t.scenes} onChange={(e) => updateTopic(t.id, { scenes: e.target.value })} style={{ width: "100%" }} /></div>
                <div><div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>TARGET (MIN)</div><input value={t.targetMin} onChange={(e) => updateTopic(t.id, { targetMin: e.target.value })} style={{ width: "100%" }} /></div>
                <div><div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>ACTUAL (MIN)</div><input value={t.actualMin} onChange={(e) => updateTopic(t.id, { actualMin: e.target.value })} style={{ width: "100%" }} /></div>
              </div>

              <textarea value={t.notes} onChange={(e) => updateTopic(t.id, { notes: e.target.value })} placeholder="Notes — blockers, decisions pending, rate limits hit…" style={{ width: "100%" }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 150px", gap: 8, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>SOURCE</div>
                  <textarea
                    value={t.source || ""}
                    onChange={(e) => updateTopic(t.id, { source: e.target.value })}
                    placeholder="Where you gathered info from — book, site, paper, documentary…"
                    style={{ width: "100%", minHeight: 34 }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>START DATE</div>
                  <input
                    type="date"
                    value={t.startDate || ""}
                    onChange={(e) => updateTopic(t.id, { startDate: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>COMPLETION DATE</div>
                  <input
                    type="date"
                    value={t.completionDate || ""}
                    onChange={(e) => updateTopic(t.id, { completionDate: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 10, color: "#5A6E7C", marginTop: 8, textAlign: "right" }}>updated {timeAgo(t.updated)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomePage({ onNavigate }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 600px at 10% -10%, #1a2c3a 0%, #14212B 55%), #14212B", color: "#E9E1CC", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "2.5px", color: "#5C8A80", marginBottom: 8 }}>HISTORY YOUTUBE CONTENT</div>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 32, fontWeight: 600, margin: "0 0 8px" }}>Production Home</h1>
        <p style={{ color: "#8FA5B3", fontSize: 14, marginBottom: 32 }}>Pick a workspace to jump into.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <button
            onClick={() => onNavigate("ledger")}
            style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 24, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ fontSize: 12, color: "#5C8A80", marginBottom: 6 }}>WORKSPACE</div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 6, color: "#E9E1CC" }}>Production Ledger</div>
            <div style={{ fontSize: 12, color: "#8FA5B3" }}>Track topics, accounts, and pipeline phases end to end.</div>
          </button>
          <button
            onClick={() => onNavigate("flow")}
            style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 24, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ fontSize: 12, color: "#5C8A80", marginBottom: 6 }}>WORKSPACE</div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 6, color: "#E9E1CC" }}>Flow Credits Planner</div>
            <div style={{ fontSize: 12, color: "#8FA5B3" }}>Split a script's scenes across your Google Flow accounts and track credits.</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function NavShell({ page, onNavigate }) {
  const [open, setOpen] = useState(false);
  const items = [
    { id: "home", label: "Home" },
    { id: "ledger", label: "Production Ledger" },
    { id: "flow", label: "Flow Credits Planner" },
  ];
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 50,
          width: 36, height: 36, borderRadius: 6,
          background: "#1D2E3B", border: "1px solid #3D5468", color: "#E9E1CC",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
        }}
      >
        <div>
          <div style={{ width: 16, height: 2, background: "#E9E1CC", marginBottom: 3 }} />
          <div style={{ width: 16, height: 2, background: "#E9E1CC", marginBottom: 3 }} />
          <div style={{ width: 16, height: 2, background: "#E9E1CC" }} />
        </div>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }}
        />
      )}

      <div
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 240, zIndex: 45,
          background: "#1D2E3B", borderRight: "1px solid #2C4053",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .2s ease", padding: "70px 16px 16px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#5C8A80", marginBottom: 14, paddingLeft: 8 }}>NAVIGATE</div>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => { onNavigate(it.id); setOpen(false); }}
            style={{
              display: "block", width: "100%", textAlign: "left",
              background: page === it.id ? "#2C4053" : "transparent",
              color: page === it.id ? "#C9A54B" : "#B9C3CB",
              border: "none", borderRadius: 6, padding: "10px 8px",
              fontSize: 13, marginBottom: 4, cursor: "pointer",
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [page, setPage] = useState("home");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return <div style={{ background: "#14212B", height: "100vh" }} />;
  }
  if (!user) {
    return <LoginScreen />;
  }
  return (
    <>
      <NavShell page={page} onNavigate={setPage} />
      {page === "home" && <HomePage onNavigate={setPage} />}
      {page === "ledger" && <Tracker user={user} />}
      {page === "flow" && <FlowPlanner user={user} />}
    </>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import FlowPlanner from "./FlowPlanner.jsx";
import SchedulePage from "./SchedulePage.jsx";
import EnvPromptGenerator from "./EnvPromptGenerator.jsx";
import ScenePromptGenerator from "./ScenePromptGenerator.jsx";
import VideoPromptGenerator from "./VideoPromptGenerator.jsx";
import logoUrl from "./assets/logo.png";

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
  { n: 10, label: "YouTube" },
];

const emptyPhases = () => ({ 1: "pending", 2: "pending", 3: "skipped", 4: "pending", 5: "pending", 6: "pending", 7: "pending", 8: "pending", 9: "pending", 10: "pending" });

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
      { id: "t1", name: "Nalanda Palm-Leaf Texts", accounts: ["a1"], phases: mk({ 1: "done", 2: "done", 4: "done", 5: "done", 6: "done" }), source: "", claudeChat: "", startDate: "", completionDate: "", uploadedDate: "", completed: false, ytShortCreated: false, ytMetadataCreated: false, ytThumbnailCreated: false, scheduleTime: "", closed: false, uploaded: false, uploadDetails: { link: "", publishDate: "", notes: "" }, notes: "Phase 7/8 pending.", updated: now },
      { id: "t2", name: "Baghdad Battery", accounts: ["a2"], phases: mk({ 1: "done", 2: "done", 4: "done", 5: "done", 6: "done", 7: "done", 8: "done" }), source: "", claudeChat: "", startDate: "", completionDate: "", uploadedDate: "", completed: false, ytShortCreated: false, ytMetadataCreated: false, ytThumbnailCreated: false, scheduleTime: "", closed: false, uploaded: false, uploadDetails: { link: "", publishDate: "", notes: "" }, notes: "Full pipeline complete.", updated: now },
      { id: "t3", name: "Iron Pillar of Delhi", accounts: ["a3"], phases: mk({ 1: "done", 2: "done", 4: "done", 5: "done", 6: "done", 7: "done", 8: "done" }), source: "", claudeChat: "", startDate: "", completionDate: "", uploadedDate: "", completed: false, ytShortCreated: false, ytMetadataCreated: false, ytThumbnailCreated: false, scheduleTime: "", closed: false, uploaded: false, uploadDetails: { link: "", publishDate: "", notes: "" }, notes: "Full package compiled.", updated: now },
      { id: "t4", name: "Antikythera Mechanism", accounts: ["a1"], phases: mk({ 1: "done", 2: "done", 4: "done", 5: "done", 6: "done", 7: "done", 8: "done" }), source: "", claudeChat: "", startDate: "", completionDate: "", uploadedDate: "", completed: false, ytShortCreated: false, ytMetadataCreated: false, ytThumbnailCreated: false, scheduleTime: "", closed: false, uploaded: false, uploadDetails: { link: "", publishDate: "", notes: "" }, notes: "Full pipeline complete.", updated: now },
      { id: "t5", name: "Seven Wonders of the Modern World", accounts: ["a2"], phases: mk({ 1: "done", 2: "active" }), source: "", claudeChat: "", startDate: "", completionDate: "", uploadedDate: "", completed: false, ytShortCreated: false, ytMetadataCreated: false, ytThumbnailCreated: false, scheduleTime: "", closed: false, uploaded: false, uploadDetails: { link: "", publishDate: "", notes: "" }, notes: "30-scene script came in short of runtime target.", updated: now },
      { id: "t6", name: "Bermuda Triangle", accounts: ["a3"], phases: mk({ 1: "done", 2: "active" }), source: "", claudeChat: "", startDate: "", completionDate: "", uploadedDate: "", completed: false, ytShortCreated: false, ytMetadataCreated: false, ytThumbnailCreated: false, scheduleTime: "", closed: false, uploaded: false, uploadDetails: { link: "", publishDate: "", notes: "" }, notes: "", updated: now },
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

// Brings older saved topics up to the current shape: single `account` -> `accounts`
// array, and adds uploaded/uploadDetails if missing. Safe to run on already-migrated data.
function migrateTopics(topics) {
  return (topics || []).map((t) => {
    const next = { ...t };
    if (!next.accounts) {
      next.accounts = next.account ? [next.account] : [];
    }
    if (next.uploaded === undefined) next.uploaded = false;
    if (!next.uploadDetails) next.uploadDetails = { link: "", publishDate: "", notes: "" };
    if (next.claudeChat === undefined) next.claudeChat = "";
    if (next.uploadedDate === undefined) next.uploadedDate = "";
    if (next.completed === undefined) next.completed = false;
    if (next.ytShortCreated === undefined) next.ytShortCreated = false;
    if (next.ytMetadataCreated === undefined) next.ytMetadataCreated = false;
    if (next.ytThumbnailCreated === undefined) next.ytThumbnailCreated = false;
    if (next.scheduleTime === undefined) next.scheduleTime = "";
    return next;
  });
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
function Tracker({ user, focusTopicId, onFocusConsumed }) {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterCompleted, setFilterCompleted] = useState("all");
  const [filterUploaded, setFilterUploaded] = useState("all");
  const [sectionOpen, setSectionOpen] = useState({ inProgress: true, closed: true, uploaded: true, videosShorts: true });
  const [checklistOpen, setChecklistOpen] = useState({}); // topic id -> bool, defaults to collapsed
  const toggleChecklist = (topicId) => setChecklistOpen((c) => ({ ...c, [topicId]: !c[topicId] }));
  const toggleSection = (key) => setSectionOpen((s) => ({ ...s, [key]: !s[key] }));

  useEffect(() => {
    if (focusTopicId) {
      setFilterTopic(focusTopicId);
      setFilterAccount("all");
      onFocusConsumed && onFocusConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTopicId]);
  const [uploadModalTopicId, setUploadModalTopicId] = useState(null);
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
        const data = snap.data();
        data.topics = migrateTopics(data.topics);
        setState(data);
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
          const data2 = snap2.data();
          data2.topics = migrateTopics(data2.topics);
          setState(data2);
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
    const next = cyclePhase(cur);
    const nextPhases = { ...topic.phases, [n]: next };
    // Marking a phase done implies every earlier phase is also done —
    // cascade forward-completed phases backward, leaving skipped ones as skipped.
    if (next === "done") {
      PHASES.forEach((p) => {
        if (p.n < n) {
          const earlier = nextPhases[p.n] || "pending";
          if (earlier !== "skipped" && earlier !== "done") nextPhases[p.n] = "done";
        }
      });
    }
    updateTopic(topic.id, { phases: nextPhases });
  };

  const addTopic = () => {
    const id = "t" + Date.now();
    setState((s) => ({
      ...s,
      topics: [
        { id, name: "New Topic", accounts: s.accounts[0] ? [s.accounts[0].id] : [], phases: emptyPhases(), source: "", claudeChat: "", startDate: "", completionDate: "", uploadedDate: "", completed: false, ytShortCreated: false, ytMetadataCreated: false, ytThumbnailCreated: false, scheduleTime: "", closed: false, uploaded: false, uploadDetails: { link: "", publishDate: "", notes: "" }, notes: "", updated: Date.now() },
        ...s.topics,
      ],
    }));
  };

  const removeTopic = (id) => setState((s) => ({ ...s, topics: s.topics.filter((t) => t.id !== id) }));
  const toggleClosed = (id) => updateTopic(id, { closed: !state.topics.find((t) => t.id === id)?.closed });

  const updateAccount = (id, patch) => setState((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

  const addAccount = () =>
    setState((s) => ({ ...s, accounts: [...s.accounts, { id: "a" + Date.now(), name: `Account ${s.accounts.length + 1}`, note: "" }] }));

  const removeAccount = (id) => {
    setState((s) => {
      if (s.accounts.length <= 1) return s;
      const remaining = s.accounts.filter((a) => a.id !== id);
      const fallback = remaining[0].id;
      return {
        ...s,
        accounts: remaining,
        topics: s.topics.map((t) => {
          const next = (t.accounts || []).filter((aid) => aid !== id);
          return { ...t, accounts: next.length ? next : [fallback] };
        }),
      };
    });
    if (filterAccount === id) setFilterAccount("all");
  };

  const toggleTopicAccount = (topicId, accountId) => {
    setState((s) => ({
      ...s,
      topics: s.topics.map((t) => {
        if (t.id !== topicId) return t;
        const has = (t.accounts || []).includes(accountId);
        const next = has ? t.accounts.filter((id) => id !== accountId) : [...(t.accounts || []), accountId];
        return { ...t, accounts: next, updated: Date.now() };
      }),
    }));
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

  // Options for the topic-name dropdown reflect every OTHER active filter (account,
  // completed, uploaded) so picking "Topic Completed: No" narrows this list too,
  // instead of always showing every topic regardless of what's filtered.
  const topicDropdownOptions = state.topics.filter(
    (t) =>
      (filterAccount === "all" || (t.accounts || []).includes(filterAccount)) &&
      (filterCompleted === "all" || (filterCompleted === "notCompleted" ? !t.completed : t.completed)) &&
      (filterUploaded === "all" || (filterUploaded === "notUploaded" ? !t.uploaded : t.uploaded))
  );
  // If a specific topic was selected but it no longer matches the other filters
  // (e.g. it was completed and the Completed filter just switched to "No"),
  // treat the selection as cleared rather than showing a stale, empty result.
  const effectiveFilterTopic = topicDropdownOptions.some((t) => t.id === filterTopic) ? filterTopic : "all";

  const visibleTopics = state.topics.filter(
    (t) =>
      (filterAccount === "all" || (t.accounts || []).includes(filterAccount)) &&
      (effectiveFilterTopic === "all" || t.id === effectiveFilterTopic) &&
      (filterCompleted === "all" || (filterCompleted === "notCompleted" ? !t.completed : t.completed)) &&
      (filterUploaded === "all" || (filterUploaded === "notUploaded" ? !t.uploaded : t.uploaded))
  );
  const accountCounts = state.accounts.reduce((acc, a) => {
    acc[a.id] = state.topics.filter((t) => (t.accounts || []).includes(a.id)).length;
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
  const inProgressTopics = state.topics.filter((t) => !t.closed);
  const closedTopics = state.topics.filter((t) => t.closed);
  const uploadedTopics = state.topics.filter((t) => t.uploaded);
  const ytShortTopics = state.topics.filter((t) => t.ytShortCreated);
  const accountName = (id) => state.accounts.find((a) => a.id === id)?.name || "—";
  const accountNames = (ids) => (ids && ids.length ? ids.map(accountName).join(", ") : "—");

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 600px at 10% -10%, #1a2c3a 0%, #14212B 55%), #14212B", color: "#E9E1CC", fontFamily: "'Inter', sans-serif", padding: "24px 16px 60px 220px" }}>
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
            <button
              onClick={() => toggleSection("inProgress")}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sectionOpen.inProgress ? 10 : 0, width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#D9A73B" }}>{sectionOpen.inProgress ? "▾" : "▸"} IN PROGRESS</div>
              <div style={{ fontSize: 11, color: "#6B7D8C" }}>{inProgressTopics.length}</div>
            </button>
            {sectionOpen.inProgress && (
              <>
                {inProgressTopics.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C" }}>Nothing mid-flight right now.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {inProgressTopics.map((t) => {
                    const cp = currentPhaseOf(t);
                    return (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, borderBottom: "1px solid #2C4053", paddingBottom: 6 }}>
                        <div style={{ color: "#E9E1CC" }}>{t.name}</div>
                        <div style={{ color: "#8FA5B3", fontSize: 11, textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                          {accountNames(t.accounts)} · {doneCountOf(t)}/{PHASES.length} done{cp ? ` · at ${cp.label}` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 14 }}>
            <button
              onClick={() => toggleSection("closed")}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sectionOpen.closed ? 10 : 0, width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#8FA5B3" }}>{sectionOpen.closed ? "▾" : "▸"} CLOSED</div>
              <div style={{ fontSize: 11, color: "#6B7D8C" }}>{closedTopics.length}</div>
            </button>
            {sectionOpen.closed && (
              <>
                {closedTopics.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C" }}>No topics closed yet.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {closedTopics.map((t) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, borderBottom: "1px solid #2C4053", paddingBottom: 6 }}>
                      <div style={{ color: "#8FA5B3" }}>{t.name}</div>
                      <div style={{ color: "#6B7D8C", fontSize: 11, textAlign: "right", flexShrink: 0, marginLeft: 8 }}>{accountNames(t.accounts)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 14 }}>
            <button
              onClick={() => toggleSection("uploaded")}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sectionOpen.uploaded ? 10 : 0, width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "#4C9A5B" }}>{sectionOpen.uploaded ? "▾" : "▸"} UPLOADED</div>
              <div style={{ fontSize: 11, color: "#6B7D8C" }}>{uploadedTopics.length}</div>
            </button>
            {sectionOpen.uploaded && (
              <>
                {uploadedTopics.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C" }}>Nothing uploaded to YouTube yet.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {uploadedTopics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setUploadModalTopicId(t.id)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, background: "transparent", border: "none", borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "#2C4053", width: "100%", textAlign: "left", cursor: "pointer", padding: 0, paddingBottom: 6 }}
                    >
                      <div style={{ color: "#E9E1CC" }}>{t.name}</div>
                      <div style={{ color: "#8FA5B3", fontSize: 11, textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                        {t.uploadDetails?.publishDate ? t.uploadDetails.publishDate : accountNames(t.accounts)}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 14, marginBottom: 24 }}>
          <button
            onClick={() => toggleSection("videosShorts")}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: sectionOpen.videosShorts ? 12 : 0, width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#C9A54B" }}>{sectionOpen.videosShorts ? "▾" : "▸"} VIDEOS & SHORTS</div>
            <div style={{ fontSize: 11, color: "#6B7D8C" }}>{state.topics.length} videos · {ytShortTopics.length} shorts</div>
          </button>
          {sectionOpen.videosShorts && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: "#8FA5B3", marginBottom: 8 }}>LONG VIDEOS ({state.topics.length})</div>
                {state.topics.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C" }}>No topics yet.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {state.topics.map((t) => (
                    <div key={t.id} style={{ fontSize: 12, color: "#E9E1CC", borderBottom: "1px solid #2C4053", paddingBottom: 6 }}>{t.name}</div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#8FA5B3", marginBottom: 8 }}>SHORT VIDEOS ({state.topics.length})</div>
                <div style={{ fontSize: 10, color: "#5A6E7C", marginBottom: 8 }}>green = short created · white = not created yet</div>
                {state.topics.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C" }}>No topics yet.</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {state.topics.map((t) => (
                    <div key={t.id} style={{ fontSize: 12, color: t.ytShortCreated ? "#4C9A5B" : "#E9E1CC", borderBottom: "1px solid #2C4053", paddingBottom: 6 }}>{t.name}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
            <select
              value={effectiveFilterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
            >
              <option value="all">All topics</option>
              {topicDropdownOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={filterCompleted} onChange={(e) => setFilterCompleted(e.target.value)}>
              <option value="all">Topic Completed: All</option>
              <option value="notCompleted">Topic Completed: No</option>
              <option value="completed">Topic Completed: Yes</option>
            </select>
            <select value={filterUploaded} onChange={(e) => setFilterUploaded(e.target.value)}>
              <option value="all">YouTube Status: All</option>
              <option value="notUploaded">YouTube Status: Not Uploaded</option>
              <option value="uploaded">YouTube Status: Uploaded</option>
            </select>
          </div>
          <button onClick={addTopic} style={{ background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: "8px 14px", fontWeight: 600, fontSize: 13 }}>+ New Topic</button>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 11, color: "#8FA5B3", marginBottom: 18, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4C9A5B", display: "inline-block" }} /> done</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#D9A73B", display: "inline-block" }} /> in progress</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #33475A", display: "inline-block" }} /> not started</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#8C5A3C", display: "inline-block" }} /> skipped</span>
          <span style={{ color: "#5A6E7C" }}>— tap a dot to cycle status</span>
        </div>

        <div
          style={{
            position: "fixed", top: 90, left: 16, width: 186, zIndex: 30,
            background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 14,
            maxHeight: "calc(100vh - 110px)", overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: 1, color: "#5C8A80", marginBottom: 8 }}>PIPELINE PHASES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "#B9C3CB" }}>
            {PHASES.map((p) => (
              <div key={p.n} style={{ display: "flex", gap: 6 }}>
                <span style={{ color: "#6B7D8C", flexShrink: 0 }}>{p.n}.</span>
                <span>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visibleTopics.length === 0 && <div style={{ color: "#6B7D8C", fontSize: 13, padding: "20px 0" }}>No topics for this account yet. Add one above.</div>}
          {visibleTopics.map((t) => (
            <div key={t.id} style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 16, opacity: t.closed ? 0.55 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <input value={t.name} onChange={(e) => updateTopic(t.id, { name: e.target.value })} style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, fontWeight: 600, flex: "1 1 220px", border: "none", background: "transparent", padding: "2px 0" }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={() => toggleClosed(t.id)} style={{ background: t.closed ? "#2C4053" : "transparent", border: "1px solid #3D5468", color: t.closed ? "#8FA5B3" : "#C9A54B", borderRadius: 4, padding: "5px 9px", fontSize: 12 }}>{t.closed ? "Reopen" : "Close"}</button>
                  <button onClick={() => removeTopic(t.id)} style={{ background: "transparent", border: "1px solid #8C5A3C", color: "#C98C6E", borderRadius: 4, padding: "5px 9px", fontSize: 12 }}>Remove</button>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {state.accounts.map((a) => {
                  const active = (t.accounts || []).includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleTopicAccount(t.id, a.id)}
                      style={{
                        fontSize: 11, borderRadius: 4, padding: "4px 9px", cursor: "pointer",
                        background: active ? "#C9A54B" : "transparent",
                        color: active ? "#14212B" : "#8FA5B3",
                        border: `1px solid ${active ? "#C9A54B" : "#3D5468"}`,
                      }}
                    >
                      {a.name}
                    </button>
                  );
                })}
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

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7D8C" }} title="Yes makes this topic selectable in the Upload Schedule page's add-topic picker">TOPIC COMPLETED</div>
                <div style={{ display: "flex", border: "1px solid #33475A", borderRadius: 999, overflow: "hidden" }}>
                  <button
                    onClick={() => updateTopic(t.id, { completed: false })}
                    style={{ fontSize: 11, padding: "5px 12px", border: "none", background: !t.completed ? "#2C4053" : "transparent", color: !t.completed ? "#E9E1CC" : "#6B7D8C" }}
                  >
                    No
                  </button>
                  <button
                    onClick={() => updateTopic(t.id, { completed: true })}
                    style={{ fontSize: 11, padding: "5px 12px", border: "none", background: t.completed ? "#C9A54B" : "transparent", color: t.completed ? "#14212B" : "#6B7D8C" }}
                  >
                    Yes
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <button
                  onClick={() => toggleChecklist(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", padding: 0, width: "fit-content" }}
                >
                  <span style={{ fontSize: 10, color: "#6B7D8C" }}>{checklistOpen[t.id] ? "▾" : "▸"} YOUTUBE CHECKLIST</span>
                  <span style={{ fontSize: 10, color: "#5A6E7C" }}>
                    ({[t.ytShortCreated, t.ytMetadataCreated, t.ytThumbnailCreated].filter(Boolean).length}/3)
                  </span>
                </button>
                {checklistOpen[t.id] && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, paddingLeft: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "fit-content" }}>
                      <input
                        type="checkbox"
                        checked={!!t.ytShortCreated}
                        onChange={(e) => updateTopic(t.id, { ytShortCreated: e.target.checked })}
                        style={{ width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 12, color: "#B9C3CB" }}>YouTube Short created?</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "fit-content" }}>
                      <input
                        type="checkbox"
                        checked={!!t.ytMetadataCreated}
                        onChange={(e) => updateTopic(t.id, { ytMetadataCreated: e.target.checked })}
                        style={{ width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 12, color: "#B9C3CB" }}>YouTube metadata created?</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", width: "fit-content" }}>
                      <input
                        type="checkbox"
                        checked={!!t.ytThumbnailCreated}
                        onChange={(e) => updateTopic(t.id, { ytThumbnailCreated: e.target.checked })}
                        style={{ width: 14, height: 14 }}
                      />
                      <span style={{ fontSize: 12, color: "#B9C3CB" }}>YouTube thumbnail created?</span>
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7D8C" }}>YOUTUBE STATUS</div>
                <div style={{ display: "flex", border: "1px solid #33475A", borderRadius: 999, overflow: "hidden" }}>
                  <button
                    onClick={() => updateTopic(t.id, { uploaded: false })}
                    style={{ fontSize: 11, padding: "5px 12px", border: "none", background: !t.uploaded ? "#2C4053" : "transparent", color: !t.uploaded ? "#E9E1CC" : "#6B7D8C" }}
                  >
                    Not Uploaded
                  </button>
                  <button
                    onClick={() => { updateTopic(t.id, { uploaded: true }); setUploadModalTopicId(t.id); }}
                    style={{ fontSize: 11, padding: "5px 12px", border: "none", background: t.uploaded ? "#4C9A5B" : "transparent", color: t.uploaded ? "#14212B" : "#6B7D8C" }}
                  >
                    Uploaded
                  </button>
                </div>
                {t.uploaded && (
                  <button onClick={() => setUploadModalTopicId(t.id)} style={{ fontSize: 11, background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "5px 9px" }}>
                    View details
                  </button>
                )}
              </div>

              <textarea value={t.notes} onChange={(e) => updateTopic(t.id, { notes: e.target.value })} placeholder="Notes — blockers, decisions pending, rate limits hit…" style={{ width: "100%" }} />

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>SOURCE</div>
                <textarea
                  value={t.source || ""}
                  onChange={(e) => updateTopic(t.id, { source: e.target.value })}
                  placeholder="Where you gathered info from — book, site, paper, documentary…"
                  style={{ width: "100%", minHeight: 34 }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>CLAUDE CHAT USED FOR PROMPTS</div>
                <input
                  value={t.claudeChat || ""}
                  onChange={(e) => updateTopic(t.id, { claudeChat: e.target.value })}
                  placeholder="Link to the Claude conversation used to generate this topic's prompts"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ fontSize: 10, color: "#5A6E7C", marginTop: 8, textAlign: "right" }}>updated {timeAgo(t.updated)}</div>
            </div>
          ))}
        </div>
      </div>

      {uploadModalTopicId && (() => {
        const modalTopic = state.topics.find((tt) => tt.id === uploadModalTopicId);
        if (!modalTopic) return null;
        const details = modalTopic.uploadDetails || { link: "", publishDate: "", notes: "" };
        return (
          <div
            onClick={() => setUploadModalTopicId(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 22, width: "100%", maxWidth: 440 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#5C8A80" }}>YOUTUBE UPLOAD DETAILS</div>
                <button onClick={() => setUploadModalTopicId(null)} style={{ background: "transparent", border: "none", color: "#8FA5B3", fontSize: 16, cursor: "pointer" }}>×</button>
              </div>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{modalTopic.name}</div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>YOUTUBE LINK</div>
                <input
                  value={details.link}
                  onChange={(e) => updateTopic(modalTopic.id, { uploadDetails: { ...details, link: e.target.value } })}
                  placeholder="https://youtube.com/watch?v=…"
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>PUBLISH DATE</div>
                <input
                  type="date"
                  value={details.publishDate}
                  onChange={(e) => updateTopic(modalTopic.id, { uploadDetails: { ...details, publishDate: e.target.value }, uploadedDate: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>NOTES</div>
                <textarea
                  value={details.notes}
                  onChange={(e) => updateTopic(modalTopic.id, { uploadDetails: { ...details, notes: e.target.value } })}
                  placeholder="Performance notes, thumbnail version, anything worth remembering…"
                  style={{ width: "100%", minHeight: 70 }}
                />
              </div>
              <button
                onClick={() => setUploadModalTopicId(null)}
                style={{ width: "100%", background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: 10, fontWeight: 600, fontSize: 13 }}
              >
                Done
              </button>
            </div>
          </div>
        );
      })()}
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
          <button
            onClick={() => onNavigate("schedule")}
            style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 24, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ fontSize: 12, color: "#5C8A80", marginBottom: 6 }}>WORKSPACE</div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 6, color: "#E9E1CC" }}>Upload Schedule</div>
            <div style={{ fontSize: 12, color: "#8FA5B3" }}>Calendar and list of planned and actual YouTube upload dates.</div>
          </button>
          <button
            onClick={() => onNavigate("envgen")}
            style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 24, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ fontSize: 12, color: "#5C8A80", marginBottom: 6 }}>WORKSPACE</div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 6, color: "#E9E1CC" }}>Environment Prompt Generator</div>
            <div style={{ fontSize: 12, color: "#8FA5B3" }}>Fill in environment name/prompt pairs and get the full Google Flow master template, ready to paste.</div>
          </button>
          <button
            onClick={() => onNavigate("scenegen")}
            style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 24, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ fontSize: 12, color: "#5C8A80", marginBottom: 6 }}>WORKSPACE</div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 6, color: "#E9E1CC" }}>Scene Image Prompt Generator</div>
            <div style={{ fontSize: 12, color: "#8FA5B3" }}>Paste your scene prompts and get the full batch-processing master template, ready to paste.</div>
          </button>
          <button
            onClick={() => onNavigate("videogen")}
            style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 24, textAlign: "left", cursor: "pointer" }}
          >
            <div style={{ fontSize: 12, color: "#5C8A80", marginBottom: 6 }}>WORKSPACE</div>
            <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 6, color: "#E9E1CC" }}>Image-to-Video Prompt Generator</div>
            <div style={{ fontSize: 12, color: "#8FA5B3" }}>Paste your S# video prompts and get the full Phase 7 batch-processing master template, ready to paste.</div>
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
    { id: "schedule", label: "Upload Schedule" },
    { id: "envgen", label: "Environment Prompt Generator" },
    { id: "scenegen", label: "Scene Image Prompt Generator" },
    { id: "videogen", label: "Image-to-Video Prompt Generator" },
  ];
  return (
    <>
      <img
        src={logoUrl}
        alt="Charitrika"
        style={{ position: "fixed", top: 12, right: 16, zIndex: 50, width: 44, height: 44, borderRadius: "50%" }}
      />
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
  const [focusTopicId, setFocusTopicId] = useState(null);

  const openTopicInLedger = (topicId) => {
    setFocusTopicId(topicId);
    setPage("ledger");
  };

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
      <div key={page} className="page-transition">
        {page === "home" && <HomePage onNavigate={setPage} />}
        {page === "ledger" && <Tracker user={user} focusTopicId={focusTopicId} onFocusConsumed={() => setFocusTopicId(null)} />}
        {page === "flow" && <FlowPlanner user={user} />}
        {page === "schedule" && <SchedulePage user={user} onOpenTopic={openTopicInLedger} />}
        {page === "envgen" && <EnvPromptGenerator user={user} />}
        {page === "scenegen" && <ScenePromptGenerator user={user} />}
        {page === "videogen" && <VideoPromptGenerator user={user} />}
      </div>
    </>
  );
}

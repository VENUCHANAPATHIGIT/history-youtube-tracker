import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { signOut } from "firebase/auth";
import { TEMPLATE_HEADER, TEMPLATE_FOOTER } from "./envTemplate.js";

function seedState() {
  return {
    entries: [
      { id: "e1", name: "", prompt: "" },
      { id: "e2", name: "", prompt: "" },
    ],
  };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function buildOutput(entries) {
  const filled = entries.filter((e) => e.name.trim() || e.prompt.trim());
  const blocks = filled.map((e, i) => {
    return `ENVIRONMENT ${pad2(i + 1)}\nNAME: ${e.name.trim()}\nPROMPT:\n${e.prompt.trim()}\n\n------------------------------------------------------------`;
  });
  const body = blocks.length ? blocks.join("\n\n") : "(no environments entered yet)";
  return `${TEMPLATE_HEADER}\n${body}\n${TEMPLATE_FOOTER}`;
}

export default function EnvPromptGenerator({ user }) {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("synced");
  const [copyLabel, setCopyLabel] = useState("Copy to clipboard");
  const saveTimer = useRef(null);
  const suppressNextSnapshot = useRef(false);
  const docRef = useRef(doc(db, "users", user.uid, "envPromptGenerator", "main"));

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
        if (snap2.exists()) setState(snap2.data());
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
        Loading generator…
      </div>
    );
  }

  const updateEntry = (id, patch) => {
    setState((s) => ({ ...s, entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  };
  const addEntry = () => {
    setState((s) => ({ ...s, entries: [...s.entries, { id: "e" + Date.now(), name: "", prompt: "" }] }));
  };
  const removeEntry = (id) => {
    setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
  };

  const output = buildOutput(state.entries);

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy to clipboard"), 1500);
    } catch {
      setCopyLabel("Copy failed — select manually");
      setTimeout(() => setCopyLabel("Copy to clipboard"), 2000);
    }
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

      <div style={{ maxWidth: 1100, margin: "0 auto", paddingLeft: 40 }}>
        <div style={{ borderBottom: "1px solid #33475A", paddingBottom: 18, marginBottom: 22, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "2.5px", color: "#5C8A80", marginBottom: 6 }}>GOOGLE FLOW · AGENT MODE</div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 600, margin: 0 }}>Environment Prompt Generator</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, color: saveState === "synced" ? "#4C9A5B" : "#6B7D8C" }}>{saveState}</div>
            <button onClick={() => signOut(auth)} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>Sign out</button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#8FA5B3", marginBottom: 18 }}>
          Type in the environment name and image prompt for each entry — the full master template with your entries slotted in appears on the right, ready to paste into Google Flow Agent Mode.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          {/* Input column */}
          <div>
            <div style={{ fontSize: 10, color: "#C9A54B", marginBottom: 10 }}>ENVIRONMENT ENTRIES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {state.entries.map((e, i) => (
                <div key={e.id} style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "#6B7D8C" }}>ENVIRONMENT {pad2(i + 1)}</span>
                    <button onClick={() => removeEntry(e.id)} style={{ background: "transparent", border: "none", color: "#8C5A3C", fontSize: 13, cursor: "pointer" }}>×</button>
                  </div>
                  <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>NAME</div>
                  <input
                    value={e.name}
                    onChange={(ev) => updateEntry(e.id, { name: ev.target.value })}
                    placeholder="Exact asset name, e.g. RacetrackPlayaDay"
                    style={{ width: "100%", marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 10, color: "#6B7D8C", marginBottom: 3 }}>PROMPT</div>
                  <textarea
                    value={e.prompt}
                    onChange={(ev) => updateEntry(e.id, { prompt: ev.target.value })}
                    placeholder="Environment image prompt…"
                    style={{ width: "100%", minHeight: 80 }}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={addEntry}
              style={{ marginTop: 10, background: "transparent", border: "1px dashed #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "8px 14px", fontSize: 12 }}
            >
              + Add another environment
            </button>
          </div>

          {/* Output column */}
          <div style={{ position: "sticky", top: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#C9A54B" }}>GENERATED TEMPLATE — READY TO PASTE</div>
              <button
                onClick={copyOutput}
                style={{ background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: "6px 12px", fontWeight: 600, fontSize: 12 }}
              >
                {copyLabel}
              </button>
            </div>
            <textarea
              readOnly
              value={output}
              style={{ width: "100%", minHeight: 640, fontFamily: "monospace", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre", background: "#0F1922" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

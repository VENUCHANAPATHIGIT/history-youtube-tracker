import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { signOut } from "firebase/auth";
import { VIDEO_TEMPLATE_HEADER, VIDEO_TEMPLATE_FOOTER } from "./videoTemplate.js";

function seedState() {
  return { bulkText: "" };
}

const PLACEHOLDER = `TOPIC:
Antikythera Mechanism

TOTAL SCENES:
5

BATCH_SIZE:
5


SCENE ID: S1

SOURCE SCENE IMAGE:
S1

OUTPUT VIDEO:
V1

DURATION:
~8 seconds

VIDEO PROMPT:
Slow push-in on the bronze gears as hands stop moving, dust settles...

AMBIENT SOUND:
Distant workshop ambience, faint wind

BACKGROUND MUSIC:
Subtle instrumental, low

VOICEOVER:
NONE


SCENE ID: S2

SOURCE SCENE IMAGE:
S2

OUTPUT VIDEO:
V2

DURATION:
~8 seconds

VIDEO PROMPT:
Camera drifts right across the workbench, oil lamp flame flickers...

AMBIENT SOUND:
Room tone, faint crackle

BACKGROUND MUSIC:
Subtle instrumental, low

VOICEOVER:
NONE`;

// Roughly counts "SCENE ID:" occurrences so the person can see it's registering their input.
function countScenes(text) {
  const matches = (text || "").match(/SCENE ID\s*:/gi);
  return matches ? matches.length : 0;
}

function buildOutput(bulkText) {
  const body = bulkText && bulkText.trim() ? bulkText.trim() : "(no scenes entered yet)";
  return `${VIDEO_TEMPLATE_HEADER}\n${body}\n${VIDEO_TEMPLATE_FOOTER}`;
}

export default function VideoPromptGenerator({ user }) {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("synced");
  const [copyLabel, setCopyLabel] = useState("Copy to clipboard");
  const saveTimer = useRef(null);
  const suppressNextSnapshot = useRef(false);
  const docRef = useRef(doc(db, "users", user.uid, "videoPromptGenerator", "main"));

  useEffect(() => {
    let unsub;
    (async () => {
      const snap = await getDoc(docRef.current);
      if (snap.exists()) {
        const data = snap.data();
        if (data.bulkText === undefined) data.bulkText = "";
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

  const output = buildOutput(state.bulkText);
  const sceneCount = countScenes(state.bulkText);

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
        textarea { font-family:'Inter',sans-serif; background:#14212B; border:1px solid #33475A; color:#E9E1CC; border-radius:4px; padding:8px; font-size:13px; outline:none; resize:vertical; }
        textarea:focus { border-color:#C9A54B; }
        button { font-family:'Inter',sans-serif; cursor:pointer; }
        ::placeholder { color:#6B7D8C; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", paddingLeft: 40 }}>
        <div style={{ borderBottom: "1px solid #33475A", paddingBottom: 18, marginBottom: 22, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "2.5px", color: "#5C8A80", marginBottom: 6 }}>GOOGLE FLOW / VEO · AGENT MODE · PHASE 7</div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 600, margin: 0 }}>Image-to-Video Prompt Generator</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, color: saveState === "synced" ? "#4C9A5B" : "#6B7D8C" }}>{saveState}</div>
            <button onClick={() => signOut(auth)} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>Sign out</button>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#8FA5B3", marginBottom: 18 }}>
          Type or paste TOPIC, TOTAL SCENES, BATCH_SIZE, and each SCENE ID / SOURCE SCENE IMAGE / OUTPUT VIDEO / DURATION / VIDEO PROMPT / AMBIENT SOUND / BACKGROUND MUSIC / VOICEOVER block into the one box below. The full Phase 7 master template with your scenes inserted appears on the right.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          {/* Input column */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#C9A54B" }}>SCENE / VIDEO PROMPTS — {sceneCount} SCENE ID{sceneCount === 1 ? "" : "S"} DETECTED</div>
            </div>
            <textarea
              value={state.bulkText}
              onChange={(e) => setState((s) => ({ ...s, bulkText: e.target.value }))}
              placeholder={PLACEHOLDER}
              style={{ width: "100%", minHeight: 640 }}
            />
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

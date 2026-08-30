import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { signOut } from "firebase/auth";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
// Indexed by Date.getDay() (0=Sun..6=Sat): "both" = Long-form + Short, "short" = Short only.
const WEEKLY_RHYTHM = ["both", "both", "short", "both", "short", "both", "short"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n) {
  return String(n).padStart(2, "0");
}
function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Build a flat list of schedule entries from topics: one entry per topic that has
// either an actual uploaded date (posted) or a completion date (planned target).
// Custom entries (free text, not tied to any Ledger topic) are merged in the same shape.
function buildEntries(topics, customEntries) {
  const entries = [];
  (topics || []).forEach((t) => {
    const uploadedDate = t.uploadedDate || t.uploadDetails?.publishDate;
    if (t.uploaded && uploadedDate) {
      entries.push({ id: t.id, topicId: t.id, name: t.name, date: uploadedDate, time: t.scheduleTime || "", status: "posted", source: "topic" });
    } else if (!t.uploaded && t.completionDate) {
      entries.push({ id: t.id, topicId: t.id, name: t.name, date: t.completionDate, time: t.scheduleTime || "", status: "planned", source: "topic" });
    }
  });
  (customEntries || []).forEach((c) => {
    entries.push({ id: c.id, name: c.name, date: c.date, time: c.time || "", status: c.status, source: "custom" });
  });
  return entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.time || "").localeCompare(b.time || "");
  });
}

export default function SchedulePage({ user, onOpenTopic }) {
  const [topics, setTopics] = useState(null);
  const [customEntries, setCustomEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [pickerDate, setPickerDate] = useState(null); // iso date string when the add-topic picker is open
  const [customDraftText, setCustomDraftText] = useState(""); // text for the custom-entry input in the picker
  const [shortDateDrafts, setShortDateDrafts] = useState({}); // topicId -> draft date string for the Shorts panel
  const [saveState, setSaveState] = useState("synced");
  const suppressNextSnapshot = useRef(false);
  const docRef = useRef(doc(db, "users", user.uid, "tracker", "main"));

  useEffect(() => {
    let unsub;
    (async () => {
      const snap = await getDoc(docRef.current);
      if (snap.exists()) {
        const data = snap.data();
        setTopics(data.topics || []);
        setCustomEntries(data.scheduleCustomEntries || []);
      }
      setLoaded(true);
      unsub = onSnapshot(docRef.current, (snap2) => {
        if (suppressNextSnapshot.current) {
          suppressNextSnapshot.current = false;
          return;
        }
        if (snap2.exists()) {
          const data2 = snap2.data();
          setTopics(data2.topics || []);
          setCustomEntries(data2.scheduleCustomEntries || []);
        }
      });
    })();
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Writes a patch to one topic and pushes the full topics array back to Firestore.
  const patchTopic = async (topicId, patch) => {
    setTopics((prev) => {
      const next = prev.map((t) => (t.id === topicId ? { ...t, ...patch, updated: Date.now() } : t));
      setSaveState("saving…");
      suppressNextSnapshot.current = true;
      setDoc(docRef.current, { topics: next }, { merge: true }).then(() => setSaveState("synced"));
      return next;
    });
  };

  // Persists the custom entries array (free-text calendar entries not tied to a Ledger topic).
  const saveCustomEntries = (next) => {
    setCustomEntries(next);
    setSaveState("saving…");
    suppressNextSnapshot.current = true;
    setDoc(docRef.current, { scheduleCustomEntries: next }, { merge: true }).then(() => setSaveState("synced"));
  };

  const addCustomEntry = (dateIso, name) => {
    if (!name.trim()) return;
    const entry = { id: "c" + Date.now(), name: name.trim(), date: dateIso, time: "", status: "planned" };
    saveCustomEntries([...customEntries, entry]);
    setCustomDraftText("");
    setPickerDate(null);
  };
  const toggleCustomStatus = (id) => {
    saveCustomEntries(customEntries.map((c) => (c.id === id ? { ...c, status: c.status === "posted" ? "planned" : "posted" } : c)));
  };
  const removeCustomEntry = (id) => {
    saveCustomEntries(customEntries.filter((c) => c.id !== id));
  };
  const updateCustomEntryTime = (id, time) => {
    saveCustomEntries(customEntries.map((c) => (c.id === id ? { ...c, time } : c)));
  };

  // Sets the upload time for a scheduled entry — works for both topic-based
  // and custom entries.
  const updateEntryTime = (entry, time) => {
    if (entry.source === "custom") {
      updateCustomEntryTime(entry.id, time);
    } else {
      patchTopic(entry.topicId, { scheduleTime: time });
    }
  };

  if (!loaded) {
    return (
      <div style={{ background: "#14212B", color: "#E9E1CC", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
        Loading schedule…
      </div>
    );
  }

  const entries = buildEntries(topics, customEntries);
  const entriesByDate = {};
  entries.forEach((e) => {
    (entriesByDate[e.date] = entriesByDate[e.date] || []).push(e);
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = weekDays[6];
  const today = new Date();
  const todayIso = isoDate(today);

  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
      : `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const weekEntries = weekDays.flatMap((d) => entriesByDate[isoDate(d)] || []);

  const goPrev = () => setWeekStart((d) => addDays(d, -7));
  const goNext = () => setWeekStart((d) => addDays(d, 7));
  const goThisWeek = () => setWeekStart(startOfWeek(new Date()));

  const openTopic = (topicId) => {
    if (onOpenTopic) onOpenTopic(topicId);
  };

  // Toggle a scheduled entry between planned (yellow) and posted (green).
  const toggleStatus = (entry) => {
    if (entry.source === "custom") {
      toggleCustomStatus(entry.id);
      return;
    }
    if (entry.status === "planned") {
      patchTopic(entry.topicId, { uploaded: true, uploadedDate: entry.date });
    } else {
      patchTopic(entry.topicId, { uploaded: false, completionDate: entry.date });
    }
  };

  // Fully unschedules an entry — clears whichever date put it on the calendar (or
  // deletes it outright if it's a custom entry).
  const removeFromSchedule = (entry) => {
    if (entry.source === "custom") {
      removeCustomEntry(entry.id);
      return;
    }
    patchTopic(entry.topicId, { completionDate: "", uploaded: false, uploadedDate: "" });
  };

  // Only topics you've marked "Topic Completed: Yes" on the Ledger (and not
  // already uploaded) are ready to be scheduled — candidates for the "add to this day" picker.
  // Only topics you've marked "Topic Completed: Yes" on the Ledger (and not
  // already uploaded) are ready to be scheduled — candidates for the "add to this day" picker.
  const schedulableTopics = (topics || []).filter((t) => t.completed && !t.uploaded);
  // Shorts only need "YouTube Short created?" checked — they don't require the
  // full "Topic Completed" flag, since a short is often ready before the full video is.
  // A topic can be both a full video AND a short at once, so these two lists
  // are not mutually exclusive — a topic marked as a short still shows up here too.
  const schedulableFullVideos = schedulableTopics;
  const schedulableShorts = (topics || []).filter((t) => t.ytShortCreated && !t.uploaded);
  // For the SHORTS panel display — every short regardless of upload status,
  // so it's a complete list, not just the ones still needing a date.
  const allShorts = (topics || []).filter((t) => t.ytShortCreated);

  const assignTopicToDay = (topicId, iso) => {
    patchTopic(topicId, { completionDate: iso });
    setPickerDate(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 600px at 10% -10%, #1a2c3a 0%, #14212B 55%), #14212B", color: "#E9E1CC", fontFamily: "'Inter', sans-serif", padding: "24px 16px 60px" }}>
      <style>{`
        * { box-sizing: border-box; }
        button { font-family: 'Inter', sans-serif; cursor: pointer; }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", paddingLeft: 40 }}>
        <div style={{ borderBottom: "1px solid #33475A", paddingBottom: 18, marginBottom: 22, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "2.5px", color: "#5C8A80", marginBottom: 6 }}>HISTORY YOUTUBE CONTENT</div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 600, margin: 0 }}>Upload Schedule</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, color: saveState === "synced" ? "#4C9A5B" : "#6B7D8C" }}>{saveState}</div>
            <button onClick={() => signOut(auth)} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>Sign out</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 11, color: "#8FA5B3", marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4C9A5B", display: "inline-block" }} /> posted</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#D9A73B", display: "inline-block" }} /> planned to upload</span>
          <span style={{ color: "#5A6E7C" }}>— click a topic name to open it on the Ledger, click the dot to flip its status, × to remove, + to add one</span>
        </div>

        {/* Weekly rhythm reference */}
        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 14, marginBottom: 22 }}>
          <div style={{ fontSize: 10, color: "#C9A54B", marginBottom: 10 }}>WEEKLY UPLOAD RHYTHM</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, fontSize: 11 }}>
            {DAY_LABELS.map((label, i) => {
              const plan = WEEKLY_RHYTHM[i] === "short" ? "Short only" : "Long-form + Short";
              return (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ color: "#8FA5B3", marginBottom: 3 }}>{label[0]}{label.slice(1).toLowerCase()}</div>
                  <div style={{ color: plan === "Short only" ? "#D9A73B" : "#4C9A5B", fontSize: 10 }}>{plan}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shorts — auto-populated from Ledger topics marked "YouTube Short created?" */}
        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 16, marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#C9A54B" }}>SHORTS</div>
            <div style={{ fontSize: 11, color: "#6B7D8C" }}>{allShorts.length}</div>
          </div>
          {allShorts.length === 0 && (
            <div style={{ fontSize: 12, color: "#6B7D8C" }}>No shorts yet — check "YouTube Short created?" on a topic in the Production Ledger and it shows up here automatically.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allShorts.map((t) =>
              t.uploaded ? (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, background: "#14212B", border: "1px solid #2C4053", borderRadius: 6, padding: "8px 10px" }}>
                  <button onClick={() => openTopic(t.id)} style={{ background: "transparent", border: "none", color: "#E9E1CC", cursor: "pointer", padding: 0, textAlign: "left", flex: "1 1 160px" }}>
                    {t.name}
                  </button>
                  <span style={{ fontSize: 11, color: "#4C9A5B", background: "transparent", border: "1px solid #4C9A5B", borderRadius: 4, padding: "3px 8px" }}>
                    Posted{(t.uploadedDate || t.uploadDetails?.publishDate) ? ` · ${t.uploadedDate || t.uploadDetails?.publishDate}` : ""}
                  </span>
                </div>
              ) : (
                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, background: "#14212B", border: "1px solid #2C4053", borderRadius: 6, padding: "8px 10px" }}>
                  <button onClick={() => openTopic(t.id)} style={{ background: "transparent", border: "none", color: "#E9E1CC", cursor: "pointer", padding: 0, textAlign: "left", flex: "1 1 160px" }}>
                    {t.name}
                    {t.completionDate && <span style={{ color: "#D9A73B", fontSize: 11, marginLeft: 6 }}>· planned {t.completionDate}</span>}
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="date"
                      value={shortDateDrafts[t.id] ?? (t.completionDate || "")}
                      onChange={(e) => setShortDateDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                      style={{ fontSize: 12 }}
                    />
                    <input
                      type="time"
                      value={t.scheduleTime || ""}
                      onChange={(e) => patchTopic(t.id, { scheduleTime: e.target.value })}
                      title="Upload time"
                      style={{ fontSize: 12 }}
                    />
                    <button
                      onClick={() => {
                        const iso = shortDateDrafts[t.id] || t.completionDate;
                        if (iso) assignTopicToDay(t.id, iso);
                      }}
                      style={{ background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: "6px 10px", fontWeight: 600, fontSize: 11 }}
                    >
                      {t.completionDate ? "Update" : "Add to day"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Weekly calendar */}
        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 16, marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={goPrev} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "5px 10px", fontSize: 13 }}>‹</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, fontWeight: 600 }}>{weekLabel}</div>
              <button onClick={goThisWeek} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "3px 8px", fontSize: 11 }}>This week</button>
            </div>
            <button onClick={goNext} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "5px 10px", fontSize: 13 }}>›</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {weekDays.map((d) => {
              const iso = isoDate(d);
              const dayEntries = entriesByDate[iso] || [];
              const isToday = iso === todayIso;
              return (
                <div key={iso} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: isToday ? "#C9A54B" : "#6B7D8C", textAlign: "center", marginBottom: 4 }}>
                    {DAY_LABELS[d.getDay()]} {d.getDate()}
                  </div>
                  <div
                    style={{
                      minHeight: 140, border: `1px solid ${isToday ? "#C9A54B" : "#2C4053"}`, borderRadius: 6,
                      background: "#14212B", padding: 5, display: "flex", flexDirection: "column", gap: 4, minWidth: 0,
                    }}
                  >
                    {dayEntries.map((e) => (
                      <div
                        key={e.id}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 4, borderRadius: 4, padding: "3px 4px",
                          background: e.status === "posted" ? "#4C9A5B" : "#D9A73B", minWidth: 0,
                        }}
                      >
                        {e.source === "custom" ? (
                          <div
                            title={e.name}
                            style={{
                              flex: 1, minWidth: 0, fontSize: 10, fontWeight: 600, lineHeight: 1.3, textAlign: "left",
                              color: e.status === "posted" ? "#0d2116" : "#3a2a05",
                              whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere",
                            }}
                          >
                            {e.time && <span style={{ opacity: 0.75 }}>{e.time} · </span>}
                            {e.name}
                          </div>
                        ) : (
                          <button
                            onClick={() => openTopic(e.topicId)}
                            title={`${e.name} — open on Production Ledger`}
                            style={{
                              flex: 1, minWidth: 0, fontSize: 10, fontWeight: 600, lineHeight: 1.3, textAlign: "left",
                              border: "none", background: "transparent", cursor: "pointer", padding: 0,
                              color: e.status === "posted" ? "#0d2116" : "#3a2a05",
                              whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere",
                            }}
                          >
                            {e.time && <span style={{ opacity: 0.75 }}>{e.time} · </span>}
                            {e.name}
                          </button>
                        )}
                        <button
                          onClick={() => toggleStatus(e)}
                          title={e.status === "posted" ? "Mark as planned (not yet uploaded)" : "Mark as posted (uploaded today)"}
                          style={{
                            width: 12, height: 12, borderRadius: "50%", flexShrink: 0, padding: 0, cursor: "pointer", marginTop: 2,
                            border: `2px solid ${e.status === "posted" ? "#0d2116" : "#3a2a05"}`,
                            background: "transparent",
                          }}
                        />
                        <button
                          onClick={() => removeFromSchedule(e)}
                          title="Remove from schedule"
                          style={{
                            fontSize: 10, lineHeight: 1, flexShrink: 0, padding: "0 2px", cursor: "pointer",
                            border: "none", background: "transparent",
                            color: e.status === "posted" ? "#0d2116" : "#3a2a05",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setPickerDate(iso)}
                      style={{ marginTop: "auto", fontSize: 10, color: "#6B7D8C", background: "transparent", border: "1px dashed #33475A", borderRadius: 4, padding: "3px 0" }}
                    >
                      + add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* List view for the same week */}
        <div style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#C9A54B", marginBottom: 10 }}>{weekLabel.toUpperCase()} — LIST VIEW</div>
          {weekEntries.length === 0 && <div style={{ fontSize: 12, color: "#6B7D8C" }}>Nothing scheduled or posted this week.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {weekEntries.map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, borderBottom: "1px solid #2C4053", paddingBottom: 8 }}>
                {e.source === "custom" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#E9E1CC" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.status === "posted" ? "#4C9A5B" : "#D9A73B", flexShrink: 0 }} />
                    <span>{e.name}</span>
                  </div>
                ) : (
                  <button onClick={() => openTopic(e.topicId)} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", padding: 0, color: "#E9E1CC" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.status === "posted" ? "#4C9A5B" : "#D9A73B", flexShrink: 0 }} />
                    <span>{e.name}</span>
                  </button>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() => toggleStatus(e)}
                    style={{ fontSize: 11, background: "transparent", border: `1px solid ${e.status === "posted" ? "#4C9A5B" : "#D9A73B"}`, color: e.status === "posted" ? "#4C9A5B" : "#D9A73B", borderRadius: 4, padding: "2px 8px" }}
                  >
                    {e.status === "posted" ? "Posted" : "Planned"}
                  </button>
                  <span style={{ fontSize: 12, color: "#8FA5B3" }}>{e.date}</span>
                  <input
                    type="time"
                    value={e.time || ""}
                    onChange={(ev) => updateEntryTime(e, ev.target.value)}
                    title="Upload time"
                    style={{ fontSize: 12, padding: "3px 6px" }}
                  />
                  <button
                    onClick={() => removeFromSchedule(e)}
                    title="Remove from schedule"
                    style={{ fontSize: 13, background: "transparent", border: "none", color: "#8C5A3C", cursor: "pointer", padding: "0 2px" }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add-topic picker modal */}
      {pickerDate && (() => {
        const [py, pm, pd] = pickerDate.split("-").map(Number);
        const pickerDayType = WEEKLY_RHYTHM[new Date(py, pm - 1, pd).getDay()]; // "both" | "short"
        return (
        <div
          onClick={() => setPickerDate(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1D2E3B", border: "1px solid #2C4053", borderRadius: 10, padding: 20, width: "100%", maxWidth: 380, maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#5C8A80" }}>ADD TOPIC TO {pickerDate}</div>
              <button onClick={() => setPickerDate(null)} style={{ background: "transparent", border: "none", color: "#8FA5B3", fontSize: 16, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ fontSize: 11, color: pickerDayType === "short" ? "#D9A73B" : "#4C9A5B", marginBottom: 12 }}>
              {pickerDayType === "short" ? "Short-only day — showing YT Short topics only" : "Long-form + Short day"}
            </div>

            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid #2C4053" }}>
              <div style={{ fontSize: 10, color: "#8FA5B3", marginBottom: 6 }}>OR ADD A CUSTOM ENTRY (not tied to a Ledger topic)</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={customDraftText}
                  onChange={(e) => setCustomDraftText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustomEntry(pickerDate, customDraftText); }}
                  placeholder="e.g. Community post, livestream…"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => addCustomEntry(pickerDate, customDraftText)}
                  style={{ background: "#C9A54B", color: "#14212B", border: "none", borderRadius: 4, padding: "6px 12px", fontWeight: 600, fontSize: 12 }}
                >
                  Add
                </button>
              </div>
            </div>

            {schedulableFullVideos.length === 0 && schedulableShorts.length === 0 && (
              <div style={{ fontSize: 12, color: "#6B7D8C" }}>
                Nothing ready to schedule — set "Topic Completed" to Yes for full videos, or check "YouTube Short created?" for shorts, on the Production Ledger first.
              </div>
            )}

            {pickerDayType === "both" && schedulableFullVideos.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: "#8FA5B3", marginBottom: 6 }}>FULL VIDEO TOPICS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                  {schedulableFullVideos.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => assignTopicToDay(t.id, pickerDate)}
                      style={{ textAlign: "left", background: "#14212B", border: "1px solid #33475A", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#E9E1CC" }}
                    >
                      {t.name}
                      {t.completionDate && <span style={{ fontSize: 11, color: "#6B7D8C", marginLeft: 6 }}>(currently planned {t.completionDate})</span>}
                    </button>
                  ))}
                </div>
              </>
            )}

            {schedulableShorts.length > 0 && (
              <>
                <div style={{ fontSize: 10, color: "#8FA5B3", marginBottom: 6 }}>YT SHORT TOPICS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {schedulableShorts.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => assignTopicToDay(t.id, pickerDate)}
                      style={{ textAlign: "left", background: "#14212B", border: "1px solid #33475A", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#E9E1CC" }}
                    >
                      {t.name}
                      {t.completionDate && <span style={{ fontSize: 11, color: "#6B7D8C", marginLeft: 6 }}>(currently planned {t.completionDate})</span>}
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
        );
      })()}
    </div>
  );
}

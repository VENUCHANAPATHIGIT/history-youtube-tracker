import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import { signOut } from "firebase/auth";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
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
// either an actual publish date (posted) or a completion date (planned target).
function buildEntries(topics) {
  const entries = [];
  (topics || []).forEach((t) => {
    const publishDate = t.uploadDetails?.publishDate;
    if (t.uploaded && publishDate) {
      entries.push({ topicId: t.id, name: t.name, date: publishDate, status: "posted", link: t.uploadDetails?.link || "" });
    } else if (!t.uploaded && t.completionDate) {
      entries.push({ topicId: t.id, name: t.name, date: t.completionDate, status: "planned" });
    }
  });
  return entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export default function SchedulePage({ user, onOpenTopic }) {
  const [topics, setTopics] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const docRef = useRef(doc(db, "users", user.uid, "tracker", "main"));

  useEffect(() => {
    let unsub;
    (async () => {
      const snap = await getDoc(docRef.current);
      if (snap.exists()) setTopics(snap.data().topics || []);
      setLoaded(true);
      unsub = onSnapshot(docRef.current, (snap2) => {
        if (snap2.exists()) setTopics(snap2.data().topics || []);
      });
    })();
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!loaded) {
    return (
      <div style={{ background: "#14212B", color: "#E9E1CC", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
        Loading schedule…
      </div>
    );
  }

  const entries = buildEntries(topics);
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
          <button onClick={() => signOut(auth)} style={{ background: "transparent", border: "1px solid #3D5468", color: "#8FA5B3", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>Sign out</button>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 11, color: "#8FA5B3", marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4C9A5B", display: "inline-block" }} /> posted</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#D9A73B", display: "inline-block" }} /> planned to upload</span>
          <span style={{ color: "#5A6E7C" }}>— click a topic to open it on the Production Ledger</span>
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {weekDays.map((d) => {
              const iso = isoDate(d);
              const dayEntries = entriesByDate[iso] || [];
              const isToday = iso === todayIso;
              return (
                <div key={iso}>
                  <div style={{ fontSize: 10, color: isToday ? "#C9A54B" : "#6B7D8C", textAlign: "center", marginBottom: 4 }}>
                    {DAY_LABELS[d.getDay()]} {d.getDate()}
                  </div>
                  <div
                    style={{
                      minHeight: 130, border: `1px solid ${isToday ? "#C9A54B" : "#2C4053"}`, borderRadius: 6,
                      background: "#14212B", padding: 5, display: "flex", flexDirection: "column", gap: 4,
                    }}
                  >
                    {dayEntries.map((e) => (
                      <button
                        key={e.topicId}
                        onClick={() => openTopic(e.topicId)}
                        title={`${e.name} — open on Production Ledger`}
                        style={{
                          fontSize: 10, borderRadius: 4, padding: "4px 5px", fontWeight: 600, lineHeight: 1.3,
                          textAlign: "left", border: "none", cursor: "pointer",
                          background: e.status === "posted" ? "#4C9A5B" : "#D9A73B",
                          color: e.status === "posted" ? "#0d2116" : "#3a2a05",
                        }}
                      >
                        {e.name}
                      </button>
                    ))}
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
              <button
                key={e.topicId}
                onClick={() => openTopic(e.topicId)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, borderBottom: "1px solid #2C4053", paddingBottom: 8, background: "transparent", border: "none", borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "#2C4053", width: "100%", textAlign: "left", cursor: "pointer", padding: 0, paddingBottom: 8 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.status === "posted" ? "#4C9A5B" : "#D9A73B", flexShrink: 0 }} />
                  <span style={{ color: "#E9E1CC" }}>{e.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: e.status === "posted" ? "#4C9A5B" : "#D9A73B" }}>{e.status === "posted" ? "Posted" : "Planned"}</span>
                  <span style={{ fontSize: 12, color: "#8FA5B3" }}>{e.date}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

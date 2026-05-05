// app/assessment/[id]/page.tsx
// Assessment form — fill in สภาพที่เป็นอยู่ (score2) and สภาพที่พึงประสงค์ (score)
// Matches original UI from screenshots

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Section {
  id: number;
  nameTh: string;
  nameEn: string | null;
  order: number;
  indicatorsCount: number;
}

interface Indicator {
  id: number;
  sectionId: number | null;
  itemCode: string | null;
  textTh: string;
  minScore: number;
  maxScore: number;
}

interface ResponseMap {
  [indicatorId: number]: {
    score: number | null;   // สภาพที่พึงประสงค์
    score2: number | null;  // สภาพที่เป็นอยู่
  };
}

interface Session {
  id: number;
  status: string;
  instrumentId: number;
  schoolId: number;
  academicYearId: number;
  termId: number | null;
  school: { nameTh: string | null; name: string };
  evaluator: { name: string };
  academicYear: { year: string };
  term: { name: string } | null;
  instrument: { id: number; nameTh: string };
}

interface SchoolAggregate {
  totalSessions: number;
  completionRate: number;
  overallQualityIndex: number;
  dimensionScores: Array<{
    dimension: string;
    labelTh: string;
    percent: number;
    status: 'green' | 'yellow' | 'red';
  }>;
}

const SCALE_LABELS: Record<number, string> = { 5: 'ดีมาก', 4: 'ดี', 3: 'ปานกลาง', 2: 'พอใช้', 1: 'ปรับปรุง' };
const AGG_POLL_INTERVAL = 5000;

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [responses, setResponses] = useState<ResponseMap>({});
  const [activeTab, setActiveTab] = useState<number | 'all'>('all');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [schoolAggregate, setSchoolAggregate] = useState<SchoolAggregate | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    loadAll(stored);
  }, [router, sessionId]);

  const loadAll = async (authToken: string) => {
    try {
      const [sessionRes, responsesRes] = await Promise.all([
        fetch(`/api/evaluations/${sessionId}`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/evaluations/${sessionId}/responses`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);

      if (!sessionRes.ok) { setError('ไม่พบแบบประเมินนี้'); setLoading(false); return; }
      const sessionData = await sessionRes.json();
      const sess: Session = sessionData.data || sessionData;
      setSession(sess);
      if (sess.status === 'SUBMITTED') setSubmitted(true);

      // Load sections and indicators
      const [sectionsRes, indicatorsRes] = await Promise.all([
        fetch(`/api/instruments/${sess.instrumentId}/sections`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`/api/instruments/${sess.instrumentId}/indicators`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);

      if (sectionsRes.ok) {
        const sd = await sectionsRes.json();
        setSections((sd.data || sd).sort((a: Section, b: Section) => a.order - b.order));
      }
      if (indicatorsRes.ok) {
        const id = await indicatorsRes.json();
        setIndicators(id.data || id);
      }

      // Map existing responses
      if (responsesRes.ok) {
        const rd = await responsesRes.json();
        const map: ResponseMap = {};
        for (const r of rd.data || rd) {
          map[r.indicatorId] = { score: r.score ?? null, score2: r.score2 ?? null };
        }
        setResponses(map);
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // Real-time school-wide aggregate (polls /api/live-dashboard scoped to this session's school)
  useEffect(() => {
    if (!token || !session) return;
    const fetchAggregate = async () => {
      try {
        const params = new URLSearchParams({
          scope: 'school',
          schoolId: String(session.schoolId),
        });
        if (session.academicYearId) params.set('academicYearId', String(session.academicYearId));
        if (session.termId) params.set('termId', String(session.termId));
        const res = await fetch(`/api/live-dashboard?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) setSchoolAggregate(json.data);
        }
      } catch {
        // silent — keep showing last good data
      }
    };
    fetchAggregate();
    const id = setInterval(fetchAggregate, AGG_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [token, session]);

  const saveResponse = useCallback(async (indicatorId: number, field: 'score' | 'score2', value: number) => {
    if (!token || submitted) return;
    setSaving(indicatorId);

    const current = responses[indicatorId] || { score: null, score2: null };
    const updated = { ...current, [field]: value };

    setResponses((prev) => ({ ...prev, [indicatorId]: updated }));

    // Only POST when at least one field has value
    try {
      await fetch(`/api/evaluations/${sessionId}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: [{
            indicatorId,
            score: updated.score ?? value,
            score2: field === 'score2' ? value : (updated.score2 ?? null),
          }],
        }),
      });
    } catch {
      // silent — state already updated optimistically
    } finally {
      setSaving(null);
    }
  }, [token, sessionId, responses, submitted]);

  const handleSubmit = async () => {
    if (!token || submitting) return;
    const total = indicators.length;
    const answered = indicators.filter((ind) => {
      const r = responses[ind.id];
      return r && r.score !== null && r.score2 !== null;
    }).length;
    if (answered < total) {
      const ok = window.confirm(`ยังตอบไม่ครบ (${answered}/${total} ข้อ)\nต้องการส่งแบบประเมินเลยหรือไม่?`);
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/evaluations/${sessionId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SUBMITTED' }),
      });
      if (res.ok) {
        setSubmitted(true);
        router.push('/evaluations');
      } else {
        setError('ส่งแบบประเมินไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการส่งแบบประเมิน');
    } finally {
      setSubmitting(false);
    }
  };

  // Derived counts
  const totalIndicators = indicators.length;
  const answeredBoth = indicators.filter((ind) => {
    const r = responses[ind.id];
    return r && r.score !== null && r.score2 !== null;
  }).length;
  const progressPct = totalIndicators > 0 ? Math.round((answeredBoth / totalIndicators) * 100) : 0;

  const visibleSections = activeTab === 'all'
    ? sections
    : sections.filter((s) => s.id === activeTab);

  const indicatorsBySection = (sectionId: number) =>
    indicators.filter((ind) => ind.sectionId === sectionId);

  const answeredInSection = (sectionId: number) =>
    indicatorsBySection(sectionId).filter((ind) => {
      const r = responses[ind.id];
      return r && r.score !== null && r.score2 !== null;
    }).length;

  // Colors
  const bg = darkMode ? '#1a1a2e' : '#f3f4f6';
  const cardBg = darkMode ? '#16213e' : '#ffffff';
  const textColor = darkMode ? '#e2e8f0' : '#1f2937';
  const subText = darkMode ? '#94a3b8' : '#6b7280';
  const borderColor = darkMode ? '#2d3748' : '#e5e7eb';
  const headerBg = darkMode ? '#0f3460' : '#ffffff';
  const purpleLight = darkMode ? 'rgba(139,92,246,0.15)' : '#f5f3ff';
  const blueLight = darkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <p style={{ color: subText, fontSize: '1.1rem' }}>กำลังโหลดแบบประเมิน...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
          <Link href="/evaluations" style={{ color: '#7c3aed', textDecoration: 'none' }}>← กลับไปรายการ</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'inherit' }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: headerBg,
        borderBottom: `1px solid ${borderColor}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: '0.75rem 1.5rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', minWidth: 0, flex: 1 }}>
              <Link
                href="/evaluations"
                style={{ color: '#7c3aed', textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '0.875rem' }}
              >
                ← กลับไปรายการแบบประเมิน
              </Link>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: textColor, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session?.school?.nameTh || session?.school?.name || 'โรงเรียน'}
                </h1>
                <p style={{ fontSize: '0.8rem', color: subText, margin: 0 }}>
                  ปีการศึกษา {session?.academicYear?.year}
                  {session?.term ? ` - ภาคเรียนที่ ${session.term.name}` : ''}
                </p>
              </div>
              {session?.evaluator?.name && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: '#ede9fe', color: '#7c3aed',
                  padding: '0.25rem 0.75rem', borderRadius: '999px',
                  fontSize: '0.8rem', whiteSpace: 'nowrap',
                }}>
                  👤 {session.evaluator.name}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  background: darkMode ? '#4c1d95' : '#e5e7eb',
                  border: 'none', borderRadius: '999px',
                  padding: '0.35rem 0.75rem', cursor: 'pointer',
                  fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
                }}
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || submitted}
                style={{
                  background: submitted ? '#10b981' : submitting ? '#9ca3af' : '#10b981',
                  color: 'white', border: 'none', borderRadius: '0.5rem',
                  padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: '600',
                  cursor: submitting || submitted ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {submitted ? '✓ ส่งแล้ว' : submitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.8rem', color: subText }}>
                ความคืบหน้า: <strong style={{ color: textColor }}>{answeredBoth} / {totalIndicators} ข้อ</strong>
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: progressPct >= 100 ? '#10b981' : '#7c3aed' }}>
                {progressPct}%
              </span>
            </div>
            <div style={{ height: '6px', background: darkMode ? '#2d3748' : '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPct}%`,
                background: progressPct >= 100 ? '#10b981' : '#7c3aed',
                borderRadius: '3px', transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {/* School-wide aggregate (real-time, polls every 5s) */}
          {schoolAggregate && (
            <div style={{
              marginTop: '0.6rem',
              paddingTop: '0.55rem',
              borderTop: `1px dashed ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 6px #ef4444',
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite',
                }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: textColor }}>
                  ภาพรวมทั้งโรงเรียน
                </span>
                <span style={{ fontSize: '0.75rem', color: subText }}>
                  · ครู {schoolAggregate.totalSessions} คน · ส่งแล้ว {schoolAggregate.completionRate}% · ดัชนีคุณภาพ {schoolAggregate.overallQualityIndex}%
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.5rem',
                flex: 1,
                minWidth: '300px',
              }}>
                {schoolAggregate.dimensionScores.map((d) => {
                  const color = d.status === 'green' ? '#10b981' : d.status === 'yellow' ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={d.dimension}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: subText, marginBottom: '0.15rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.labelTh}
                        </span>
                        <span style={{ fontWeight: 600, color }}>{d.percent}%</span>
                      </div>
                      <div style={{
                        height: '4px',
                        background: darkMode ? '#2d3748' : '#e5e7eb',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.min(d.percent, 100)}%`,
                          height: '100%',
                          background: color,
                          transition: 'width 0.4s',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: cardBg, borderBottom: `1px solid ${borderColor}`,
        overflowX: 'auto',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '0', padding: '0 1.5rem' }}>
          {/* All tab */}
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none', borderBottom: activeTab === 'all' ? '3px solid #7c3aed' : '3px solid transparent',
              background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              color: activeTab === 'all' ? '#7c3aed' : subText,
              fontWeight: activeTab === 'all' ? '600' : '400',
              fontSize: '0.875rem',
            }}
          >
            ทั้งหมด ({totalIndicators})
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveTab(sec.id)}
              style={{
                padding: '0.75rem 1rem',
                border: 'none', borderBottom: activeTab === sec.id ? '3px solid #7c3aed' : '3px solid transparent',
                background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                color: activeTab === sec.id ? '#7c3aed' : subText,
                fontWeight: activeTab === sec.id ? '600' : '400',
                fontSize: '0.875rem',
              }}
            >
              {sec.nameTh} ({sec.indicatorsCount})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem' }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {visibleSections.map((sec) => {
          const secIndicators = indicatorsBySection(sec.id);
          const secAnswered = answeredInSection(sec.id);
          return (
            <div key={sec.id} style={{
              background: cardBg, borderRadius: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              marginBottom: '1.5rem', overflow: 'hidden',
              border: `1px solid ${borderColor}`,
            }}>
              {/* Section header */}
              <div style={{
                padding: '0.875rem 1.25rem',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: darkMode ? 'rgba(124,58,237,0.1)' : '#faf5ff',
              }}>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#7c3aed' }}>
                  ตัวชี้วัดด้าน {sec.nameTh} <span style={{ color: '#ef4444' }}>*</span>
                </h2>
                <span style={{
                  background: secAnswered === secIndicators.length && secIndicators.length > 0 ? '#d1fae5' : '#ede9fe',
                  color: secAnswered === secIndicators.length && secIndicators.length > 0 ? '#065f46' : '#7c3aed',
                  padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600',
                }}>
                  ตอบแล้ว {secAnswered}/{secIndicators.length}
                </span>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f9fafb' }}>
                      <th style={{
                        textAlign: 'left', padding: '0.75rem 1rem',
                        color: subText, fontWeight: '600', borderBottom: `1px solid ${borderColor}`,
                        minWidth: '280px',
                      }}>
                        ตัวชี้วัด
                      </th>
                      {/* สภาพที่เป็นอยู่ header */}
                      <th colSpan={5} style={{
                        textAlign: 'center', padding: '0.75rem 0.5rem',
                        color: '#7c3aed', fontWeight: '600', borderBottom: `1px solid ${borderColor}`,
                        background: purpleLight,
                      }}>
                        ประเมินสภาพที่เป็นอยู่
                      </th>
                      {/* สภาพที่พึงประสงค์ header */}
                      <th colSpan={5} style={{
                        textAlign: 'center', padding: '0.75rem 0.5rem',
                        color: '#2563eb', fontWeight: '600', borderBottom: `1px solid ${borderColor}`,
                        background: blueLight,
                      }}>
                        ประเมินสภาพที่พึงประสงค์
                      </th>
                    </tr>
                    <tr style={{ background: darkMode ? 'rgba(0,0,0,0.1)' : '#fafafa' }}>
                      <th style={{ borderBottom: `1px solid ${borderColor}` }} />
                      {[1, 2, 3, 4, 5].map((v) => (
                        <th key={v} style={{
                          textAlign: 'center', padding: '0.4rem 0.5rem', width: '44px',
                          color: '#7c3aed', fontWeight: '600', fontSize: '0.8rem',
                          borderBottom: `1px solid ${borderColor}`,
                          background: purpleLight,
                        }}>{v}</th>
                      ))}
                      {[1, 2, 3, 4, 5].map((v) => (
                        <th key={v} style={{
                          textAlign: 'center', padding: '0.4rem 0.5rem', width: '44px',
                          color: '#2563eb', fontWeight: '600', fontSize: '0.8rem',
                          borderBottom: `1px solid ${borderColor}`,
                          background: blueLight,
                        }}>{v}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {secIndicators.map((ind, idx) => {
                      const resp = responses[ind.id] || { score: null, score2: null };
                      const bothAnswered = resp.score !== null && resp.score2 !== null;
                      const rowBg = idx % 2 === 0
                        ? (darkMode ? 'transparent' : 'white')
                        : (darkMode ? 'rgba(255,255,255,0.02)' : '#fafafa');
                      return (
                        <tr key={ind.id} style={{ background: rowBg }}>
                          {/* Indicator text */}
                          <td style={{
                            padding: '0.75rem 1rem', color: textColor,
                            borderBottom: `1px solid ${borderColor}`,
                            lineHeight: '1.5',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                              {bothAnswered
                                ? <span style={{ color: '#10b981', flexShrink: 0, marginTop: '1px' }}>✓</span>
                                : <span style={{ color: borderColor, flexShrink: 0, marginTop: '1px' }}>○</span>
                              }
                              <span>{ind.textTh}</span>
                            </div>
                          </td>

                          {/* สภาพที่เป็นอยู่ — score2 — purple */}
                          {[1, 2, 3, 4, 5].map((v) => (
                            <td key={v} style={{
                              textAlign: 'center', padding: '0.75rem 0',
                              borderBottom: `1px solid ${borderColor}`,
                              background: resp.score2 === v ? purpleLight : undefined,
                            }}>
                              <input
                                type="radio"
                                name={`ind-${ind.id}-score2`}
                                value={v}
                                checked={resp.score2 === v}
                                disabled={submitted || saving === ind.id}
                                onChange={() => saveResponse(ind.id, 'score2', v)}
                                style={{
                                  accentColor: '#7c3aed',
                                  width: '18px', height: '18px', cursor: submitted ? 'not-allowed' : 'pointer',
                                }}
                              />
                            </td>
                          ))}

                          {/* สภาพที่พึงประสงค์ — score — blue */}
                          {[1, 2, 3, 4, 5].map((v) => (
                            <td key={v} style={{
                              textAlign: 'center', padding: '0.75rem 0',
                              borderBottom: `1px solid ${borderColor}`,
                              background: resp.score === v ? blueLight : undefined,
                            }}>
                              <input
                                type="radio"
                                name={`ind-${ind.id}-score`}
                                value={v}
                                checked={resp.score === v}
                                disabled={submitted || saving === ind.id}
                                onChange={() => saveResponse(ind.id, 'score', v)}
                                style={{
                                  accentColor: '#2563eb',
                                  width: '18px', height: '18px', cursor: submitted ? 'not-allowed' : 'pointer',
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div style={{
          background: cardBg, borderRadius: '0.75rem', padding: '1rem 1.5rem',
          border: `1px solid ${borderColor}`, marginBottom: '5rem',
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem 2rem', alignItems: 'center',
        }}>
          {[1, 2, 3, 4, 5].map((v) => (
            <span key={v} style={{ color: textColor, fontSize: '0.875rem' }}>
              <strong>{v}</strong> = {SCALE_LABELS[v]}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: '#7c3aed' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
            สภาพที่เป็นอยู่
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: '#2563eb' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
            สภาพที่พึงประสงค์
          </span>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: cardBg, borderTop: `1px solid ${borderColor}`,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
        padding: '0.875rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '1200px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ color: textColor, fontWeight: '600' }}>
              ตอบแล้ว {answeredBoth} / {totalIndicators} ข้อ
            </span>
            {totalIndicators - answeredBoth > 0 && (
              <span style={{ color: subText, fontSize: '0.875rem', marginLeft: '0.5rem' }}>
                (เหลืออีก {totalIndicators - answeredBoth} ข้อ)
              </span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || submitted}
            style={{
              background: submitted ? '#10b981' : submitting ? '#9ca3af' : '#10b981',
              color: 'white', border: 'none', borderRadius: '0.5rem',
              padding: '0.625rem 1.5rem', fontSize: '0.95rem', fontWeight: '600',
              cursor: submitting || submitted ? 'not-allowed' : 'pointer',
            }}
          >
            {submitted ? '✓ ส่งแล้ว' : submitting ? 'กำลังส่ง...' : 'ส่งแบบประเมิน'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// app/dashboard/thai-p13/ThaiP13DashboardView.tsx
// Self-contained THAI_P1_3 drill-down dashboard (ภาพรวม → โรงเรียน → ครู).
// Reused by /dashboard/thai-p13 (standalone page) and the THAI tab on
// /live-dashboard. Reads its own token + reference data; host provides chrome.

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer } from 'recharts';

interface Year { id: number; year: number }
interface Dim { sectionId?: number; sectionName: string; selfAvg: number | null; directorAvg: number | null; targetAvg: number | null; gap?: number | null; status: string; responseCount?: number }
interface SchoolRow { schoolId: number; name: string; code: string | null; teacherCount: number; completionRate: number; selfAvg: number | null; targetAvg: number | null; status: string }
interface TeacherRow { teacherId: number; name: string; selfAvg: number | null; directorAvg: number | null; targetAvg: number | null; status: string; submitted: boolean }
interface IndRow { itemCode: string | null; textTh: string; sectionName: string; self: number | null; director: number | null; target: number | null }
interface RoundRow { round: number; selfAvg: number | null; targetAvg: number | null; hasData: boolean }
interface ReflRow { sectionName: string; round: number; recordedAt: string | null; text: string }

const C = { self: '#6366f1', director: '#f59e0b', target: '#10b981' };
const num = (v: number | null | undefined) => (v == null ? '—' : Number(v).toFixed(2));
const statusColor = (s: string) => (s === 'green' ? '#10b981' : s === 'yellow' ? '#f59e0b' : s === 'red' ? '#ef4444' : '#9ca3af');
const statusLabel = (s: string) => (s === 'green' ? 'ดี' : s === 'yellow' ? 'พอใช้' : s === 'red' ? 'ควรพัฒนา' : '—');

export default function ThaiP13DashboardView() {
  const [token, setToken] = useState<string | null>(null);
  const [years, setYears] = useState<Year[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');

  const [level, setLevel] = useState<'overview' | 'school' | 'teacher'>('overview');
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!stored) return;
    setToken(stored);
    (async () => {
      try {
        const res = await fetch('/api/academic-years', { headers: { Authorization: `Bearer ${stored}` } });
        const j = await res.json();
        const ys: Year[] = j.success ? j.data : Array.isArray(j) ? j : [];
        setYears(ys);
        if (ys.length) setAcademicYearId(String(ys[0].id));
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!token || !academicYearId) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ level, academicYearId });
      if (level === 'school' && schoolId) p.set('schoolId', String(schoolId));
      if (level === 'teacher' && teacherId) p.set('teacherId', String(teacherId));
      const res = await fetch(`/api/dashboard/thai-p13?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j.success) setData(j.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [token, academicYearId, level, schoolId, teacherId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const goOverview = () => { setLevel('overview'); setSchoolId(null); setTeacherId(null); };
  const goSchool = (id: number) => { setSchoolId(id); setLevel('school'); setTeacherId(null); };
  const goTeacher = (id: number) => { setTeacherId(id); setLevel('teacher'); };

  const card: React.CSSProperties = { background: 'white', padding: '1.25rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', marginBottom: '1.25rem' };
  const th: React.CSSProperties = { border: '1px solid #e5e7eb', padding: '0.5rem 0.6rem', background: '#f8fafc', fontSize: '0.82rem', textAlign: 'center', color: '#374151' };
  const td: React.CSSProperties = { border: '1px solid #e5e7eb', padding: '0.5rem 0.6rem', fontSize: '0.85rem', color: '#374151' };

  const Spider = ({ dims, showDirector }: { dims: Dim[]; showDirector: boolean }) => {
    const chartData = dims.map((d) => ({ group: d.sectionName, 'ครูประเมินตนเอง': d.selfAvg || 0, 'ผอ.ประเมิน': d.directorAvg || 0, 'ค่าเป้าหมาย': d.targetAvg || 0 }));
    return (
      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="group" tick={{ fill: '#374151', fontSize: 11, fontFamily: 'Kanit, sans-serif' }} />
          <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <Radar name="ครูประเมินตนเอง" dataKey="ครูประเมินตนเอง" stroke={C.self} fill={C.self} fillOpacity={0.25} strokeWidth={2} />
          {showDirector && <Radar name="ผอ.ประเมิน" dataKey="ผอ.ประเมิน" stroke={C.director} fill={C.director} fillOpacity={0.2} strokeWidth={2} />}
          <Radar name="ค่าเป้าหมาย" dataKey="ค่าเป้าหมาย" stroke={C.target} fill={C.target} fillOpacity={0.15} strokeWidth={2} />
          <Legend wrapperStyle={{ fontFamily: 'Kanit, sans-serif', fontSize: '0.82rem' }} iconType="line" />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const KpiCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div style={{ background: 'white', padding: '1.1rem 1.25rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', borderTop: `3px solid ${color || '#6366f1'}` }}>
      <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.35rem' }}>{label}</div>
      <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  );

  const DimensionTable = ({ dims, showDirector }: { dims: Dim[]; showDirector: boolean }) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ ...th, textAlign: 'left' }}>ด้าน</th><th style={th}>ครูประเมินตนเอง</th>{showDirector && <th style={th}>ผอ.ประเมิน</th>}<th style={th}>ค่าเป้าหมาย</th><th style={th}>ช่องว่าง</th><th style={th}>สถานะ</th></tr></thead>
        <tbody>
          {dims.map((d, i) => (
            <tr key={i}>
              <td style={td}>{d.sectionName}</td>
              <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: C.self }}>{num(d.selfAvg)}</td>
              {showDirector && <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: C.director }}>{num(d.directorAvg)}</td>}
              <td style={{ ...td, textAlign: 'center', color: C.target }}>{num(d.targetAvg)}</td>
              <td style={{ ...td, textAlign: 'center', color: (d.gap ?? 0) > 0 ? '#dc2626' : '#16a34a' }}>{d.gap == null ? '—' : (d.gap > 0 ? '+' : '') + d.gap.toFixed(2)}</td>
              <td style={{ ...td, textAlign: 'center' }}><span style={{ background: statusColor(d.status), color: 'white', borderRadius: '999px', padding: '0.1rem 0.6rem', fontSize: '0.75rem' }}>{statusLabel(d.status)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.2rem' }}>📊 แดชบอร์ดภาษาไทย ป.1–3</h2>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>สรุปผลแบบประเมินตนเองการจัดการเรียนการสอน — เจาะลึกจากภาพรวมสู่รายบุคคล</p>
        </div>
        <div>
          <label style={{ fontSize: '0.82rem', color: '#6b7280', marginRight: '0.5rem' }}>ปีการศึกษา</label>
          <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} style={{ padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
            {years.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
          </select>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={goOverview} style={{ background: 'none', border: 'none', color: level === 'overview' ? '#111827' : '#6366f1', cursor: 'pointer', fontWeight: level === 'overview' ? 700 : 500, padding: 0, fontSize: '0.9rem' }}>ภาพรวมทั้งหมด</button>
        {(level === 'school' || level === 'teacher') && data?.school && (
          <><span>›</span><button onClick={() => schoolId && goSchool(schoolId)} style={{ background: 'none', border: 'none', color: level === 'school' ? '#111827' : '#6366f1', cursor: 'pointer', fontWeight: level === 'school' ? 700 : 500, padding: 0, fontSize: '0.9rem' }}>{data.school?.name || (level === 'teacher' ? data?.teacher?.schoolName : '')}</button></>
        )}
        {level === 'teacher' && data?.teacher && (<><span>›</span><span style={{ color: '#111827', fontWeight: 700 }}>{data.teacher.name}</span></>)}
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: '#6b7280' }}>กำลังโหลดข้อมูล...</div>
      ) : !data ? (
        <div style={{ ...card, textAlign: 'center', color: '#6b7280' }}>ไม่มีข้อมูล</div>
      ) : (
        <>
          {/* OVERVIEW */}
          {level === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <KpiCard label="โรงเรียน" value={String(data.kpis.schoolCount)} color="#6366f1" />
                <KpiCard label="ครูที่ถูกประเมิน" value={String(data.kpis.teacherCount)} color="#0ea5e9" />
                <KpiCard label="ส่งแบบประเมินแล้ว" value={`${data.kpis.completionRate}%`} sub="ของครูทั้งหมด" color="#10b981" />
                <KpiCard label="คะแนนเฉลี่ย (ครูประเมินตนเอง)" value={num(data.kpis.overallSelf)} sub="มาตรา 1–4" color="#f59e0b" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem' }}>
                <div style={card}><h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>ภาพรวมรายด้าน (Spider)</h3><Spider dims={data.dimensions} showDirector /></div>
                <div style={card}><h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>คะแนนเฉลี่ยรายด้าน</h3><DimensionTable dims={data.dimensions} showDirector /></div>
              </div>
              <div style={card}>
                <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>เปรียบเทียบรายโรงเรียน <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 400 }}>(คลิกเพื่อเจาะลึก)</span></h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={{ ...th, textAlign: 'left' }}>โรงเรียน</th><th style={th}>ครู</th><th style={th}>ส่งแล้ว</th><th style={th}>ครูประเมินตนเอง</th><th style={th}>เป้าหมาย</th><th style={th}>สถานะ</th></tr></thead>
                    <tbody>
                      {data.schools.map((s: SchoolRow) => (
                        <tr key={s.schoolId} onClick={() => goSchool(s.schoolId)} style={{ cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                          <td style={{ ...td, color: '#4f46e5', fontWeight: 600 }}>{s.code ? `${s.code} ` : ''}{s.name} ›</td>
                          <td style={{ ...td, textAlign: 'center' }}>{s.teacherCount}</td>
                          <td style={{ ...td, textAlign: 'center' }}>{s.completionRate}%</td>
                          <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: C.self }}>{num(s.selfAvg)}</td>
                          <td style={{ ...td, textAlign: 'center', color: C.target }}>{num(s.targetAvg)}</td>
                          <td style={{ ...td, textAlign: 'center' }}><span style={{ background: statusColor(s.status), color: 'white', borderRadius: '999px', padding: '0.1rem 0.6rem', fontSize: '0.75rem' }}>{statusLabel(s.status)}</span></td>
                        </tr>
                      ))}
                      {data.schools.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#9ca3af' }} colSpan={6}>ยังไม่มีข้อมูลการประเมินในปีนี้</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* SCHOOL */}
          {level === 'school' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <KpiCard label="ครูที่ถูกประเมิน" value={String(data.kpis.teacherCount)} color="#0ea5e9" />
                <KpiCard label="ส่งแบบประเมินแล้ว" value={`${data.kpis.completionRate}%`} color="#10b981" />
                <KpiCard label="คะแนนเฉลี่ย (ครูประเมินตนเอง)" value={num(data.kpis.overallSelf)} sub="มาตรา 1–4" color="#f59e0b" />
                <KpiCard label="จำนวนคำตอบ" value={String(data.kpis.totalResponses)} color="#6366f1" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem' }}>
                <div style={card}><h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>ภาพรวมรายด้าน</h3><Spider dims={data.dimensions} showDirector /></div>
                <div style={card}><h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>คะแนนเฉลี่ยรายด้าน</h3><DimensionTable dims={data.dimensions} showDirector /></div>
              </div>
              <div style={card}>
                <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>รายชื่อครู <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 400 }}>(คลิกเพื่อดูรายบุคคล)</span></h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={{ ...th, textAlign: 'left' }}>ครู</th><th style={th}>สถานะส่ง</th><th style={th}>ครูประเมินตนเอง</th><th style={th}>ผอ.ประเมิน</th><th style={th}>เป้าหมาย</th><th style={th}>สถานะ</th></tr></thead>
                    <tbody>
                      {data.teachers.map((t: TeacherRow) => (
                        <tr key={t.teacherId} onClick={() => goTeacher(t.teacherId)} style={{ cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
                          <td style={{ ...td, color: '#4f46e5', fontWeight: 600 }}>{t.name} ›</td>
                          <td style={{ ...td, textAlign: 'center' }}>{t.submitted ? <span style={{ color: '#16a34a' }}>✓ ส่งแล้ว</span> : <span style={{ color: '#b45309' }}>ร่าง</span>}</td>
                          <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: C.self }}>{num(t.selfAvg)}</td>
                          <td style={{ ...td, textAlign: 'center', color: C.director }}>{num(t.directorAvg)}</td>
                          <td style={{ ...td, textAlign: 'center', color: C.target }}>{num(t.targetAvg)}</td>
                          <td style={{ ...td, textAlign: 'center' }}><span style={{ background: statusColor(t.status), color: 'white', borderRadius: '999px', padding: '0.1rem 0.6rem', fontSize: '0.75rem' }}>{statusLabel(t.status)}</span></td>
                        </tr>
                      ))}
                      {data.teachers.length === 0 && <tr><td style={{ ...td, textAlign: 'center', color: '#9ca3af' }} colSpan={6}>ยังไม่มีครูที่ถูกประเมินในโรงเรียนนี้</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TEACHER */}
          {level === 'teacher' && data.teacher && (
            <>
              <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>{data.teacher.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{data.teacher.schoolName} · ปีการศึกษา {data.yearLabel}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>คะแนนเฉลี่ย (ครู): <strong style={{ color: C.self, fontSize: '1.1rem' }}>{num(data.kpis.overallSelf)}</strong> / 4</span>
                  <Link href="/admin/thai-summary" style={{ fontSize: '0.82rem', color: '#4f46e5', textDecoration: 'none', alignSelf: 'center' }}>🤖 สรุป/นิเทศด้วย AI →</Link>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem' }}>
                <div style={card}><h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>ครู vs ผอ. vs เป้าหมาย</h3><Spider dims={data.dimensions} showDirector /></div>
                <div style={card}><h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>คะแนนรายด้าน + ช่องว่างถึงเป้าหมาย</h3><DimensionTable dims={data.dimensions} showDirector /></div>
              </div>
              <div style={card}>
                <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>เปรียบเทียบการประเมิน 2 ครั้ง (ความก้าวหน้า)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {(data.rounds as RoundRow[]).map((r) => (
                    <div key={r.round} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.9rem', background: r.hasData ? '#fff' : '#f9fafb' }}>
                      <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>ครั้งที่ {r.round} {r.round === 1 ? '(ต้นปี)' : '(ปลายปี)'}</div>
                      {r.hasData ? (
                        <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                          <div>ครูประเมินตนเอง: <strong style={{ color: C.self }}>{num(r.selfAvg)}</strong></div>
                          <div>ค่าเป้าหมาย: <strong style={{ color: C.target }}>{num(r.targetAvg)}</strong></div>
                        </div>
                      ) : <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>ยังไม่มีข้อมูล</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div style={card}>
                <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>รายละเอียดรายตัวชี้วัด ({data.indicators.length} ข้อ)</h3>
                <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0 }}><tr><th style={{ ...th, textAlign: 'left' }}>ตัวชี้วัด</th><th style={th}>ครู</th><th style={th}>ผอ.</th><th style={th}>เป้าหมาย</th></tr></thead>
                    <tbody>
                      {(data.indicators as IndRow[]).map((ind, i) => (
                        <tr key={i}>
                          <td style={td}>{ind.itemCode && <strong style={{ color: '#1e40af', marginRight: '0.35rem' }}>{ind.itemCode}</strong>}{ind.textTh}</td>
                          <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: C.self }}>{num(ind.self)}</td>
                          <td style={{ ...td, textAlign: 'center', color: C.director }}>{num(ind.director)}</td>
                          <td style={{ ...td, textAlign: 'center', color: C.target }}>{num(ind.target)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {(data.reflections as ReflRow[]).length > 0 && (
                <div style={card}>
                  <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#374151' }}>การสะท้อนคิดของครู</h3>
                  {(data.reflections as ReflRow[]).map((rf, i) => (
                    <div key={i} style={{ borderLeft: `3px solid ${rf.round === 1 ? '#3b82f6' : '#a855f7'}`, padding: '0.4rem 0 0.4rem 0.8rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: rf.round === 1 ? '#1d4ed8' : '#7c3aed' }}>{rf.sectionName} · ครั้งที่ {rf.round} {rf.recordedAt ? `· ${new Date(rf.recordedAt).toLocaleDateString('th-TH')}` : ''}</div>
                      <div style={{ fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.65, marginTop: '0.2rem' }}>{rf.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

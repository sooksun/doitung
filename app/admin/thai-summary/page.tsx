// app/admin/thai-summary/page.tsx
// Admin: generate the THAI_P1_3 end-of-year AI summary at three scopes
// (รายบุคคล / รายโรงเรียน / ภาพรวมโครงการ), view the result, and export to
// Excel / Word (direct download) or PDF (print page → Save as PDF).

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

type Scope = 'individual' | 'school' | 'project';
interface Year { id: number; year: number }
interface School { id: number; code: string | null; nameTh: string | null }
interface Teacher { teacherId: number; userId: number | null; name: string }
interface Dim { sectionName: string; selfAvg: number | null; directorAvg: number | null; targetAvg: number | null; responseCount: number }
interface SummaryRow {
  id: number; status: string; error: string | null;
  result: {
    scope: string; subjectLabel: string; academicYearLabel: string; teacherCount: number; schoolCount?: number;
    scoreboard: Dim[];
    ai: { executiveSummary: string; strengths: string[]; improvements: string[]; reflectionInsights: string[]; recommendations: string[] };
    generatedAt: string;
  } | null;
}

const num = (v: number | null) => (v == null ? '—' : v.toFixed(2));
const SCOPE_TABS: { key: Scope; label: string }[] = [
  { key: 'individual', label: 'รายบุคคล' },
  { key: 'school', label: 'รายโรงเรียน' },
  { key: 'project', label: 'ภาพรวมโครงการ' },
];

export default function ThaiSummaryPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [scope, setScope] = useState<Scope>('individual');
  const [years, setYears] = useState<Year[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Auth + reference data
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    const auth = { headers: { Authorization: `Bearer ${stored}` } };
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', auth);
        if (meRes.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
        const me = (await meRes.json())?.data;
        if (!me || !Array.isArray(me.roles) || !me.roles.includes('ADMIN')) { router.replace('/dashboard'); return; }
        const [yRes, sRes] = await Promise.all([fetch('/api/academic-years', auth), fetch('/api/schools?isActive=true', auth)]);
        const yJson = await yRes.json(); const sJson = await sRes.json();
        const ys: Year[] = yJson.success ? yJson.data : Array.isArray(yJson) ? yJson : [];
        setYears(ys);
        if (ys.length) setAcademicYearId(String(ys[0].id));
        setSchools(sJson.success ? sJson.data : Array.isArray(sJson) ? sJson : []);
        setReady(true);
      } catch { toastError('โหลดข้อมูลตั้งต้นไม่สำเร็จ'); }
    })();
  }, [router]);

  // Teachers for the selected school (individual scope)
  useEffect(() => {
    if (scope !== 'individual' || !schoolId || !token) { setTeachers([]); setTeacherId(''); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/schools/${schoolId}/teachers`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!cancelled && j.success) { setTeachers(j.data.teachers || []); setTeacherId(''); }
      } catch { /* empty picker */ }
    })();
    return () => { cancelled = true; };
  }, [scope, schoolId, token]);

  const scopeId = scope === 'project' ? 0 : scope === 'school' ? Number(schoolId) : Number(teacherId);
  const canRun = !!academicYearId && (scope === 'project' || (scope === 'school' && !!schoolId) || (scope === 'individual' && !!teacherId));

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams({ scope, academicYearId });
    if (scope !== 'project') p.set('scopeId', String(scopeId));
    return p.toString();
  }, [scope, academicYearId, scopeId]);

  // Load existing summary when the selection becomes valid
  useEffect(() => {
    if (!ready || !token || !canRun) { setSummary(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/thai-p13-summary?${buildQuery()}`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!cancelled && j.success) setSummary(j.data || null);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [ready, token, canRun, buildQuery]);

  const pollUntilDone = useCallback(async (id: number) => {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/admin/thai-p13-summary/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (j.success && j.data) {
          setSummary(j.data);
          if (j.data.status !== 'RUNNING') {
            if (j.data.status === 'DONE') toastSuccess('สร้างบทสรุปเสร็จแล้ว');
            else toastError(j.data.error || 'สร้างบทสรุปไม่สำเร็จ');
            return;
          }
        }
      } catch { /* keep polling */ }
    }
    toastError('หมดเวลารอผล — ลองโหลดหน้าใหม่อีกครั้ง');
  }, [token]);

  const generate = async () => {
    if (!token || !canRun || generating) return;
    setGenerating(true);
    setSummary((p) => (p ? { ...p, status: 'RUNNING' } : null));
    try {
      const body: any = { scope, academicYearId: Number(academicYearId) };
      if (scope !== 'project') body.scopeId = scopeId;
      const res = await fetch('/api/admin/thai-p13-summary', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok || !j.success) { toastError(j.error || 'เริ่มสร้างไม่สำเร็จ'); setGenerating(false); return; }
      await pollUntilDone(j.data.id);
    } catch { toastError('เกิดข้อผิดพลาด'); }
    finally { setGenerating(false); }
  };

  const download = async (format: 'xlsx' | 'docx') => {
    if (!token || !summary?.id) return;
    setDownloading(format);
    try {
      const res = await fetch(`/api/admin/thai-p13-summary/${summary.id}/export?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const j = await res.json().catch(() => null); toastError(j?.error || 'ดาวน์โหลดไม่สำเร็จ'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thai-p13-summary-${scope}-${summary.id}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toastError('เกิดข้อผิดพลาดในการดาวน์โหลด'); }
    finally { setDownloading(null); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.95rem', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#374151', fontSize: '0.88rem' };
  const card: React.CSSProperties = { background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', marginBottom: '1.25rem' };

  if (!ready) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลด...</div>;

  const result = summary?.result;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <Link href="/dashboard" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: '0.9rem' }}>← กลับแดชบอร์ด</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827', margin: '0.5rem 0 0.25rem' }}>🤖 สรุปผลภาษาไทย ป.1–3 ด้วย AI</h1>
        <p style={{ color: '#6b7280', margin: '0 0 1.25rem' }}>สรุปผลปลายปี รายบุคคล / รายโรงเรียน / ภาพรวมโครงการ — ส่งออก Excel · Word · PDF</p>

        {/* Scope tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {SCOPE_TABS.map((t) => (
            <button key={t.key} onClick={() => setScope(t.key)} style={{
              padding: '0.55rem 1.25rem', borderRadius: '999px', border: '1px solid', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              borderColor: scope === t.key ? '#4f46e5' : '#d1d5db', background: scope === t.key ? '#4f46e5' : 'white', color: scope === t.key ? 'white' : '#374151',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Pickers */}
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>ปีการศึกษา *</label>
              <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} style={inputStyle}>
                <option value="">เลือกปีการศึกษา</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
              </select>
            </div>
            {scope !== 'project' && (
              <div>
                <label style={labelStyle}>โรงเรียน *</label>
                <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} style={inputStyle}>
                  <option value="">เลือกโรงเรียน</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} ` : ''}{s.nameTh || s.code}</option>)}
                </select>
              </div>
            )}
            {scope === 'individual' && (
              <div>
                <label style={labelStyle}>ครู *</label>
                <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} disabled={!schoolId || teachers.length === 0} style={inputStyle}>
                  <option value="">{!schoolId ? 'เลือกโรงเรียนก่อน' : teachers.length === 0 ? 'ไม่พบครู' : 'เลือกครู'}</option>
                  {teachers.map((t) => <option key={t.teacherId} value={t.teacherId}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <button onClick={generate} disabled={!canRun || generating} style={{
            padding: '0.65rem 1.5rem', background: !canRun || generating ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem',
            fontSize: '0.95rem', fontWeight: 700, cursor: !canRun || generating ? 'not-allowed' : 'pointer',
          }}>
            {generating || summary?.status === 'RUNNING' ? '⏳ กำลังสร้างด้วย AI...' : summary?.status === 'DONE' ? '🔄 สร้างใหม่อีกครั้ง' : '🚀 สร้างบทสรุปด้วย AI'}
          </button>
          {scope === 'project' && <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', color: '#6b7280' }}>รวมข้อมูลทุกโรงเรียนในปีการศึกษาที่เลือก</p>}
        </div>

        {/* Status */}
        {summary?.status === 'RUNNING' && (
          <div style={{ ...card, background: '#eef2ff', color: '#3730a3' }}>⏳ AI กำลังประมวลผล — โดยปกติใช้เวลาประมาณ 30 วินาที กรุณารอสักครู่...</div>
        )}
        {summary?.status === 'FAILED' && (
          <div style={{ ...card, background: '#fef2f2', color: '#991b1b' }}>❌ {summary.error || 'สร้างบทสรุปไม่สำเร็จ'}</div>
        )}

        {/* Result */}
        {summary?.status === 'DONE' && result && (
          <>
            {/* Export bar */}
            <div style={{ ...card, display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>ส่งออก:</span>
              <button onClick={() => download('xlsx')} disabled={downloading === 'xlsx'} style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '0.45rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                {downloading === 'xlsx' ? '...' : '📊 Excel'}
              </button>
              <button onClick={() => download('docx')} disabled={downloading === 'docx'} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.45rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                {downloading === 'docx' ? '...' : '📝 Word'}
              </button>
              <a href={`/admin/thai-summary/${summary.id}/print`} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', borderRadius: '0.45rem', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>
                🖨️ PDF (พิมพ์)
              </a>
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#9ca3af' }}>{result.generatedAt ? new Date(result.generatedAt).toLocaleString('th-TH') : ''}</span>
            </div>

            <div style={card}>
              <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>{result.subjectLabel}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>ปีการศึกษา {result.academicYearLabel} · ครู {result.teacherCount} คน{result.schoolCount != null ? ` · ${result.schoolCount} โรงเรียน` : ''}</div>
              </div>

              <Section title="บทสรุปผู้บริหาร"><p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0, color: '#374151' }}>{result.ai.executiveSummary}</p></Section>
              <Section title="จุดแข็ง"><Bullets items={result.ai.strengths} color="#166534" /></Section>
              <Section title="จุดที่ควรพัฒนา"><Bullets items={result.ai.improvements} color="#b45309" /></Section>
              {result.ai.reflectionInsights.length > 0 && <Section title="ประเด็นจากการสะท้อนคิด"><Bullets items={result.ai.reflectionInsights} color="#6d28d9" /></Section>}
              <Section title="ข้อเสนอแนะ"><Bullets items={result.ai.recommendations} color="#1d4ed8" /></Section>

              <Section title="คะแนนเฉลี่ยรายด้าน (มาตรา 1–4)">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#ecfdf5' }}>
                        {['ด้าน', 'ครูประเมินตนเอง', 'ผอ.ประเมิน', 'ค่าเป้าหมาย', 'จำนวนคำตอบ'].map((h) => (
                          <th key={h} style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: h === 'ด้าน' ? 'left' : 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.scoreboard.map((d, i) => (
                        <tr key={i}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem' }}>{d.sectionName}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{num(d.selfAvg)}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{num(d.directorAvg)}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{num(d.targetAvg)}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center' }}>{d.responseCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          </>
        )}

        {!summary && canRun && (
          <div style={{ ...card, color: '#6b7280', textAlign: 'center' }}>ยังไม่มีบทสรุปสำหรับช่วงที่เลือก — กด &quot;สร้างบทสรุปด้วย AI&quot;</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#166534', borderBottom: '2px solid #bbf7d0', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>{title}</h3>
      {children}
    </div>
  );
}

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '0.5rem', lineHeight: 1.7, listStyle: 'none' }}>
      {items.map((t, i) => <li key={i} style={{ marginBottom: '0.3rem', color: '#374151', display: 'flex', gap: '0.5rem' }}><span style={{ color, flexShrink: 0 }}>•</span><span>{t}</span></li>)}
    </ul>
  );
}

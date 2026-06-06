// app/admin/thai-summary/page.tsx
// Admin: generate THAI_P1_3 AI summaries. Two families:
//   leadership — รายบุคคล / รายโรงเรียน / ภาพรวมโครงการ
//   supervision — ทีมหนุนเสริม ครั้งที่ 1 / 2 (per teacher, per round; HARD-gated:
//     the school must finish + submit that round before a brief can be generated)
// View result + export Excel / Word (download) or PDF (print page → Save as PDF).

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';
import { summarySections } from '@/lib/thai-summary-sections';

interface Year { id: number; year: number }
interface School { id: number; code: string | null; nameTh: string | null }
interface Teacher { teacherId: number; userId: number | null; name: string }
interface Dim { sectionName: string; selfAvg: number | null; directorAvg: number | null; targetAvg: number | null; responseCount: number }
interface SummaryRow { id: number; status: string; error: string | null; result: any | null }
interface RoundStatus { ok: boolean; message: string; termLabel: string; selfDone: boolean; directorDone: boolean }

const num = (v: number | null) => (v == null ? '—' : v.toFixed(2));
const SCOPE_TABS = [
  { key: 'individual', label: 'รายบุคคล' },
  { key: 'school', label: 'รายโรงเรียน' },
  { key: 'project', label: 'ภาพรวมโครงการ' },
  { key: 'supervision-t1', label: 'ทีมหนุนเสริม · นิเทศครั้งที่ 1' },
  { key: 'supervision-t2', label: 'ทีมหนุนเสริม · นิเทศครั้งที่ 2' },
];

export default function ThaiSummaryPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [scope, setScope] = useState('individual');
  const [years, setYears] = useState<Year[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [roundStatus, setRoundStatus] = useState<RoundStatus | null>(null);
  const [checkingRound, setCheckingRound] = useState(false);

  // Access: ADMIN sees everything; SCHOOL_LEADER is locked to their own school
  // (no project scope). Anyone else is denied with a clear message (no silent bounce).
  const [isAdmin, setIsAdmin] = useState(false);
  const [mySchool, setMySchool] = useState<{ id: number; nameTh: string } | null>(null);
  const [denied, setDenied] = useState(false);

  const isSupervision = scope.startsWith('supervision');
  const round = scope === 'supervision-t2' ? 2 : 1;
  const needsSchool = scope !== 'project';
  const needsTeacher = scope === 'individual' || isSupervision;

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
        const roles: string[] = Array.isArray(me?.roles) ? me.roles : [];
        const admin = roles.includes('ADMIN');
        const leader = roles.includes('SCHOOL_LEADER');
        if (!me || (!admin && !leader)) { setDenied(true); setReady(true); return; }
        setIsAdmin(admin);
        if (!admin) {
          // SCHOOL_LEADER → locked to their bound school
          if (!me.school?.id) { setDenied(true); setReady(true); return; }
          setMySchool({ id: me.school.id, nameTh: me.school.nameTh || me.school.code || `โรงเรียน #${me.school.id}` });
          setSchoolId(String(me.school.id));
          setScope('individual'); // leaders can't use the project scope
        }
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

  // Teachers for the selected school (individual + supervision scopes)
  useEffect(() => {
    if (!needsTeacher || !schoolId || !token) { setTeachers([]); setTeacherId(''); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/schools/${schoolId}/teachers`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!cancelled && j.success) { setTeachers(j.data.teachers || []); setTeacherId(''); }
      } catch { /* empty picker */ }
    })();
    return () => { cancelled = true; };
  }, [needsTeacher, schoolId, token]);

  const scopeId = scope === 'project' ? 0 : needsTeacher ? Number(teacherId) : Number(schoolId);
  const selectionReady = !!academicYearId && (scope === 'project' || (needsTeacher ? !!teacherId : !!schoolId));

  // Supervision gate: check whether the round is complete (UI feedback before generate)
  useEffect(() => {
    if (!isSupervision || !teacherId || !academicYearId || !token) { setRoundStatus(null); return; }
    let cancelled = false;
    setCheckingRound(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/thai-p13-summary/round-status?teacherId=${teacherId}&academicYearId=${academicYearId}&round=${round}`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!cancelled && j.success) setRoundStatus(j.data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setCheckingRound(false); }
    })();
    return () => { cancelled = true; };
  }, [isSupervision, teacherId, academicYearId, round, token]);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams({ scope, academicYearId });
    if (scope !== 'project') p.set('scopeId', String(scopeId));
    return p.toString();
  }, [scope, academicYearId, scopeId]);

  useEffect(() => {
    if (!ready || !token || !selectionReady) { setSummary(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/thai-p13-summary?${buildQuery()}`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!cancelled && j.success) setSummary(j.data || null);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [ready, token, selectionReady, buildQuery]);

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

  const canRun = selectionReady && (!isSupervision || roundStatus?.ok === true);

  const generate = async () => {
    if (!token || !canRun || generating) return;
    setGenerating(true);
    setSummary((p) => (p ? { ...p, status: 'RUNNING' } : null));
    try {
      const body: any = { scope, academicYearId: Number(academicYearId) };
      if (scope !== 'project') body.scopeId = scopeId;
      const res = await fetch('/api/admin/thai-p13-summary', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
      a.href = url; a.download = `thai-p13-${scope}-${summary.id}.${format}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toastError('เกิดข้อผิดพลาดในการดาวน์โหลด'); }
    finally { setDownloading(null); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--de-border-strong)', borderRadius: '0.5rem', fontSize: '0.95rem', background: 'var(--de-bg-surface)', color: 'var(--de-text-primary)', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: 'var(--de-text-primary)', fontSize: '0.88rem' };
  const card: React.CSSProperties = { background: 'var(--de-bg-surface)', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', marginBottom: '1.25rem' };

  if (!ready) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลด...</div>;

  if (denied) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--de-bg-canvas)', padding: '2rem' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <Link href="/dashboard" style={{ color: 'var(--de-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← กลับแดชบอร์ด</Link>
          <div style={{ ...card, marginTop: '1rem', textAlign: 'center', color: 'var(--de-danger)', background: 'var(--de-danger-soft)', border: '1px solid var(--de-danger-soft)' }}>
            🔒 หน้านี้สำหรับ <strong>ผู้ดูแลระบบ (ADMIN)</strong> และ <strong>ผู้อำนวยการ (ผอ.)</strong> ที่ผูกกับโรงเรียนเท่านั้น
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--de-danger)' }}>หากท่านเป็น ผอ. แต่เข้าไม่ได้ โปรดตรวจสอบว่าบัญชีของท่านผูกกับโรงเรียนแล้ว</div>
          </div>
        </div>
      </div>
    );
  }

  const result = summary?.result;
  const visibleTabs = isAdmin ? SCOPE_TABS : SCOPE_TABS.filter((t) => t.key !== 'project');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--de-bg-canvas)', padding: '2rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <Link href="/dashboard" style={{ color: 'var(--de-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>← กลับแดชบอร์ด</Link>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--de-text-primary)', margin: '0.5rem 0 0.25rem' }}>🤖 สรุปผลภาษาไทย ป.1–3 ด้วย AI</h1>
        <p style={{ color: 'var(--de-text-secondary)', margin: '0 0 1.25rem' }}>
          {isAdmin
            ? 'สรุปผู้บริหาร (รายบุคคล/โรงเรียน/โครงการ) และบทนิเทศสำหรับทีมหนุนเสริม — ส่งออก Excel · Word · PDF'
            : `โรงเรียน: ${mySchool?.nameTh || '—'} · สรุปรายบุคคล/โรงเรียน และบทนิเทศ — ส่งออก Excel · Word · PDF`}
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {visibleTabs.map((t) => (
            <button key={t.key} onClick={() => setScope(t.key)} style={{
              padding: '0.55rem 1.1rem', borderRadius: '999px', border: '1px solid', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
              borderColor: scope === t.key ? 'var(--de-primary)' : 'var(--de-border-strong)', background: scope === t.key ? 'var(--de-primary)' : 'var(--de-bg-surface)', color: scope === t.key ? 'var(--de-on-primary)' : 'var(--de-text-secondary)',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>ปีการศึกษา *</label>
              <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} style={inputStyle}>
                <option value="">เลือกปีการศึกษา</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
              </select>
            </div>
            {needsSchool && (
              <div>
                <label style={labelStyle}>โรงเรียน *</label>
                {isAdmin ? (
                  <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} style={inputStyle}>
                    <option value="">เลือกโรงเรียน</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} ` : ''}{s.nameTh || s.code}</option>)}
                  </select>
                ) : (
                  <div style={{ ...inputStyle, background: 'var(--de-primary-soft)', border: '1px solid var(--de-primary)', color: 'var(--de-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🔒 {mySchool?.nameTh || '—'}
                  </div>
                )}
              </div>
            )}
            {needsTeacher && (
              <div>
                <label style={labelStyle}>ครู *</label>
                <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} disabled={!schoolId || teachers.length === 0} style={inputStyle}>
                  <option value="">{!schoolId ? 'เลือกโรงเรียนก่อน' : teachers.length === 0 ? 'ไม่พบครู' : 'เลือกครู'}</option>
                  {teachers.map((t) => <option key={t.teacherId} value={t.teacherId}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Supervision gate banner */}
          {isSupervision && teacherId && (
            <div style={{
              margin: '0 0 1rem', padding: '0.7rem 1rem', borderRadius: '0.5rem', fontSize: '0.88rem',
              background: checkingRound ? 'var(--de-bg-subtle)' : roundStatus?.ok ? 'var(--de-success-soft)' : 'var(--de-danger-soft)',
              border: `1px solid ${roundStatus?.ok ? 'var(--de-success-soft)' : 'var(--de-danger-soft)'}`,
              color: roundStatus?.ok ? 'var(--de-success)' : 'var(--de-danger)',
            }}>
              {checkingRound ? 'กำลังตรวจสอบสถานะการประเมิน...' : roundStatus ? (roundStatus.ok ? `✓ ${roundStatus.message}` : `⚠️ ${roundStatus.message}`) : ''}
              {roundStatus && !roundStatus.ok && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.82rem' }}>
                  สถานะ: ครูประเมินตนเอง {roundStatus.selfDone ? '✓ เสร็จ' : '✗ ยังไม่เสร็จ'} · ผอ.ประเมิน {roundStatus.directorDone ? '✓ เสร็จ' : '✗ ยังไม่เสร็จ'}
                </div>
              )}
            </div>
          )}

          <button onClick={generate} disabled={!canRun || generating} style={{
            padding: '0.65rem 1.5rem', background: !canRun || generating ? 'var(--de-text-tertiary)' : 'var(--de-success)', color: 'white', border: 'none', borderRadius: '0.5rem',
            fontSize: '0.95rem', fontWeight: 700, cursor: !canRun || generating ? 'not-allowed' : 'pointer',
          }}>
            {generating || summary?.status === 'RUNNING' ? '⏳ กำลังสร้างด้วย AI...' : summary?.status === 'DONE' ? '🔄 สร้างใหม่อีกครั้ง' : isSupervision ? '🚀 สร้างบทนิเทศด้วย AI' : '🚀 สร้างบทสรุปด้วย AI'}
          </button>
          {scope === 'project' && <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', color: 'var(--de-text-secondary)' }}>รวมข้อมูลทุกโรงเรียนในปีการศึกษาที่เลือก</p>}
          {isSupervision && <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', color: 'var(--de-text-secondary)' }}>บทสรุปรายบุคคลสำหรับทีมหนุนเสริมก่อนเข้านิเทศ — ต้องประเมินครั้งที่ {round} เสร็จก่อนจึงสร้างได้</p>}
        </div>

        {summary?.status === 'RUNNING' && <div style={{ ...card, background: 'var(--de-primary-soft)', color: 'var(--de-primary)' }}>⏳ AI กำลังประมวลผล — ประมาณ 30 วินาที กรุณารอสักครู่...</div>}
        {summary?.status === 'FAILED' && <div style={{ ...card, background: 'var(--de-danger-soft)', color: 'var(--de-danger)' }}>❌ {summary.error || 'สร้างบทสรุปไม่สำเร็จ'}</div>}

        {summary?.status === 'DONE' && result && (
          <>
            <div style={{ ...card, display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--de-text-primary)' }}>ส่งออก:</span>
              <button onClick={() => download('xlsx')} disabled={downloading === 'xlsx'} style={{ padding: '0.5rem 1rem', background: 'var(--de-success)', color: 'white', border: 'none', borderRadius: '0.45rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>{downloading === 'xlsx' ? '...' : '📊 Excel'}</button>
              <button onClick={() => download('docx')} disabled={downloading === 'docx'} style={{ padding: '0.5rem 1rem', background: 'var(--de-accent)', color: 'white', border: 'none', borderRadius: '0.45rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>{downloading === 'docx' ? '...' : '📝 Word'}</button>
              <a href={`/admin/thai-summary/${summary.id}/print`} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem 1rem', background: 'var(--de-danger)', color: 'white', borderRadius: '0.45rem', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}>🖨️ PDF (พิมพ์)</a>
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--de-text-tertiary)' }}>{result.generatedAt ? new Date(result.generatedAt).toLocaleString('th-TH') : ''}</span>
            </div>

            <div style={card}>
              <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--de-border)' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--de-text-primary)' }}>{result.subjectLabel}{result.schoolName ? ` · ${result.schoolName}` : ''}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--de-text-secondary)' }}>
                  ปีการศึกษา {result.academicYearLabel}
                  {result.termLabel ? ` · ภาคเรียน ${result.termLabel}` : ''}
                  {result.kind !== 'supervision' && result.teacherCount != null ? ` · ครู ${result.teacherCount} คน` : ''}
                  {result.schoolCount != null ? ` · ${result.schoolCount} โรงเรียน` : ''}
                  {result.kind === 'supervision' ? ` · นิเทศครั้งที่ ${result.round}` : ''}
                </div>
              </div>

              {summarySections(result).map((sec: any, i: number) => (
                <Section key={i} title={sec.title}>
                  {sec.text ? <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0, color: 'var(--de-text-primary)' }}>{sec.text}</p> : sec.items ? <Bullets items={sec.items} /> : null}
                </Section>
              ))}

              <Section title="คะแนนเฉลี่ยรายด้าน (มาตรา 1–4)">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--de-success-soft)' }}>
                        {['ด้าน', 'ครูประเมินตนเอง', 'ผอ.ประเมิน', 'ค่าเป้าหมาย', 'จำนวนคำตอบ'].map((h) => (
                          <th key={h} style={{ border: '1px solid var(--de-border-strong)', padding: '0.5rem', textAlign: h === 'ด้าน' ? 'left' : 'center' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(result.scoreboard || []).map((d: Dim, i: number) => (
                        <tr key={i}>
                          <td style={{ border: '1px solid var(--de-border-strong)', padding: '0.5rem' }}>{d.sectionName}</td>
                          <td style={{ border: '1px solid var(--de-border-strong)', padding: '0.5rem', textAlign: 'center' }}>{num(d.selfAvg)}</td>
                          <td style={{ border: '1px solid var(--de-border-strong)', padding: '0.5rem', textAlign: 'center' }}>{num(d.directorAvg)}</td>
                          <td style={{ border: '1px solid var(--de-border-strong)', padding: '0.5rem', textAlign: 'center' }}>{num(d.targetAvg)}</td>
                          <td style={{ border: '1px solid var(--de-border-strong)', padding: '0.5rem', textAlign: 'center' }}>{d.responseCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          </>
        )}

        {!summary && selectionReady && (!isSupervision || roundStatus?.ok) && (
          <div style={{ ...card, color: 'var(--de-text-secondary)', textAlign: 'center' }}>ยังไม่มีบทสรุปสำหรับช่วงที่เลือก — กดปุ่มสร้างด้านบน</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--de-success)', borderBottom: '2px solid var(--de-success-soft)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>{title}</h3>
      {children}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '0.5rem', lineHeight: 1.7, listStyle: 'none' }}>
      {items.map((t, i) => <li key={i} style={{ marginBottom: '0.3rem', color: 'var(--de-text-primary)', display: 'flex', gap: '0.5rem' }}><span style={{ color: 'var(--de-success)', flexShrink: 0 }}>•</span><span>{t}</span></li>)}
    </ul>
  );
}

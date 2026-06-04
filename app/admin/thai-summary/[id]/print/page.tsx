// app/admin/thai-summary/[id]/print/page.tsx
// Print-friendly view of a stored THAI_P1_3 summary (leadership OR supervision
// brief) → "Save as PDF" via the browser (Thai line-breaking via Kanit). Content
// is rendered from the shared summarySections() mapper so both kinds work.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { summarySections, summaryDocTitle } from '@/lib/thai-summary-sections';

interface Dim { sectionName: string; selfAvg: number | null; directorAvg: number | null; targetAvg: number | null; responseCount: number }
interface Refl { sectionName: string; term?: number; text: string }

const num = (v: number | null) => (v == null ? '—' : v.toFixed(2));
const termLabel = (t?: number) => (t == null ? '' : t === 1 ? 'ครั้งที่ 1 (เป้าหมายต้นปี)' : 'ครั้งที่ 2 (ทบทวนปลายปี)');
function scopeLabel(scope: string) {
  if (scope === 'individual') return 'รายบุคคล';
  if (scope === 'school') return 'รายโรงเรียน';
  if (scope === 'project') return 'ภาพรวมโครงการ';
  if (scope === 'supervision-t1') return 'นิเทศ ครั้งที่ 1';
  if (scope === 'supervision-t2') return 'นิเทศ ครั้งที่ 2';
  return scope;
}

export default function ThaiSummaryPrintPage() {
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [r, setR] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setError('กรุณาเข้าสู่ระบบ'); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/thai-p13-summary/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (cancelled) return;
        if (!res.ok || !j.success) { setError(j.error || 'ไม่พบบทสรุป'); setLoading(false); return; }
        if (j.data?.status !== 'DONE' || !j.data?.result) { setError('บทสรุปยังไม่เสร็จ'); setLoading(false); return; }
        setR({ ...j.data.result, scope: j.data.scope });
      } catch { if (!cancelled) setError('เกิดข้อผิดพลาดในการโหลดข้อมูล'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'inherit' }}>กำลังโหลดข้อมูล...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#b91c1c', fontFamily: 'inherit' }}>{error}</div>;
  if (!r) return null;

  const isSup = r.kind === 'supervision';
  const sections = summarySections(r);
  const List = ({ items }: { items: string[] }) => (
    <ul style={{ margin: '0.25rem 0 0.75rem', paddingLeft: '1.4rem', lineHeight: 1.7 }}>
      {items.map((t, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{t}</li>)}
    </ul>
  );

  return (
    <div className="print-root" style={{ background: '#fff', color: '#111', fontFamily: 'inherit' }}>
      <style>{`
        @page { size: A4; margin: 15mm 14mm; }
        .print-root { max-width: 920px; margin: 0 auto; padding: 1.5rem; }
        .print-toolbar { position: sticky; top: 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; gap: 0.75rem; align-items: center; justify-content: space-between; }
        .doc-title { text-align: center; margin-bottom: 1rem; }
        .doc-title h1 { font-size: 1.3rem; font-weight: 700; margin: 0 0 0.3rem; }
        .doc-title p { margin: 0.1rem 0; font-size: 0.9rem; color: #374151; }
        h2.sec { font-size: 1.05rem; color: #166534; border-bottom: 2px solid #bbf7d0; padding-bottom: 0.2rem; margin: 1.25rem 0 0.5rem; }
        p.body { line-height: 1.8; margin: 0.25rem 0 0.75rem; }
        table.tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 0.5rem 0 1rem; }
        table.tbl th, table.tbl td { border: 1px solid #94a3b8; padding: 0.4rem 0.5rem; }
        table.tbl thead th { background: #ecfdf5; text-align: center; }
        table.tbl td.c { text-align: center; }
        .badge { display: inline-block; padding: 0.15rem 0.7rem; border-radius: 999px; font-size: 0.8rem; background: #dcfce7; color: #166534; }
        .refl-item { margin-bottom: 0.6rem; }
        .refl-head { font-weight: 700; color: #15803d; font-size: 0.85rem; }
        .gen { margin-top: 2rem; font-size: 0.75rem; color: #9ca3af; text-align: right; }
        @media print { .print-toolbar, .no-print { display: none !important; } .print-root { max-width: none; margin: 0; padding: 0; } h2.sec, tr { page-break-inside: avoid; } thead { display: table-header-group; } }
      `}</style>

      <div className="print-toolbar no-print">
        <a href="/admin/thai-summary" style={{ color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem' }}>← กลับ</a>
        <button onClick={() => window.print()} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.55rem 1.4rem', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
          🖨️ พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      <div className="doc-title">
        <h1>{summaryDocTitle(r)}</h1>
        <p>{scopeLabel(r.scope)} · {r.subjectLabel}{r.schoolName ? ` · ${r.schoolName}` : ''}</p>
        <p>
          ปีการศึกษา {r.academicYearLabel}{r.termLabel ? ` · ภาคเรียน ${r.termLabel}` : ''}
          {!isSup && r.teacherCount != null ? ` · ครู ${r.teacherCount} คน` : ''}
          {r.schoolCount != null ? ` · ${r.schoolCount} โรงเรียน` : ''}
        </p>
        {isSup && r.completion && (
          <p><span className="badge">✓ โรงเรียนประเมินครั้งที่ {r.round} เสร็จแล้ว (ครู + ผอ.) — พร้อมเข้านิเทศ</span></p>
        )}
      </div>

      {sections.map((sec, i) => (
        <div key={i}>
          <h2 className="sec">{sec.title}</h2>
          {sec.text ? <p className="body" style={{ whiteSpace: 'pre-wrap' }}>{sec.text}</p> : sec.items ? <List items={sec.items} /> : null}
        </div>
      ))}

      <h2 className="sec">ตารางคะแนนเฉลี่ยรายด้าน (มาตรา 1–4)</h2>
      <table className="tbl">
        <thead><tr><th>ด้าน</th><th>ครูประเมินตนเอง</th><th>ผอ.ประเมิน</th><th>ค่าเป้าหมาย</th><th>จำนวนคำตอบ</th></tr></thead>
        <tbody>
          {(r.scoreboard || []).map((d: Dim, i: number) => (
            <tr key={i}><td>{d.sectionName}</td><td className="c">{num(d.selfAvg)}</td><td className="c">{num(d.directorAvg)}</td><td className="c">{num(d.targetAvg)}</td><td className="c">{d.responseCount}</td></tr>
          ))}
        </tbody>
      </table>

      {(r.reflections || []).length > 0 && (
        <>
          <h2 className="sec">การสะท้อนคิดของครู</h2>
          {(r.reflections as Refl[]).map((rf, i) => (
            <div className="refl-item" key={i}>
              <div className="refl-head">[{rf.sectionName}{rf.term != null ? ` · ${termLabel(rf.term)}` : ''}]</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{rf.text}</div>
            </div>
          ))}
        </>
      )}

      <div className="gen">จัดทำโดย AI · {r.generatedAt ? new Date(r.generatedAt).toLocaleString('th-TH') : ''}</div>
    </div>
  );
}

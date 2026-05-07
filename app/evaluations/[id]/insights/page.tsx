// app/evaluations/[id]/insights/page.tsx
// SOAR insights view: 4 dimension cards (S/O/A/R) + priorities + PLC questions + 90-day plan.
// Output approval per row + bulk approve. Polls runs/[runId] until DONE.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

interface EvidenceLink { documentId: number | null; pageId: number | null; quote: string }
interface Item { text: string; evidenceLinks: EvidenceLink[]; evidenceMissing: boolean }
interface Dim { strengths: Item[]; opportunities: Item[]; aspirations: Item[]; results: Item[] }
interface Priority { indicatorId: number | null; qDimension: string; gap: number; reason: string; recommendedAction: string }
interface Task { title: string; responsible: string | null; evidenceRequired: string | null }
interface IcebergLayer { current: string[]; desired: string[] }
interface IcebergDim { situations: IcebergLayer; patterns: IcebergLayer; structures: IcebergLayer; mentalModels: IcebergLayer }

interface Run {
  id: number;
  status: string;
  errorMessage: string | null;
  modelName: string;
  promptVersion: string;
  tokensIn: number | null;
  tokensOut: number | null;
  finishedAt: string | null;
  outputs: Array<{ id: number; outputType: string; jsonOutput: any; humanStatus: string; reviewedAt: string | null }>;
}

const Q_DIMS = ['Q-Leadership', 'Q-PLC', 'Q-Learning', 'Q-Students'] as const;
const Q_TH: Record<string, string> = {
  'Q-Leadership': 'Q-Leadership ผู้บริหาร',
  'Q-PLC': 'Q-PLC ชุมชนแห่งการเรียนรู้',
  'Q-Learning': 'Q-Learning การจัดการเรียนรู้',
  'Q-Students': 'Q-Students ด้านนักเรียน',
};

export default function InsightsPage() {
  const router = useRouter();
  const params = useParams();
  const sp = useSearchParams();
  const evaluationId = params.id as string;
  const runIdFromUrl = sp.get('runId');

  const [token, setToken] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(runIdFromUrl);
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchRun = useCallback(async (authToken: string, rid: string) => {
    try {
      const res = await fetch(`/api/ai/soar/runs/${rid}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
      if (res.status === 403) { setError('คุณไม่มีสิทธิ์ดูผลวิเคราะห์นี้'); return; }
      if (res.status === 404) { setError('ไม่พบผลวิเคราะห์'); return; }
      const json = await res.json();
      if (json.success) setRun(json.data);
    } catch {
      setError('โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // If no runId in URL, look up the latest run for this evaluation; else fetch directly
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);

    if (runIdFromUrl) {
      fetchRun(stored, runIdFromUrl);
    } else {
      // No runId — show "no analysis yet" prompt
      setLoading(false);
    }
  }, [router, runIdFromUrl, fetchRun]);

  // Poll until DONE/FAILED
  useEffect(() => {
    if (!token || !runId || !run) return;
    if (run.status === 'DONE' || run.status === 'FAILED') return;
    const t = setInterval(() => fetchRun(token, runId), 3000);
    return () => clearInterval(t);
  }, [token, runId, run, fetchRun]);

  const startNewRun = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ai/soar/analyze-evaluation/${evaluationId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError(json.error || 'ไม่สามารถเริ่มวิเคราะห์'); return; }
      toastSuccess('เริ่มวิเคราะห์แล้ว');
      const newId = String(json.data.runId);
      setRunId(newId);
      router.replace(`/evaluations/${evaluationId}/insights?runId=${newId}`);
      fetchRun(token, newId);
    } catch { toastError('เกิดข้อผิดพลาด'); }
    finally { setBusy(false); }
  };

  const approveAll = async () => {
    if (!token || !runId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ai/soar/runs/${runId}/approve`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError(json.error || 'อนุมัติไม่สำเร็จ'); return; }
      toastSuccess(`อนุมัติทั้งชุดแล้ว (${json.data.approvedCount} รายการ)`);
      fetchRun(token, runId);
    } catch { toastError('เกิดข้อผิดพลาด'); }
    finally { setBusy(false); }
  };

  const setOutputStatus = async (outputId: number, status: 'APPROVED' | 'REJECTED' | 'DRAFT') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/ai/soar/outputs/${outputId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ humanStatus: status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError(json.error || 'อัปเดตไม่สำเร็จ'); return; }
      toastSuccess('อัปเดตสำเร็จ');
      if (runId) fetchRun(token, runId);
    } catch { toastError('เกิดข้อผิดพลาด'); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</div>;
  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
      <Link href={`/evaluations/${evaluationId}`} style={{ color: '#667eea' }}>← กลับ</Link>
    </div>
  );

  if (!runId || !run) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', background: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <Link href={`/evaluations/${evaluationId}`} style={{ display: 'inline-block', marginBottom: '1rem', padding: '0.4rem 0.85rem', background: '#667eea', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← กลับ
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>🤖 AI + SOAR Insights</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>ยังไม่มีผลวิเคราะห์สำหรับการประเมินนี้ — กดปุ่มด้านล่างเพื่อเริ่ม</p>
          <button
            onClick={startNewRun}
            disabled={busy}
            style={{ padding: '0.7rem 1.25rem', background: busy ? '#9ca3af' : '#7c3aed', color: 'white', border: 'none', borderRadius: '0.4rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}
          >
            {busy ? 'กำลังเริ่ม...' : '🤖 วิเคราะห์ด้วย AI + SOAR'}
          </button>
        </div>
      </div>
    );
  }

  // Pull outputs by type
  const byType: Record<string, Run['outputs'][number] | undefined> = {};
  for (const o of run.outputs) byType[o.outputType] = o;
  const exec = byType['executive']?.jsonOutput?.executiveInsight as string | undefined;
  const soar = byType['soar']?.jsonOutput as Record<string, Dim> | undefined;
  const iceberg = byType['iceberg']?.jsonOutput as Record<string, IcebergDim> | undefined;
  const priorities = (byType['priorities']?.jsonOutput as Priority[] | undefined) || [];
  const plcQs = (byType['plc_questions']?.jsonOutput as string[] | undefined) || [];
  const evGaps = (byType['evidence_gaps']?.jsonOutput as Array<{ indicatorId: number | null; qDimension: string; missing: string }> | undefined) || [];
  const plan = byType['plan_30_60_90']?.jsonOutput as { day30: Task[]; day60: Task[]; day90: Task[] } | undefined;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <Link href={`/evaluations/${evaluationId}`} style={{ display: 'inline-block', marginBottom: '0.5rem', padding: '0.35rem 0.75rem', background: '#667eea', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontSize: '0.85rem' }}>
              ← กลับ
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#333', margin: 0 }}>🤖 AI + SOAR Insights</h1>
            <p style={{ color: '#666', fontSize: '0.85rem' }}>
              run #{run.id} · {run.modelName} · {run.promptVersion}
              {run.tokensIn !== null && ` · in=${run.tokensIn} out=${run.tokensOut}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <StatusPill status={run.status} />
            {run.status === 'DONE' && (
              <button onClick={approveAll} disabled={busy} style={{ padding: '0.55rem 1rem', background: busy ? '#ccc' : '#10b981', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                ✅ อนุมัติทั้งชุด
              </button>
            )}
            <button onClick={startNewRun} disabled={busy} style={{ padding: '0.55rem 1rem', background: busy ? '#ccc' : '#7c3aed', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
              🔄 วิเคราะห์ใหม่
            </button>
          </div>
        </div>

        {run.errorMessage && (
          <div style={{ padding: '0.75rem', background: '#fee', color: '#c33', borderRadius: '0.4rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            ⚠️ {run.errorMessage}
          </div>
        )}

        {(run.status === 'PENDING' || run.status === 'RUNNING') && (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#666' }}>⏳ AI กำลังวิเคราะห์ (ใช้เวลาประมาณ 30 วินาที)...</p>
          </div>
        )}

        {run.status === 'DONE' && (
          <>
            {exec && (
              <Card title="🌟 Executive Insight" output={byType['executive']} onSet={setOutputStatus}>
                <p style={{ color: '#333', lineHeight: 1.7, fontSize: '0.95rem' }}>{exec}</p>
              </Card>
            )}

            {soar && (
              <Card title="🧭 SOAR by Dimension" output={byType['soar']} onSet={setOutputStatus}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1rem' }}>
                  {Q_DIMS.map((d) => (
                    <DimCard key={d} dim={d} dimTh={Q_TH[d]} data={soar[d]} />
                  ))}
                </div>
              </Card>
            )}

            {iceberg && (
              <Card title="🧊 Iceberg Analysis (สิ่งที่เป็นอยู่ ↔ สิ่งที่อยากให้เป็น)" output={byType['iceberg']} onSet={setOutputStatus}>
                <p style={{ fontSize: '0.82rem', color: '#666', marginTop: 0, marginBottom: '1rem' }}>
                  มอง 4 ชั้นจากผิวสู่ราก: <strong>สถานการณ์</strong> (สิ่งที่เห็น) → <strong>รูปแบบ</strong> (สิ่งที่เกิดซ้ำ) → <strong>โครงสร้าง</strong> (กลไกที่ค้ำ) → <strong>แบบจำลองวิธีคิด</strong> (ความเชื่อที่ฝังลึก) แต่ละชั้นเทียบ "เป็นอยู่ vs อยากให้เป็น"
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))', gap: '1rem' }}>
                  {Q_DIMS.map((d) => (
                    <IcebergCard key={d} dim={d} dimTh={Q_TH[d]} data={iceberg[d]} />
                  ))}
                </div>
              </Card>
            )}

            {priorities.length > 0 && (
              <Card title={`🎯 Top Priorities (${priorities.length})`} output={byType['priorities']} onSet={setOutputStatus}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>มิติ</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Gap</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>เหตุผล</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>ข้อเสนอ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorities.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.5rem', color: '#7c3aed', fontWeight: 600 }}>{p.qDimension}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: '#ef4444' }}>+{p.gap}</td>
                        <td style={{ padding: '0.5rem', color: '#333' }}>{p.reason}</td>
                        <td style={{ padding: '0.5rem', color: '#333' }}>{p.recommendedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {plcQs.length > 0 && (
              <Card title="💬 คำถามสำหรับวง PLC" output={byType['plc_questions']} onSet={setOutputStatus}>
                <ol style={{ paddingLeft: '1.25rem', color: '#333', lineHeight: 1.7 }}>
                  {plcQs.map((q, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{q}</li>)}
                </ol>
              </Card>
            )}

            {evGaps.length > 0 && (
              <Card title={`📭 หลักฐานที่ยังขาด (${evGaps.length})`} output={byType['evidence_gaps']} onSet={setOutputStatus}>
                <ul style={{ paddingLeft: '1.25rem', color: '#333' }}>
                  {evGaps.map((g, i) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#7c3aed' }}>{g.qDimension}:</strong> {g.missing}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {plan && (
              <Card title="📅 แผนพัฒนา 30/60/90 วัน" output={byType['plan_30_60_90']} onSet={setOutputStatus}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {(['day30', 'day60', 'day90'] as const).map((k) => (
                    <PlanColumn key={k} title={k.replace('day', '') + ' วัน'} tasks={(plan[k] as Task[]) || []} />
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#fef3c7', text: '#92400e' },
    RUNNING: { bg: '#dbeafe', text: '#1e40af' },
    DONE: { bg: '#d1fae5', text: '#065f46' },
    FAILED: { bg: '#fee2e2', text: '#991b1b' },
  };
  const c = map[status] || { bg: '#f3f4f6', text: '#374151' };
  return <span style={{ padding: '0.25rem 0.6rem', background: c.bg, color: c.text, borderRadius: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>{status}</span>;
}

function Card({ title, children, output, onSet }: {
  title: string;
  children: React.ReactNode;
  output?: Run['outputs'][number];
  onSet: (id: number, status: 'APPROVED' | 'REJECTED' | 'DRAFT') => void;
}) {
  return (
    <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', margin: 0 }}>{title}</h2>
        {output && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ padding: '0.2rem 0.5rem', background: output.humanStatus === 'APPROVED' ? '#d1fae5' : output.humanStatus === 'REJECTED' ? '#fee2e2' : '#f3f4f6', color: output.humanStatus === 'APPROVED' ? '#065f46' : output.humanStatus === 'REJECTED' ? '#991b1b' : '#374151', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
              {output.humanStatus}
            </span>
            {output.humanStatus !== 'APPROVED' && (
              <button onClick={() => onSet(output.id, 'APPROVED')} style={{ padding: '0.3rem 0.6rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>✓ อนุมัติ</button>
            )}
            {output.humanStatus !== 'REJECTED' && (
              <button onClick={() => onSet(output.id, 'REJECTED')} style={{ padding: '0.3rem 0.6rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>✗ ปฏิเสธ</button>
            )}
            {output.humanStatus !== 'DRAFT' && (
              <button onClick={() => onSet(output.id, 'DRAFT')} style={{ padding: '0.3rem 0.6rem', background: '#f3f4f6', color: '#333', border: '1px solid #d1d5db', borderRadius: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' }}>↺ คืน</button>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function DimCard({ dim, dimTh, data }: { dim: string; dimTh: string; data?: Dim }) {
  if (!data) return null;
  const sections: Array<{ key: keyof Dim; label: string; color: string; bg: string }> = [
    { key: 'strengths', label: 'S · จุดแข็ง', color: '#065f46', bg: '#d1fae5' },
    { key: 'opportunities', label: 'O · โอกาสพัฒนา', color: '#92400e', bg: '#fef3c7' },
    { key: 'aspirations', label: 'A · เป้าหมาย', color: '#1e40af', bg: '#dbeafe' },
    { key: 'results', label: 'R · ผลลัพธ์', color: '#5b21b6', bg: '#ede9fe' },
  ];
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.85rem 1rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7c3aed', margin: '0 0 0.6rem' }}>{dimTh}</h3>
      {sections.map(({ key, label, color, bg }) => (
        <div key={key} style={{ marginBottom: '0.6rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color, background: bg, padding: '0.2rem 0.5rem', display: 'inline-block', borderRadius: '0.25rem', marginBottom: '0.35rem' }}>{label}</div>
          {(data[key] || []).length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>—</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.83rem', color: '#333', lineHeight: 1.5 }}>
              {(data[key] || []).map((item, i) => (
                <li key={i} style={{ marginBottom: '0.35rem' }}>
                  {item.text}
                  {item.evidenceMissing && (
                    <span style={{ marginLeft: '0.4rem', padding: '0.05rem 0.35rem', background: '#fef2f2', color: '#991b1b', borderRadius: '0.2rem', fontSize: '0.7rem', fontWeight: 600 }}>หลักฐานไม่พอ</span>
                  )}
                  {item.evidenceLinks && item.evidenceLinks.length > 0 && (
                    <span style={{ marginLeft: '0.4rem' }}>
                      {item.evidenceLinks.map((e, j) => (
                        <span key={j} title={e.quote} style={{ display: 'inline-block', padding: '0.05rem 0.35rem', background: '#dbeafe', color: '#1e40af', borderRadius: '0.2rem', fontSize: '0.7rem', fontWeight: 600, marginRight: '0.2rem' }}>
                          📎 doc {e.documentId ?? '?'}{e.pageId !== null ? `/p${e.pageId}` : ''}
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function IcebergCard({ dim, dimTh, data }: { dim: string; dimTh: string; data?: IcebergDim }) {
  if (!data) return null;
  // Top of iceberg = visible (light blue / sky), bottom = hidden mental models (deep navy).
  // Each layer is a 2-column row: current (left) vs desired (right).
  const layers: Array<{
    key: keyof IcebergDim;
    label: string;
    sublabel: string;
    bg: string;
    accent: string;
  }> = [
    { key: 'situations', label: '1 · สถานการณ์', sublabel: 'สิ่งที่เห็นเกิดขึ้น', bg: '#eff6ff', accent: '#1d4ed8' },
    { key: 'patterns', label: '2 · รูปแบบของปัญหา', sublabel: 'สิ่งที่เกิดซ้ำจนเป็นเทรนด์', bg: '#dbeafe', accent: '#1e40af' },
    { key: 'structures', label: '3 · โครงสร้าง', sublabel: 'นโยบาย / ระบบ / ทรัพยากรที่ค้ำไว้', bg: '#bfdbfe', accent: '#1e3a8a' },
    { key: 'mentalModels', label: '4 · แบบจำลองวิธีคิด', sublabel: 'ความเชื่อ / ค่านิยมที่ฝังลึก', bg: '#93c5fd', accent: '#0c1a4d' },
  ];
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.85rem 1rem', background: 'white' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7c3aed', margin: '0 0 0.6rem' }}>{dimTh}</h3>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr 1fr', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.3rem', paddingLeft: '0.25rem' }}>
        <div></div>
        <div>📍 สิ่งที่เป็นอยู่ (current)</div>
        <div>🎯 สิ่งที่อยากให้เป็น (desired)</div>
      </div>
      {layers.map(({ key, label, sublabel, bg, accent }) => {
        const layer = data[key];
        return (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem', alignItems: 'stretch' }}>
            <div style={{ background: bg, borderLeft: `4px solid ${accent}`, padding: '0.5rem 0.6rem', borderRadius: '0.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: accent }}>{label}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569', lineHeight: 1.3 }}>{sublabel}</div>
            </div>
            <BulletCell items={layer?.current} placeholder="—" />
            <BulletCell items={layer?.desired} placeholder="—" highlight />
          </div>
        );
      })}
    </div>
  );
}

function BulletCell({ items, placeholder, highlight }: { items?: string[]; placeholder: string; highlight?: boolean }) {
  if (!items || items.length === 0) {
    return <div style={{ padding: '0.5rem 0.6rem', fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>{placeholder}</div>;
  }
  return (
    <ul style={{
      margin: 0,
      padding: '0.5rem 0.6rem 0.5rem 1.4rem',
      fontSize: '0.78rem',
      color: '#1f2937',
      lineHeight: 1.45,
      background: highlight ? '#fefce8' : '#f9fafb',
      borderRadius: '0.25rem',
      borderLeft: highlight ? '3px solid #eab308' : '3px solid #d1d5db',
    }}>
      {items.map((t, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{t}</li>)}
    </ul>
  );
}

function PlanColumn({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.85rem 1rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#7c3aed', margin: '0 0 0.6rem' }}>{title}</h3>
      {tasks.length === 0 ? (
        <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>—</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.83rem', color: '#333', lineHeight: 1.5 }}>
          {tasks.map((t, i) => (
            <li key={i} style={{ marginBottom: '0.4rem' }}>
              {t.title}
              {t.responsible && <div style={{ fontSize: '0.75rem', color: '#666' }}>👤 {t.responsible}</div>}
              {t.evidenceRequired && <div style={{ fontSize: '0.75rem', color: '#666' }}>📋 {t.evidenceRequired}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

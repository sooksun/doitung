// app/admin/sar/[id]/page.tsx
// SAR document detail — status timeline + Process / Approve buttons + version history.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

interface VersionRow { id: number; versionNo: number; createdAt: string; changeNote: string | null; createdBy: { name: string } | null; }
interface SarDetail {
  id: number;
  schoolId: number;
  schoolCode: string | null;
  schoolName: string;
  academicYear: string;
  level: string;
  originalFilename: string;
  filePath: string;
  status: string;
  extractionMethod: string | null;
  textQualityScore: number | null;
  pageCount: number | null;
  pagesStored: number;
  uploadedBy: { name: string } | null;
  approvedBy: { name: string } | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
  versions: VersionRow[];
}

const LEVEL_LABEL: Record<string, string> = { EARLY_CHILDHOOD: 'ปฐมวัย', BASIC_EDUCATION: 'ขั้นพื้นฐาน' };
const STATUS_FLOW = ['UPLOADED', 'EXTRACTING', 'NEEDS_REVIEW', 'APPROVED'] as const;

export default function SarDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [doc, setDoc] = useState<SarDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`/api/admin/sar-documents/${id}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
      if (res.status === 403) { setError('คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้'); setLoading(false); return; }
      if (res.status === 404) { setError('ไม่พบเอกสาร'); setLoading(false); return; }
      const json = await res.json();
      if (json.success) setDoc(json.data);
    } catch {
      setError('โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    load(stored);
  }, [router, load]);

  // Auto-refresh while EXTRACTING
  useEffect(() => {
    if (!token || !doc) return;
    if (doc.status !== 'EXTRACTING') return;
    const t = setInterval(() => load(token), 3000);
    return () => clearInterval(t);
  }, [token, doc, load]);

  const action = async (path: string, method: 'POST' | 'DELETE' = 'POST') => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch(path, { method, headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'ไม่สำเร็จ');
        return;
      }
      toastSuccess(json.message || 'สำเร็จ');
      await load(token);
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</div>;
  if (error || !doc) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'ไม่พบเอกสาร'}</p>
        <Link href="/admin/sar" style={{ color: '#667eea', textDecoration: 'none' }}>← กลับไปคลังหลักฐาน</Link>
      </div>
    );
  }

  const statusIndex = STATUS_FLOW.indexOf(doc.status as any);

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link href="/admin/sar" style={{ display: 'inline-block', marginBottom: '1rem', padding: '0.4rem 0.85rem', background: '#667eea', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← กลับ
        </Link>

        <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
            📄 SAR #{doc.id}
          </h1>
          <div style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <div>{doc.schoolCode} {doc.schoolName} · ปีการศึกษา {doc.academicYear} · ระดับ {LEVEL_LABEL[doc.level] || doc.level}</div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>{doc.originalFilename}</div>
          </div>

          {/* Status timeline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {STATUS_FLOW.map((s, i) => {
              const reached = statusIndex >= i;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: reached ? '#10b981' : '#e5e7eb',
                    color: reached ? 'white' : '#9ca3af',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '0.85rem', color: reached ? '#10b981' : '#9ca3af', fontWeight: i === statusIndex ? 700 : 500 }}>{s}</span>
                  {i < STATUS_FLOW.length - 1 && (
                    <span style={{ width: '24px', height: '2px', background: statusIndex > i ? '#10b981' : '#e5e7eb' }} />
                  )}
                </div>
              );
            })}
          </div>

          {doc.errorMessage && (
            <div style={{ padding: '0.75rem', background: '#fee', color: '#c33', borderRadius: '0.4rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              ⚠️ {doc.errorMessage}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Stat label="หน้าทั้งหมด" value={doc.pageCount ? String(doc.pageCount) : '—'} />
            <Stat label="หน้าที่บันทึก" value={String(doc.pagesStored)} />
            <Stat label="วิธีสกัดข้อความ" value={doc.extractionMethod || '—'} />
            <Stat label="คุณภาพข้อความ" value={doc.textQualityScore !== null ? `${(doc.textQualityScore * 100).toFixed(0)}%` : '—'} />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <a
              href={`/api/admin/sar-documents/${doc.id}/file`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: '0.55rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontWeight: 500 }}
            >
              📖 เปิด PDF
            </a>
            {(doc.status === 'UPLOADED' || doc.status === 'NEEDS_REVIEW') && (
              <button
                onClick={() => action(`/api/admin/sar-documents/${doc.id}/process`)}
                disabled={busy}
                style={{ padding: '0.55rem 1rem', background: busy ? '#ccc' : '#7c3aed', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 500 }}
              >
                ⚙️ ประมวลผล (Extract / OCR)
              </button>
            )}
            {(doc.status === 'NEEDS_REVIEW' || doc.status === 'APPROVED') && (
              <Link
                href={`/admin/sar/${doc.id}/review`}
                style={{ padding: '0.55rem 1rem', background: '#f59e0b', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontWeight: 500 }}
              >
                📝 ตรวจทานรายหน้า ({doc.pagesStored})
              </Link>
            )}
            {doc.status === 'NEEDS_REVIEW' && (
              <button
                onClick={() => action(`/api/admin/sar-documents/${doc.id}/approve`)}
                disabled={busy}
                style={{ padding: '0.55rem 1rem', background: busy ? '#ccc' : '#10b981', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 500 }}
              >
                ✅ อนุมัติเป็น Evidence Base
              </button>
            )}
            <Link href="/admin/sar/new" style={{ padding: '0.55rem 1rem', background: '#e5e7eb', color: '#333', borderRadius: '0.4rem', textDecoration: 'none', fontWeight: 500 }}>
              📤 อัปโหลดเวอร์ชันใหม่
            </Link>
          </div>

          {/* Versions */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>ประวัติเวอร์ชัน</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>เวอร์ชัน</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>วันที่</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>โดย</th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {doc.versions.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>v{v.versionNo}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#666' }}>{new Date(v.createdAt).toLocaleString('th-TH')}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#666' }}>{v.createdBy?.name || '—'}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#666' }}>{v.changeNote || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Audit fields */}
          <div style={{ marginTop: '1.5rem', fontSize: '0.78rem', color: '#888' }}>
            <div>อัปโหลดโดย: {doc.uploadedBy?.name || '—'} · {new Date(doc.createdAt).toLocaleString('th-TH')}</div>
            {doc.approvedBy && doc.approvedAt && (
              <div>อนุมัติโดย: {doc.approvedBy.name} · {new Date(doc.approvedAt).toLocaleString('th-TH')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '0.4rem', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '0.78rem', color: '#666', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#333' }}>{value}</div>
    </div>
  );
}

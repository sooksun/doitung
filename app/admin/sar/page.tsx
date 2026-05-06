// app/admin/sar/page.tsx
// SAR Evidence Center — list documents (admin sees all, school_leader sees own).

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SarRow {
  id: number;
  schoolCode: string | null;
  schoolName: string;
  academicYear: string;
  level: 'EARLY_CHILDHOOD' | 'BASIC_EDUCATION';
  originalFilename: string;
  status: string;
  extractionMethod: string | null;
  textQualityScore: number | null;
  pageCount: number | null;
  pagesStored: number;
  versions: number;
  uploadedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
}

const LEVEL_LABEL: Record<string, string> = {
  EARLY_CHILDHOOD: 'ปฐมวัย',
  BASIC_EDUCATION: 'ขั้นพื้นฐาน',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  UPLOADED: { bg: '#fef3c7', text: '#92400e', label: 'รออัปโหลด/รอประมวลผล' },
  EXTRACTING: { bg: '#dbeafe', text: '#1e40af', label: 'กำลังประมวลผล' },
  NEEDS_REVIEW: { bg: '#fde68a', text: '#92400e', label: 'รอตรวจทาน' },
  APPROVED: { bg: '#d1fae5', text: '#065f46', label: 'ยืนยันแล้ว' },
  ARCHIVED: { bg: '#e5e7eb', text: '#374151', label: 'เก็บถาวร' },
};

export default function SarListPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<SarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/sar-documents', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
      if (res.status === 403) { setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้'); return; }
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) setRows(json.data.items);
    } catch {
      setError('โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    load(stored);
  }, [router, load]);

  // Auto-refresh while any document is in EXTRACTING state
  useEffect(() => {
    if (!token) return;
    const hasInProgress = rows.some((r) => r.status === 'EXTRACTING' || r.status === 'UPLOADED');
    if (!hasInProgress) return;
    const id = setInterval(() => load(token), 4000);
    return () => clearInterval(id);
  }, [token, rows, load]);

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              📚 คลังหลักฐาน SAR
            </h1>
            <p style={{ color: '#666' }}>อัปโหลด SAR ปฐมวัย + ขั้นพื้นฐาน ปีละ 2 ไฟล์ · OCR + ตรวจทาน · ใช้เป็น Evidence Base ของ AI</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/admin/sar/new" style={{ padding: '0.55rem 1rem', background: '#10b981', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600 }}>
              + อัปโหลด SAR ใหม่
            </Link>
            <Link href="/dashboard" style={{ padding: '0.55rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>
        )}

        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>โรงเรียน</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ปี</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ระดับ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ไฟล์</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>หน้า</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>คุณภาพข้อความ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>เวอร์ชัน</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>ยังไม่มี SAR — กดปุ่ม "อัปโหลดใหม่" เพื่อเริ่ม</td></tr>
                ) : rows.map((r) => {
                  const sc = STATUS_COLORS[r.status] || { bg: '#f3f4f6', text: '#6b7280', label: r.status };
                  const qScore = r.textQualityScore !== null ? `${(r.textQualityScore * 100).toFixed(0)}%` : '—';
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.6rem 1rem', color: '#666' }}>#{r.id}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#333', fontSize: '0.85rem' }}>{r.schoolCode ? `${r.schoolCode} ` : ''}{r.schoolName}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#666' }}>{r.academicYear}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#333' }}>{LEVEL_LABEL[r.level] || r.level}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#666', fontSize: '0.8rem' }} title={r.originalFilename}>
                        {r.originalFilename.length > 30 ? r.originalFilename.slice(0, 30) + '…' : r.originalFilename}
                      </td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.2rem 0.6rem', background: sc.bg, color: sc.text, borderRadius: '0.25rem', fontSize: '0.78rem', fontWeight: 600 }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#666' }}>
                        {r.pagesStored}/{r.pageCount ?? '?'}
                      </td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#666' }}>{qScore}</td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#666' }}>v{r.versions}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <Link href={`/admin/sar/${r.id}`} style={{ padding: '0.25rem 0.7rem', background: '#667eea', color: 'white', borderRadius: '0.3rem', textDecoration: 'none', fontSize: '0.8rem' }}>
                          เปิด
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

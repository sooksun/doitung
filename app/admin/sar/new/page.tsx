// app/admin/sar/new/page.tsx
// Submit SAR data for a school+year. One Iceberg matrix + optional PDF per submission.
// `level` is fixed to BASIC_EDUCATION on this form — the previous early-childhood/basic
// split was consolidated into a single SAR per school/year on user request.

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';
import { IcebergInput, EMPTY_ICEBERG, icebergHasContent, type Iceberg } from '@/app/components/IcebergInput';

interface School { id: number; code: string | null; nameTh: string | null; name: string; }
interface AcademicYear { id: number; year: string; }

export default function NewSarPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [meIsAdmin, setMeIsAdmin] = useState(false);
  const [boundSchoolId, setBoundSchoolId] = useState<number | null>(null);
  const [boundSchoolName, setBoundSchoolName] = useState<string>('');

  const [schools, setSchools] = useState<School[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [schoolInput, setSchoolInput] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [iceberg, setIceberg] = useState<Iceberg>(EMPTY_ICEBERG);
  const [changeNote, setChangeNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resolvedSchoolId = useMemo(() => {
    if (boundSchoolId) return boundSchoolId;
    const q = schoolInput.trim();
    if (!q) return null;
    const match = schools.find((s) => {
      const label = `${s.code || ''} ${s.nameTh || s.name || ''}`.trim();
      return label === q || s.code === q;
    });
    if (match) return match.id;
    const startsWith = schools.find((s) => (s.code || '').startsWith(q) || (s.nameTh || '').startsWith(q));
    return startsWith ? startsWith.id : null;
  }, [schoolInput, schools, boundSchoolId]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);

    const me = localStorage.getItem('user');
    let isAdmin = false;
    if (me) {
      try {
        const parsed = JSON.parse(me);
        isAdmin = Array.isArray(parsed.roles) && parsed.roles.includes('ADMIN');
        setMeIsAdmin(isAdmin);
      } catch { /* */ }
    }

    Promise.all([
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } }).then((r) => r.json()),
      fetch('/api/academic-years', { headers: { Authorization: `Bearer ${stored}` } }).then((r) => r.json()),
      fetch('/api/schools?isActive=true', { headers: { Authorization: `Bearer ${stored}` } }).then((r) => r.json()),
    ]).then(([meRes, yRes, sRes]) => {
      if (meRes.success && meRes.data?.school) {
        setBoundSchoolId(meRes.data.school.id);
        setBoundSchoolName(`${meRes.data.school.code || ''} ${meRes.data.school.nameTh}`.trim());
      }
      if (yRes.success) {
        const ys = yRes.data || [];
        setYears(ys);
        if (ys.length > 0) setAcademicYearId(String(ys[0].id));
      }
      if (sRes.success) setSchools(sRes.data || []);
    }).catch(() => setError('โหลดข้อมูลไม่สำเร็จ'));
  }, [router]);

  // Single submission: one PDF + one Iceberg, level hardcoded to BASIC_EDUCATION.
  const hasInput = !!file || icebergHasContent(iceberg);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!hasInput) {
      toastError('กรุณาส่ง PDF หรือกรอกอย่างน้อย 1 ช่อง Iceberg');
      return;
    }
    if (!academicYearId) { toastError('กรุณาเลือกปีการศึกษา'); return; }
    if (!resolvedSchoolId) { toastError('กรุณาเลือกโรงเรียน'); return; }

    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      if (file) fd.append('file', file);
      if (icebergHasContent(iceberg)) fd.append('bodyIceberg', JSON.stringify(iceberg));
      fd.append('schoolId', String(resolvedSchoolId));
      fd.append('academicYearId', academicYearId);
      fd.append('level', 'BASIC_EDUCATION');
      if (changeNote) fd.append('changeNote', changeNote);

      const res = await fetch('/api/admin/sar-documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Submit failed');
      toastSuccess('บันทึกสำเร็จ');
      router.push(json.data?.id ? `/admin/sar/${json.data.id}` : '/admin/sar');
    } catch (err: any) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
      toastError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.4rem', fontWeight: 500, color: '#333' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.95rem', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Link href="/admin/sar" style={{ display: 'inline-block', marginBottom: '1rem', padding: '0.4rem 0.85rem', background: '#667eea', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontSize: '0.9rem' }}>
          ← กลับ
        </Link>

        <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>
            📤 ส่งข้อมูล SAR
          </h1>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            ส่งได้ทั้ง <strong>ไฟล์ PDF</strong> และ/หรือ <strong>กรอกแบบ Iceberg Model</strong> 4 ชั้น × 2 ด้าน (สิ่งที่เป็นอยู่ ↔ สิ่งที่อยากให้เป็น) · ไม่บังคับครบทุกช่อง · ทุกครั้งที่บันทึกจะเก็บเวอร์ชันใหม่
          </p>

          {error && <div style={{ padding: '0.75rem', background: '#fee', color: '#c33', borderRadius: '0.4rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>โรงเรียน *</label>
              {boundSchoolId ? (
                <div style={{ padding: '0.6rem 0.85rem', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '0.4rem', color: '#4c1d95', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🔒 {boundSchoolName}
                  <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#7c3aed', fontWeight: 400 }}>ผูกกับบัญชีของคุณ</span>
                </div>
              ) : meIsAdmin ? (
                <>
                  <input
                    list="sar-schools"
                    value={schoolInput}
                    onChange={(e) => setSchoolInput(e.target.value)}
                    placeholder="พิมพ์รหัสหรือชื่อโรงเรียน"
                    style={inputStyle}
                  />
                  <datalist id="sar-schools">
                    {schools.map((s) => (
                      <option key={s.id} value={`${s.code || ''} ${s.nameTh || s.name || ''}`.trim()} />
                    ))}
                  </datalist>
                </>
              ) : (
                <div style={{ padding: '0.6rem 0.85rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.4rem', color: '#991b1b', fontSize: '0.9rem' }}>
                  ⚠️ บัญชีของคุณยังไม่ได้ผูกกับโรงเรียน
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>ปีการศึกษา *</label>
              <select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} required style={inputStyle}>
                <option value="">เลือกปีการศึกษา</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
              </select>
            </div>

            <fieldset style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>📎 ไฟล์ PDF (ถ้ามี)</label>
                <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ ...inputStyle, padding: '0.5rem', cursor: 'pointer' }} />
                {file && <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.25rem' }}>เลือกแล้ว: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</div>}
              </div>
              <IcebergInput value={iceberg} onChange={setIceberg} />
            </fieldset>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>หมายเหตุการเปลี่ยนแปลง (ถ้าอัปโหลดเวอร์ชันใหม่)</label>
              <input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} style={inputStyle} placeholder="เช่น แก้คำผิดหน้า 12, เพิ่มภาคผนวก" />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
              <button
                type="submit"
                disabled={submitting || !hasInput || !resolvedSchoolId || !academicYearId}
                style={{
                  padding: '0.7rem 1.5rem',
                  background: submitting || !hasInput || !resolvedSchoolId || !academicYearId ? '#9ca3af' : '#10b981',
                  color: 'white', border: 'none', borderRadius: '0.4rem', fontSize: '0.95rem', fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'กำลังบันทึก...' : '💾 บันทึก'}
              </button>
              <Link href="/admin/sar" style={{ padding: '0.7rem 1.5rem', background: '#f3f4f6', color: '#333', border: '1px solid #d1d5db', borderRadius: '0.4rem', fontSize: '0.95rem', textDecoration: 'none' }}>
                ยกเลิก
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


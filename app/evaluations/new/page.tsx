// app/evaluations/new/page.tsx
// Create new evaluation page

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Instrument {
  id: number;
  code: string;
  nameTh: string;
  type: string;
}

interface School {
  id: number;
  code: string;
  nameTh: string | null;
}

interface AcademicYear {
  id: number;
  year: number;
}

interface Term {
  id: number;
  name: string;
}

export default function NewEvaluationPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Ref-based guard for handleSubmit. `setSubmitting(true)` only takes effect
  // after the next React render, so a fast double-click / Enter spam can pass
  // the `if (submitting)` check twice before the disabled state lands on the
  // button. The ref flips synchronously inside the handler, so the second
  // invocation bails before any fetch fires (and thus before duplicate
  // evaluations / teacher-pair sessions are created on the server).
  const submittingRef = useRef(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [boundSchool, setBoundSchool] = useState<{ id: number; code: string | null; nameTh: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    instrumentId: '',
    schoolId: '',
    academicYearId: '',
    termId: '',
    note: '',
  });

  // Teacher-pair (Thai ป.1–3) pickers
  const [teachers, setTeachers] = useState<{ teacherId: number; userId: number | null; name: string }[]>([]);
  const [directors, setDirectors] = useState<{ userId: number; name: string }[]>([]);
  const [targetTeacherId, setTargetTeacherId] = useState('');
  const [directorUserId, setDirectorUserId] = useState('');
  const [loadingPickers, setLoadingPickers] = useState(false);

  const selectedInstrument = instruments.find((i) => String(i.id) === formData.instrumentId);
  const isThaiPair = selectedInstrument?.type === 'THAI_P1_3';

  // Tracks the most recent fetchInitialData run + terms-fetch tag so unmount
  // or rapid academic-year switching can drop stale responses.
  const initialLoadTokenRef = useRef(0);
  const termsRequestIdRef = useRef(0);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    const runToken = ++initialLoadTokenRef.current;
    fetchInitialData(storedToken, runToken);
    return () => {
      // Bump on cleanup so the in-flight run skips any further setState.
      initialLoadTokenRef.current++;
    };
  }, [router]);

  // Load the school's teachers + directors when a Thai ป.1–3 instrument and a school are chosen
  useEffect(() => {
    if (!isThaiPair || !formData.schoolId || !token) {
      setTeachers([]);
      setDirectors([]);
      setTargetTeacherId('');
      setDirectorUserId('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingPickers(true);
      try {
        const res = await fetch(`/api/schools/${formData.schoolId}/teachers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const j = await res.json();
          if (!cancelled && j.success) {
            const teacherList = j.data.teachers || [];
            const directorList = j.data.directors || [];
            setTeachers(teacherList);
            setDirectors(directorList);
            // Auto-select current user as the evaluated teacher (for TEACHER role)
            const selfTeacher = teacherList.find((t: any) => t.userId === currentUserId);
            setTargetTeacherId(selfTeacher ? String(selfTeacher.teacherId) : '');
            // Auto-select current user as director (for SCHOOL_LEADER role)
            const selfDir = directorList.find((d: any) => d.userId === currentUserId);
            setDirectorUserId(selfDir ? String(selfDir.userId) : '');
          }
        }
      } catch {
        /* ignore — UI shows empty pickers */
      } finally {
        if (!cancelled) setLoadingPickers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isThaiPair, formData.schoolId, token, currentUserId]);

  const fetchInitialData = async (authToken: string, runToken?: number) => {
    const stillCurrent = () =>
      runToken == null || initialLoadTokenRef.current === runToken;
    const handleAuth = (status: number) => {
      if (status === 401) {
        localStorage.removeItem('token');
        if (stillCurrent()) router.push('/login');
        return true;
      }
      return false;
    };
    try {
      // Fetch instruments, schools, academic years, terms, and current user in parallel
      const [instrumentsRes, schoolsRes, academicYearsRes, meRes] = await Promise.all([
        fetch('/api/instruments', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }),
        fetch('/api/schools?isActive=true', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }),
        fetch('/api/academic-years', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }),
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }),
      ]);

      if (!stillCurrent()) return;
      if (handleAuth(instrumentsRes.status) || handleAuth(schoolsRes.status) ||
          handleAuth(academicYearsRes.status) || handleAuth(meRes.status)) return;

      // Get current user info — id, roles, and bound school (if any)
      if (meRes.ok) {
        const meData = await meRes.json();
        if (!stillCurrent()) return;
        if (meData.success && meData.data?.id) {
          setCurrentUserId(meData.data.id);
          const roles = Array.isArray(meData.data.roles) ? meData.data.roles : [];
          setIsAdmin(roles.includes('ADMIN'));
          if (meData.data.school) {
            setBoundSchool(meData.data.school);
            // Auto-bind schoolId for users who have a Teacher record
            setFormData((prev) => ({ ...prev, schoolId: String(meData.data.school.id) }));
          }
        }
      }

      // Parse responses
      if (instrumentsRes.ok) {
        const instrumentsData = await instrumentsRes.json();
        if (!stillCurrent()) return;
        const allItems: Instrument[] = instrumentsData.success && instrumentsData.data?.items
          ? instrumentsData.data.items
          : Array.isArray(instrumentsData) ? instrumentsData : [];
        setInstruments(allItems.filter((i) => i.type !== 'DERS'));
      }

      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        if (!stillCurrent()) return;
        if (schoolsData.success) {
          setSchools(schoolsData.data || []);
        } else if (Array.isArray(schoolsData)) {
          setSchools(schoolsData);
        }
      }

      if (academicYearsRes.ok) {
        const academicYearsData = await academicYearsRes.json();
        if (!stillCurrent()) return;
        const years = academicYearsData.success ? (academicYearsData.data || []) : (Array.isArray(academicYearsData) ? academicYearsData : []);

        if (years.length > 0) {
          setAcademicYears(years);
          // Set default academic year
          setFormData((prev) => ({ ...prev, academicYearId: years[0].id.toString() }));

          // Fetch terms for the first academic year
          const firstYearId = years[0].id;
          try {
            const termsRes = await fetch(`/api/academic-years/${firstYearId}/terms`, {
              headers: { 'Authorization': `Bearer ${authToken}` },
            });
            if (!stillCurrent()) return;
            if (handleAuth(termsRes.status)) return;
            if (termsRes.ok) {
              const termsData = await termsRes.json();
              if (!stillCurrent()) return;
              // Parse response — handle different envelope shapes the API
              // has historically returned (success+data, raw array, nested).
              let terms: any[] = [];
              if (termsData?.success && termsData.data !== undefined) {
                terms = Array.isArray(termsData.data) ? termsData.data : [];
              } else if (Array.isArray(termsData)) {
                terms = termsData;
              } else if (termsData?.data && Array.isArray(termsData.data)) {
                terms = termsData.data;
              }

              setTerms(terms);
            } else {
              setTerms([]);
            }
          } catch {
            /* ignore — UI will show empty terms list */
          }
        } else {
          setAcademicYears([]);
        }
      }
    } catch {
      if (stillCurrent()) setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      if (stillCurrent()) setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!token || !currentUserId) {
      setError('กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    submittingRef.current = true;
    setError('');
    setSubmitting(true);

    try {
      // Thai ป.1–3 → create the SELF (teacher) + DIRECTOR (ผอ.) pair, then open the teacher's form
      if (isThaiPair) {
        if (!targetTeacherId || !directorUserId) {
          setError('กรุณาเลือกครูที่ถูกประเมินและผู้อำนวยการผู้ประเมิน');
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
        const pairRes = await fetch('/api/evaluations/teacher-pair', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instrumentId: parseInt(formData.instrumentId, 10),
            schoolId: parseInt(formData.schoolId, 10),
            academicYearId: parseInt(formData.academicYearId, 10),
            termId: formData.termId ? parseInt(formData.termId, 10) : null,
            targetTeacherId: parseInt(targetTeacherId, 10),
            directorUserId: parseInt(directorUserId, 10),
          }),
        });
        const pairData = await pairRes.json();
        if (!pairRes.ok || !pairData.success) {
          setError(pairData.error || 'สร้างการประเมินไม่สำเร็จ');
          setSubmitting(false);
          submittingRef.current = false;
          return;
        }
        router.push(`/assessment/${pairData.data.selfSessionId}`);
        return;
      }

      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instrumentId: parseInt(formData.instrumentId, 10),
          schoolId: parseInt(formData.schoolId, 10),
          academicYearId: parseInt(formData.academicYearId, 10),
          termId: formData.termId ? parseInt(formData.termId, 10) : null,
          evaluatorId: currentUserId,
          note: formData.note || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'สร้างการประเมินไม่สำเร็จ');
        setSubmitting(false);
        submittingRef.current = false;
        return;
      }

      // Redirect to assessment form
      if (data.data?.id) {
        router.push(`/assessment/${data.data.id}`);
      } else {
        router.push('/evaluations');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสร้างการประเมิน');
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href="/evaluations"
            style={{
              padding: '0.5rem 1rem',
              background: '#667eea',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: '1rem'
            }}
          >
            ← กลับ
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
            สร้างการประเมินใหม่
          </h1>
          <p style={{ color: '#666' }}>สร้าง Evaluation Session ใหม่</p>
        </div>

        {/* Form */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                padding: '1rem',
                background: '#fee',
                color: '#c33',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                เครื่องมือประเมิน *
              </label>
              <select
                value={formData.instrumentId}
                onChange={(e) => setFormData({ ...formData, instrumentId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">เลือกเครื่องมือประเมิน</option>
                {instruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nameTh} ({inst.code})
                  </option>
                ))}
              </select>
            </div>

            {isThaiPair && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: '0.5rem',
              }}>
                <p style={{ margin: 0, marginBottom: '1rem', fontWeight: 600, color: '#5b21b6', fontSize: '0.95rem' }}>
                  แบบประเมินรายบุคคล — ระบบจะสร้าง 2 ฝั่ง: ครูประเมินตนเอง + ผอ.ประเมิน
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 500 }}>
                    ครูที่ถูกประเมิน *
                  </label>
                  <select
                    value={targetTeacherId}
                    onChange={(e) => setTargetTeacherId(e.target.value)}
                    required
                    disabled={loadingPickers || teachers.length === 0}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.5rem', fontSize: '1rem', boxSizing: 'border-box' }}
                  >
                    <option value="">
                      {loadingPickers ? 'กำลังโหลด...' : teachers.length === 0 ? 'ไม่พบครูในโรงเรียนนี้' : 'เลือกครูที่ถูกประเมิน'}
                    </option>
                    {teachers.map((t) => (
                      <option key={t.teacherId} value={t.teacherId}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: 500 }}>
                    ผู้อำนวยการผู้ประเมิน *
                  </label>
                  <select
                    value={directorUserId}
                    onChange={(e) => setDirectorUserId(e.target.value)}
                    required
                    disabled={loadingPickers || directors.length === 0}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '0.5rem', fontSize: '1rem', boxSizing: 'border-box' }}
                  >
                    <option value="">
                      {loadingPickers ? 'กำลังโหลด...' : directors.length === 0 ? 'ยังไม่มี ผอ. ผูกกับโรงเรียนนี้' : 'เลือกผู้อำนวยการ'}
                    </option>
                    {directors.map((d) => (
                      <option key={d.userId} value={d.userId}>{d.name}</option>
                    ))}
                  </select>
                  {!loadingPickers && directors.length === 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#b91c1c' }}>
                      ⚠️ ต้องมีผู้ใช้สิทธิ์ &quot;ผู้อำนวยการ&quot; (SCHOOL_LEADER) ผูกกับโรงเรียนนี้ก่อน จึงจะสร้างได้
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                โรงเรียน *
              </label>
              {boundSchool ? (
                <div
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#f5f3ff',
                    border: '1px solid #c4b5fd',
                    borderRadius: '0.5rem',
                    color: '#4c1d95',
                    fontSize: '1rem',
                    fontWeight: 500,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>🔒</span>
                  <span>
                    {boundSchool.code ? `${boundSchool.code} ` : ''}{boundSchool.nameTh}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#7c3aed', fontWeight: 400 }}>
                    ผูกกับบัญชีของคุณ
                  </span>
                </div>
              ) : isAdmin ? (
                <select
                  value={formData.schoolId}
                  onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">เลือกโรงเรียน</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.code ? `${school.code} ` : ''}{school.nameTh || school.code}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.5rem',
                    color: '#991b1b',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                >
                  ⚠️ บัญชีของคุณยังไม่ได้ผูกกับโรงเรียน — โปรดติดต่อผู้ดูแลระบบ
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                ปีการศึกษา *
              </label>
              <select
                value={formData.academicYearId}
                onChange={async (e) => {
                  const newYearId = e.target.value;
                  setFormData({ ...formData, academicYearId: newYearId, termId: '' });
                  // Tag this terms request so a faster later request can
                  // invalidate it on resolve — switching years rapidly used
                  // to leave the slower (older year's) response wining, so
                  // the term picker showed terms from the wrong year.
                  const myReqId = ++termsRequestIdRef.current;
                  if (newYearId && token) {
                    try {
                      const termsRes = await fetch(`/api/academic-years/${newYearId}/terms`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                      });
                      if (termsRequestIdRef.current !== myReqId) return; // stale
                      if (termsRes.status === 401) {
                        localStorage.removeItem('token');
                        router.push('/login');
                        return;
                      }
                      if (termsRes.ok) {
                        const termsData = await termsRes.json();
                        if (termsRequestIdRef.current !== myReqId) return;
                        let terms: any[] = [];
                        if (termsData?.success && termsData.data !== undefined) {
                          terms = Array.isArray(termsData.data) ? termsData.data : [];
                        } else if (Array.isArray(termsData)) {
                          terms = termsData;
                        } else if (termsData?.data && Array.isArray(termsData.data)) {
                          terms = termsData.data;
                        }
                        setTerms(terms);
                      } else {
                        setTerms([]);
                      }
                    } catch {
                      if (termsRequestIdRef.current === myReqId) setTerms([]);
                    }
                  } else {
                    setTerms([]);
                  }
                }}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">เลือกปีการศึกษา</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                ภาคเรียน
              </label>
              <select
                value={formData.termId}
                onChange={(e) => setFormData({ ...formData, termId: e.target.value })}
                disabled={terms.length === 0}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  backgroundColor: terms.length === 0 ? '#f5f5f5' : 'white',
                  cursor: terms.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="">
                  {terms.length === 0 ? 'ไม่มีภาคเรียนสำหรับปีการศึกษานี้' : 'เลือกภาคเรียน (ไม่บังคับ)'}
                </option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id.toString()}>
                    {term.name}
                  </option>
                ))}
              </select>
              {terms.length === 0 && formData.academicYearId && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  ⚠️ ไม่พบภาคเรียนสำหรับปีการศึกษาที่เลือก
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500'
              }}>
                หมายเหตุ
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
                placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={submitting || !formData.schoolId || (isThaiPair && (!targetTeacherId || !directorUserId))}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: submitting || !formData.schoolId || (isThaiPair && (!targetTeacherId || !directorUserId)) ? '#ccc' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: submitting || !formData.schoolId || (isThaiPair && (!targetTeacherId || !directorUserId)) ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {submitting ? 'กำลังสร้าง...' : 'สร้างการประเมิน'}
              </button>
              <Link
                href="/evaluations"
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#e5e7eb',
                  color: '#333',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: '500',
                  display: 'inline-block'
                }}
              >
                ยกเลิก
              </Link>
            </div>
          </form>
        </div>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: '#666'
        }}>
          <p style={{ margin: 0, marginBottom: '0.5rem' }}>
            <strong>หมายเหตุ:</strong> ระบบโหลดข้อมูล instruments, schools, academic years, และ terms อัตโนมัติแล้ว
          </p>
          {terms.length === 0 && formData.academicYearId && (
            <p style={{ margin: 0, color: '#ef4444' }}>
              ⚠️ <strong>คำเตือน:</strong> ไม่พบภาคเรียนสำหรับปีการศึกษาที่เลือก กรุณาสร้างภาคเรียนในระบบก่อน
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


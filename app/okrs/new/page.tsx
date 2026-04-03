// app/okrs/new/page.tsx
// Create new OKR Objective page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface School {
  id: number;
  code: string;
  nameTh: string | null;
}

interface AcademicYear {
  id: number;
  year: string;
}

export default function NewOKRPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [schools, setSchools] = useState<School[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    dimension: '',
    schoolId: '',
    academicYearId: '',
    quarter: '',
    ownerId: '',
  });

  const dimensions = [
    { value: 'Q-Leadership', label: 'Q-Leadership: ภาวะผู้นำทางวิชาการ' },
    { value: 'Q-PLC', label: 'Q-PLC: ชุมชนแห่งการเรียนรู้ทางวิชาชีพ' },
    { value: 'Q-Learning', label: 'Q-Learning: การจัดการเรียนรู้' },
    { value: 'Q-Goal', label: 'Q-Goal: เป้าหมายโรงเรียน' },
    { value: 'Q-Info', label: 'Q-Info: ระบบสารสนเทศ' },
    { value: 'Q-Network', label: 'Q-Network: เครือข่ายความร่วมมือ' },
  ];

  const quarters = [
    { value: 'Q1', label: 'Q1 (ไตรมาส 1)' },
    { value: 'Q2', label: 'Q2 (ไตรมาส 2)' },
    { value: 'Q3', label: 'Q3 (ไตรมาส 3)' },
    { value: 'Q4', label: 'Q4 (ไตรมาส 4)' },
  ];

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    fetchInitialData(storedToken);
  }, [router]);

  const fetchInitialData = async (authToken: string) => {
    try {
      const [schoolsRes, academicYearsRes, meRes] = await Promise.all([
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

      // Get current user ID
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success && meData.data?.id) {
          setCurrentUserId(meData.data.id);
          setFormData((prev) => ({ ...prev, ownerId: meData.data.id.toString() }));
        }
      }

      // Parse responses
      if (schoolsRes.ok) {
        const schoolsData = await schoolsRes.json();
        if (schoolsData.success) {
          setSchools(schoolsData.data || []);
        } else if (Array.isArray(schoolsData)) {
          setSchools(schoolsData);
        }
      }

      if (academicYearsRes.ok) {
        const academicYearsData = await academicYearsRes.json();
        const years = academicYearsData.success
          ? academicYearsData.data || []
          : Array.isArray(academicYearsData)
          ? academicYearsData
          : [];

        if (years.length > 0) {
          setAcademicYears(years);
          setFormData((prev) => ({ ...prev, academicYearId: years[0].id.toString() }));
        }
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!formData.title.trim()) {
      setError('กรุณากรอกชื่อ Objective');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        code: formData.code || null,
        title: formData.title,
        description: formData.description || null,
        dimension: formData.dimension || null,
        schoolId: formData.schoolId || null,
        academicYearId: formData.academicYearId || null,
        ownerId: formData.ownerId || null,
        quarter: formData.quarter || null,
      };

      const res = await fetch('/api/okrs/objectives', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('สร้าง Objective สำเร็จ');
        setTimeout(() => {
          if (data.data?.id) {
            router.push(`/okrs/${data.data.id}`);
          } else {
            router.push('/okrs');
          }
        }, 1000);
      } else {
        setError(data.error || 'สร้าง Objective ไม่สำเร็จ');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสร้าง Objective');
      console.error(err);
    } finally {
      setSubmitting(false);
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
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href="/okrs"
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
            สร้าง OKR Objective ใหม่
          </h1>
          <p style={{ color: '#666' }}>เพิ่ม Objective ใหม่สำหรับการจัดการ OKR</p>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              background: '#fee',
              color: '#c33',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '1rem',
              background: '#d1fae5',
              color: '#065f46',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {/* Code */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              รหัส Objective (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="เช่น O-Q-LEAD-2568"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Title (Required) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              ชื่อ Objective <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="เช่น ขับเคลื่อนโรงเรียนด้วยภาวะผู้นำทางวิชาการ..."
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              คำอธิบาย (ไม่บังคับ)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="อธิบายรายละเอียดเพิ่มเติม..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Dimension */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              มิติ (Dimension) (ไม่บังคับ)
            </label>
            <select
              value={formData.dimension}
              onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">เลือกมิติ</option>
              {dimensions.map((dim) => (
                <option key={dim.value} value={dim.value}>
                  {dim.label}
                </option>
              ))}
            </select>
          </div>

          {/* School */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              โรงเรียน (ไม่บังคับ)
            </label>
            <select
              value={formData.schoolId}
              onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">เลือกโรงเรียน</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id.toString()}>
                  {school.nameTh || school.code}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              ปีการศึกษา (ไม่บังคับ)
            </label>
            <select
              value={formData.academicYearId}
              onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">เลือกปีการศึกษา</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id.toString()}>
                  {year.year}
                </option>
              ))}
            </select>
          </div>

          {/* Quarter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
              ไตรมาส (ไม่บังคับ)
            </label>
            <select
              value={formData.quarter}
              onChange={(e) => setFormData({ ...formData, quarter: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">เลือกไตรมาส</option>
              {quarters.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <Link
              href="/okrs"
              style={{
                padding: '0.75rem 1.5rem',
                background: '#e5e7eb',
                color: '#374151',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                background: submitting ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {submitting ? 'กำลังสร้าง...' : 'สร้าง Objective'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


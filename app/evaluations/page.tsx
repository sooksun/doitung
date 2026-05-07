// app/evaluations/page.tsx
// Evaluations CRUD page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Evaluation {
  id: number;
  instrumentId: number;
  schoolId: number;
  academicYearId: number;
  termId: number | null;
  evaluatorId: number;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  instrument?: {
    nameTh: string;
    type: string;
  };
  school?: {
    nameTh: string | null;
  };
  evaluator?: {
    id: number;
    name: string;
    email: string | null;
  };
}

export default function EvaluationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meId, setMeId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    // Identify the current user so we can decide whose row gets the edit button.
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j.data) {
          setMeId(j.data.id);
          setIsAdmin(Array.isArray(j.data.roles) && j.data.roles.includes('ADMIN'));
        }
      })
      .catch(() => {});
    fetchEvaluations(storedToken);
  }, [router]);

  const fetchEvaluations = async (authToken: string) => {
    try {
      const res = await fetch('/api/evaluations', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch evaluations');
      }

      const data = await res.json();
      if (data.success && data.data?.items) {
        setEvaluations(data.data.items);
      } else if (Array.isArray(data)) {
        setEvaluations(data);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (id: number) => {
    if (!token) return;
    const ok = confirm(
      `ต้องการเคลียร์รายการประเมิน #${id} ใช่หรือไม่?\n\nรายการจะถูกซ่อนจากหน้านี้ทันที\nคะแนนและความคิดเห็นยังถูกเก็บไว้ในระบบ (สามารถกู้คืนได้โดย admin)`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/evaluations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'เคลียร์ไม่สำเร็จ');
        return;
      }
      // Optimistic remove: drop the row immediately so the UI feels responsive
      setEvaluations((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('เกิดข้อผิดพลาด');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'DRAFT': { bg: '#fef3c7', text: '#92400e' },
      'SUBMITTED': { bg: '#d1fae5', text: '#065f46' },
      'REVIEWED': { bg: '#dbeafe', text: '#1e40af' },
      'ARCHIVED': { bg: '#e5e7eb', text: '#374151' },
    };
    return colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DRAFT': 'ร่าง',
      'SUBMITTED': 'ส่งแล้ว',
      'REVIEWED': 'ตรวจแล้ว',
      'ARCHIVED': 'เก็บถาวร',
    };
    return labels[status] || status;
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
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              ✅ การประเมิน
            </h1>
            <p style={{ color: '#666' }}>จัดการ Evaluation Sessions</p>
          </div>
          <div>
            <Link
              href="/evaluations/new"
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                marginRight: '0.5rem'
              }}
            >
              + สร้างใหม่
            </Link>
            <Link
              href="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none'
              }}
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            background: '#fee',
            color: '#c33',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Evaluations Table */}
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>เครื่องมือ</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>โรงเรียน</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>ผู้กรอกแบบประเมิน</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>สถานะ</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>วันที่สร้าง</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((evaluation) => {
                const statusColor = getStatusColor(evaluation.status);
                return (
                  <tr key={evaluation.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', color: '#666' }}>#{evaluation.id}</td>
                    <td style={{ padding: '1rem', color: '#333', fontWeight: '500' }}>
                      {evaluation.instrument?.nameTh || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', color: '#666' }}>
                      {evaluation.school?.nameTh || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', color: '#333', fontSize: '0.9rem' }}>
                      {evaluation.evaluator?.name || '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}>
                        {getStatusLabel(evaluation.status)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#666', fontSize: '0.875rem' }}>
                      {new Date(evaluation.createdAt).toLocaleDateString('th-TH')}
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {evaluation.status === 'DRAFT' && (meId === evaluation.evaluatorId || isAdmin) && (
                        <Link
                          href={`/assessment/${evaluation.id}`}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#7c3aed',
                            color: 'white',
                            borderRadius: '0.25rem',
                            textDecoration: 'none',
                            fontSize: '0.875rem'
                          }}
                        >
                          กรอกแบบประเมิน
                        </Link>
                      )}
                      <Link
                        href={`/evaluations/${evaluation.id}`}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '0.25rem',
                          textDecoration: 'none',
                          fontSize: '0.875rem'
                        }}
                      >
                        ดูรายละเอียด
                      </Link>
                      {(meId === evaluation.evaluatorId || isAdmin) && evaluation.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleClear(evaluation.id)}
                          title="ซ่อนรายการนี้ (Soft delete — ข้อมูลยังอยู่ในระบบ)"
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          🗑️ เคลียร์
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {evaluations.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              ไม่พบข้อมูลการประเมิน
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


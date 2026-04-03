// app/okrs/page.tsx
// OKRs CRUD page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OKRObjective {
  id: number;
  code: string | null;
  title: string;
  description: string | null;
  dimension: string | null;
  status: string;
  progress?: number;
  keyResultsCount?: number;
}

export default function OKRsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<OKRObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    fetchOKRs(storedToken);
  }, [router]);

  const fetchOKRs = async (authToken: string) => {
    try {
      const res = await fetch('/api/okrs/objectives', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch OKRs');
      }

      const data = await res.json();
      if (data.success && data.data?.items) {
        setObjectives(data.data.items);
      } else if (Array.isArray(data)) {
        setObjectives(data);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'DRAFT': { bg: '#fef3c7', text: '#92400e' },
      'ACTIVE': { bg: '#d1fae5', text: '#065f46' },
      'COMPLETED': { bg: '#dbeafe', text: '#1e40af' },
      'ARCHIVED': { bg: '#e5e7eb', text: '#374151' },
    };
    return colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DRAFT': 'ร่าง',
      'ACTIVE': 'ใช้งาน',
      'COMPLETED': 'เสร็จสิ้น',
      'ARCHIVED': 'เก็บถาวร',
    };
    return labels[status] || status;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return '#10b981';
    if (progress >= 70) return '#f59e0b';
    return '#ef4444';
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
              🎯 OKRs
            </h1>
            <p style={{ color: '#666' }}>จัดการ Objectives, Key Results และ Actions</p>
          </div>
          <div>
            <Link
              href="/okrs/new"
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                marginRight: '0.5rem'
              }}
            >
              + สร้าง Objective ใหม่
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

        {/* OKRs Grid */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {objectives.map((obj) => {
            const statusColor = getStatusColor(obj.status);
            const progress = obj.progress || 0;
            const progressColor = getProgressColor(progress);

            return (
              <div
                key={obj.id}
                style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
                        {obj.title}
                      </h2>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem'
                      }}>
                        {getStatusLabel(obj.status)}
                      </span>
                    </div>
                    {obj.description && (
                      <p style={{ color: '#666', marginBottom: '0.5rem' }}>{obj.description}</p>
                    )}
                    {obj.dimension && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}>
                        {obj.dimension}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/okrs/${obj.id}`}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#667eea',
                      color: 'white',
                      borderRadius: '0.5rem',
                      textDecoration: 'none',
                      fontSize: '0.875rem'
                    }}
                  >
                    ดูรายละเอียด
                  </Link>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#666' }}>ความก้าวหน้า</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: progressColor }}>
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        width: `${Math.min(progress, 100)}%`,
                        height: '100%',
                        background: progressColor,
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                  Key Results: {obj.keyResultsCount || 0}
                </div>
              </div>
            );
          })}
        </div>

        {objectives.length === 0 && (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            color: '#666'
          }}>
            ไม่พบข้อมูล OKRs
          </div>
        )}
      </div>
    </div>
  );
}


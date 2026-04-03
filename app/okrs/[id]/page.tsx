// app/okrs/[id]/page.tsx
// OKR detail page with Key Results and Actions

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface OKRKeyResult {
  id: number;
  title: string;
  description: string | null;
  baseline: number | null;
  target: number | null;
  current: number | null;
  progress?: number;
  status?: 'green' | 'yellow' | 'red';
  actionsCount?: number;
}

interface OKRObjective {
  id: number;
  title: string;
  description: string | null;
  dimension: string | null;
  status: string;
  progress?: number;
  keyResults: OKRKeyResult[];
}

export default function OKRDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [objective, setObjective] = useState<OKRObjective | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    if (id) {
      fetchOKR(storedToken, parseInt(id));
    }
  }, [id, router]);

  const fetchOKR = async (authToken: string, objectiveId: number) => {
    try {
      const res = await fetch(`/api/okrs/objectives/${objectiveId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch OKR');
      }

      const data = await res.json();
      const objectiveData = data.success ? data.data : data;
      
      // Ensure keyResults is always an array
      if (objectiveData && !Array.isArray(objectiveData.keyResults)) {
        objectiveData.keyResults = [];
      }
      
      setObjective(objectiveData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (status?: string) => {
    if (status === 'green') return '#10b981';
    if (status === 'yellow') return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;
  }

  if (!objective) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>ไม่พบข้อมูล</div>;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
            {objective.title}
          </h1>
          {objective.description && (
            <p style={{ color: '#666', marginBottom: '0.5rem' }}>{objective.description}</p>
          )}
          {objective.dimension && (
            <span style={{
              padding: '0.25rem 0.5rem',
              background: '#e0e7ff',
              color: '#4338ca',
              borderRadius: '0.25rem',
              fontSize: '0.875rem'
            }}>
              {objective.dimension}
            </span>
          )}
        </div>

        {/* Overall Progress */}
        {objective.progress !== undefined && (
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
              ความก้าวหน้ารวม
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#666' }}>Progress</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: getProgressColor(objective.progress >= 90 ? 'green' : objective.progress >= 70 ? 'yellow' : 'red') }}>
                {objective.progress.toFixed(1)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: '#e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  width: `${Math.min(objective.progress, 100)}%`,
                  height: '100%',
                  background: getProgressColor(objective.progress >= 90 ? 'green' : objective.progress >= 70 ? 'yellow' : 'red'),
                  transition: 'width 0.3s'
                }}
              />
            </div>
          </div>
        )}

        {/* Key Results */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
            Key Results ({objective.keyResults && Array.isArray(objective.keyResults) ? objective.keyResults.length : 0})
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {objective.keyResults && Array.isArray(objective.keyResults) && objective.keyResults.length > 0 ? (
              objective.keyResults.map((kr) => (
              <div
                key={kr.id}
                style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>
                      {kr.title}
                    </h3>
                    {kr.description && (
                      <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{kr.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#666' }}>
                      {kr.baseline !== null && <span>Baseline: {kr.baseline}</span>}
                      {kr.target !== null && <span>Target: {kr.target}</span>}
                      {kr.current !== null && <span>Current: {kr.current}</span>}
                    </div>
                  </div>
                  <Link
                    href={`/okrs/kr/${kr.id}`}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#667eea',
                      color: 'white',
                      borderRadius: '0.5rem',
                      textDecoration: 'none',
                      fontSize: '0.875rem'
                    }}
                  >
                    ดู Actions
                  </Link>
                </div>

                {kr.progress !== undefined && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#666' }}>Progress</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: getProgressColor(kr.status) }}>
                        {kr.progress.toFixed(1)}%
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
                          width: `${Math.min(kr.progress, 100)}%`,
                          height: '100%',
                          background: getProgressColor(kr.status),
                          transition: 'width 0.3s'
                        }}
                      />
                    </div>
                  </div>
                )}

                {kr.actionsCount !== undefined && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                    Actions: {kr.actionsCount}
                  </div>
                )}
              </div>
              ))
            ) : (
              <div style={{
                padding: '3rem',
                textAlign: 'center',
                background: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                color: '#666'
              }}>
                ยังไม่มี Key Results สำหรับ Objective นี้
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


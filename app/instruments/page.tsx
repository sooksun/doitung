// app/instruments/page.tsx
// Instruments CRUD page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Instrument {
  id: number;
  code: string;
  nameTh: string;
  nameEn: string | null;
  type: string;
  isActive: boolean;
  sectionsCount?: number;
  indicatorsCount?: number;
}

export default function InstrumentsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    fetchInstruments(storedToken);
  }, [router]);

  const fetchInstruments = async (authToken: string) => {
    try {
      const res = await fetch('/api/instruments', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch instruments');
      }

      const data = await res.json();
      if (data.success && data.data?.items) {
        setInstruments(data.data.items);
      } else if (Array.isArray(data)) {
        setInstruments(data);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'DERS': 'DERS',
      'THAI_P1_3': 'ภาษาไทย ป.1-3',
      'Q_MODEL': 'Q-Model',
    };
    return labels[type] || type;
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
              📋 เครื่องมือประเมิน
            </h1>
            <p style={{ color: '#666' }}>จัดการ Instruments (DERS, Thai P.1-3, Q-Model)</p>
          </div>
          <div>
            <Link
              href="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                marginRight: '0.5rem'
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

        {/* Instruments Table */}
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>รหัส</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>ชื่อ (ไทย)</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>ประเภท</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Sections</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>Indicators</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>สถานะ</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((inst) => (
                <tr key={inst.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', color: '#666' }}>{inst.code || '-'}</td>
                  <td style={{ padding: '1rem', color: '#333', fontWeight: '500' }}>{inst.nameTh}</td>
                  <td style={{ padding: '1rem', color: '#666' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: '#e0e7ff',
                      color: '#4338ca',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}>
                      {getTypeLabel(inst.type)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#666' }}>{inst.sectionsCount || 0}</td>
                  <td style={{ padding: '1rem', color: '#666' }}>{inst.indicatorsCount || 0}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: inst.isActive ? '#d1fae5' : '#fee2e2',
                      color: inst.isActive ? '#065f46' : '#991b1b',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem'
                    }}>
                      {inst.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <Link
                      href={`/instruments/${inst.id}`}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {instruments.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              ไม่พบข้อมูล Instruments
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// app/instruments/page.tsx
// Instruments page. UI redesigned to the TSQMn DE kit (card grid);
// data fetching / auth unchanged.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, Card, Badge, DeIcon, type DeIconName } from '@/app/components/de';

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

const TYPE_LABEL: Record<string, string> = {
  DERS: 'DERS',
  THAI_P1_3: 'ภาษาไทย ป.1-3',
  Q_MODEL: 'Q-Model',
};
const getTypeLabel = (type: string) => TYPE_LABEL[type] || type;
const typeIcon = (type: string): DeIconName =>
  type === 'Q_MODEL' ? 'target' : type === 'THAI_P1_3' ? 'book' : type === 'DERS' ? 'clipboard' : 'tool';

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

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 16 }}>
        <span style={{ width: 34, height: 34, border: '3px solid var(--de-border-strong)', borderTopColor: 'var(--de-primary)', borderRadius: '50%', animation: 'de-spin 0.7s linear infinite' }} />
        <p style={{ color: 'var(--de-text-secondary)' }}>กำลังโหลดข้อมูล…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="เครื่องมือประเมิน" subtitle="เครื่องมือมาตรฐานสำหรับการประเมินคุณภาพการศึกษา" />

      {error ? (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'var(--de-danger-soft)', color: 'var(--de-danger)', fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <DeIcon name="alert" size={16} /> {error}
        </div>
      ) : null}

      {instruments.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center', color: 'var(--de-text-tertiary)' }}>ไม่พบข้อมูลเครื่องมือ</Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
          {instruments.map((ins) => {
            const accent = ins.type === 'Q_MODEL';
            return (
              <Card
                key={ins.id}
                hover
                onClick={() => router.push(`/instruments/${ins.id}`)}
                style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 18, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)', background: accent ? 'linear-gradient(135deg,var(--de-purple-100),var(--de-blue-100))' : 'var(--de-accent-soft)', color: accent ? 'var(--de-purple-600)' : 'var(--de-accent)', display: 'grid', placeItems: 'center' }}>
                    <DeIcon name={typeIcon(ins.type)} size={26} />
                  </span>
                  <Badge tone={ins.isActive ? 'success' : 'neutral'} dot>{ins.isActive ? 'เปิดใช้งาน' : 'ปิด'}</Badge>
                </div>
                <div>
                  <h3 style={{ fontSize: 19, fontWeight: 600 }}>{ins.nameTh}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--de-text-secondary)', marginTop: 4 }}>
                    {getTypeLabel(ins.type)}{ins.code ? ` · ${ins.code}` : ''}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, borderTop: '1px solid var(--de-border)', paddingTop: 16 }}>
                  {([[ins.indicatorsCount ?? 0, 'ตัวชี้วัด'], [ins.sectionsCount ?? 0, 'หมวด']] as const).map(([v, l]) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--de-primary)' }}>{v}</div>
                      <div style={{ fontSize: 12, color: 'var(--de-text-secondary)' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, color: 'var(--de-primary)', fontSize: 14, fontWeight: 500 }}>
                  ดูรายละเอียด <DeIcon name="arrowRight" size={16} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

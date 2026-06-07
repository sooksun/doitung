// app/live-dashboard/page.tsx
// Live Real-Time Display Dashboard — DE Design v2 (PRD §3.1, prototype: de-soar/project/Live Dashboard.html)

'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/app/components/ui';
import LiveSpiderChart from './components/LiveSpiderChart';
import AnimatedNumber from './components/AnimatedNumber';
import ScopeSelector from './components/ScopeSelector';
import ThaiP13DashboardView from '../dashboard/thai-p13/ThaiP13DashboardView';
import './dashboard.css';

const POLL_INTERVAL = 5000;
type SectionKey = 'Q-Leadership' | 'Q-PLC' | 'Q-Learning' | 'Q-Students';

interface LiveData {
  lastUpdated: string;
  scopeLabel: string;
  participatingSchools: number;
  totalSessions: number;
  totalResponses: number;
  activeEvaluators: number;
  totalEvaluators: number;
  completionRate: number;
  overallQualityIndex: number;
  spiderData: Array<{ dimension: string; labelTh: string; current: number; target: number }>;
  dimensionScores: Array<{
    dimension: string;
    labelTh: string;
    percent: number;
    status: 'green' | 'yellow' | 'red';
    avgScore: number;
    maxScore: number;
  }>;
  indicatorHealth: Array<{
    code: string | null;
    nameTh: string;
    score: number | null;
    max: number;
    progress: number | null;
    sectionKey: string;
    sectionLabelTh: string;
  }>;
}

interface School { id: number; nameTh: string; }
interface Network { id: number; name: string; }
interface AcademicYear { id: number; year: string; }
interface Term { id: number; termNumber: number; academicYearId: number; }

const SECTION_TABS: Array<{ key: SectionKey; short: string; full: string }> = [
  { key: 'Q-Leadership', short: 'Leadership', full: 'Q-Leadership · ผู้บริหาร' },
  { key: 'Q-PLC',        short: 'PLC',        full: 'Q-PLC · ชุมชนแห่งการเรียนรู้' },
  { key: 'Q-Learning',   short: 'Learning',   full: 'Q-Learning · การจัดการเรียนรู้' },
  { key: 'Q-Students',   short: 'Students',   full: 'Q-Students · ด้านนักเรียน' },
];

// percent on 1–5 scale → ((v - 1) / 4) * 100
function score5ToPct(v: number): number {
  if (!isFinite(v) || v <= 1) return 0;
  return Math.max(0, Math.min(100, ((v - 1) / 4) * 100));
}

export default function LiveDashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [token, setToken] = useState<string | null>(null);

  const [scope, setScope] = useState<'school' | 'network' | 'district'>('district');
  const [schoolId, setSchoolId] = useState<number | undefined>();
  const [networkId, setNetworkId] = useState<number | undefined>();
  const [academicYearId, setAcademicYearId] = useState<number | undefined>();
  const [termId, setTermId] = useState<number | undefined>();

  // Per-user scope lock: school-bound users are locked to their own school.
  const [lockedSchool, setLockedSchool] = useState<{ id: number; nameTh: string } | null>(null);
  const [ready, setReady] = useState(false);

  const [schools, setSchools] = useState<School[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [activeTab, setActiveTab] = useState<SectionKey>('Q-Leadership');
  const [view, setView] = useState<'qmodel' | 'thai'>('qmodel');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastFetchTime = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auth + per-user scope lock (school-bound users → their own school only).
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!t) {
      router.push('/login');
      return;
    }
    setToken(t);
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } });
        if (meRes.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
        const me = (await meRes.json())?.data;
        const admin = Array.isArray(me?.roles) && me.roles.includes('ADMIN');
        if (!admin && me?.school?.id) {
          // school-bound (LEADER/SCHOOL_ADMIN/TEACHER) → lock to own school
          setLockedSchool({ id: me.school.id, nameTh: me.school.nameTh || me.school.code || `โรงเรียน #${me.school.id}` });
          setScope('school');
          setSchoolId(me.school.id);
        }
        // admin or non-school user (SUPERVISOR) → no lock (backend also enforces)
      } catch {
        /* ignore — the API enforces scoping regardless */
      } finally {
        setReady(true);
      }
    })();
  }, [router]);

  // Reference data
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/schools?isActive=true', { headers }).then((r) => r.json()),
      fetch('/api/networks', { headers }).then((r) => r.json()),
      fetch('/api/academic-years', { headers }).then((r) => r.json()),
      fetch('/api/terms', { headers }).then((r) => r.json()),
    ]).then(([s, n, y, te]) => {
      if (s.success) setSchools(s.data?.schools || s.data || []);
      if (n.success) setNetworks(n.data?.networks || n.data || []);
      if (y.success) setAcademicYears(y.data?.academicYears || y.data || []);
      if (te.success) setTerms(te.data?.terms || te.data || []);
    }).catch(() => {});
  }, [token]);

  // Fetch live data
  const fetchLiveData = useCallback(async (authToken: string) => {
    try {
      const params = new URLSearchParams({ scope });
      if (scope === 'school' && schoolId) params.set('schoolId', String(schoolId));
      if (scope === 'network' && networkId) params.set('networkId', String(networkId));
      if (academicYearId) params.set('academicYearId', String(academicYearId));
      if (termId) params.set('termId', String(termId));

      const res = await fetch(`/api/live-dashboard?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const json = await res.json();
      if (json.success) {
        setLiveData(json.data);
        lastFetchTime.current = Date.now();
        setSecondsAgo(0);
      }
    } catch {
      /* keep last data */
    } finally {
      setLoading(false);
    }
  }, [scope, schoolId, networkId, academicYearId, termId, router]);

  // Polling (only for the Q-Model live view; the THAI tab is a static summary)
  useEffect(() => {
    if (!token || !ready || view !== 'qmodel') return;
    fetchLiveData(token);
    if (!paused) {
      intervalRef.current = setInterval(() => fetchLiveData(token), POLL_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, ready, paused, view, fetchLiveData]);

  // "seconds ago" ticker
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchTime.current) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Fullscreen sync
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Per-section indicator counts + filtered list
  const indicatorsBySection = useMemo(() => {
    const map: Record<SectionKey, LiveData['indicatorHealth']> = {
      'Q-Leadership': [],
      'Q-PLC': [],
      'Q-Learning': [],
      'Q-Students': [],
    };
    (liveData?.indicatorHealth ?? []).forEach((ind) => {
      if (ind.sectionKey in map) {
        map[ind.sectionKey as SectionKey].push(ind);
      }
    });
    return map;
  }, [liveData]);

  const activeIndicators = indicatorsBySection[activeTab];
  const activeMeta = SECTION_TABS.find((t) => t.key === activeTab);

  // Dimension card data (target + current both as % on 1–5)
  const dimensionCards = useMemo(() => {
    const dims = liveData?.dimensionScores ?? [];
    const spider = liveData?.spiderData ?? [];
    return dims.map((d) => {
      const sp = spider.find((s) => s.dimension === d.dimension);
      const target = sp?.target ?? 0;
      const current = sp?.current ?? d.avgScore ?? 0;
      const targetPct = score5ToPct(target);
      const currentPct = d.percent;
      const gap = Math.max(0, target - current);
      const indCount = indicatorsBySection[d.dimension as SectionKey]?.length ?? 0;
      return {
        key: d.dimension,
        labelTh: d.labelTh,
        target,
        current,
        targetPct,
        currentPct,
        gap,
        status: d.status,
        indCount,
      };
    });
  }, [liveData, indicatorsBySection]);

  // Aggregate target / current / gap from spider
  const overall = useMemo(() => {
    const spider = liveData?.spiderData ?? [];
    if (spider.length === 0) return { target: 0, current: 0, gap: 0 };
    const target = spider.reduce((s, d) => s + d.target, 0) / spider.length;
    const current = spider.reduce((s, d) => s + d.current, 0) / spider.length;
    return {
      target: Math.round(target * 100) / 100,
      current: Math.round(current * 100) / 100,
      gap: Math.max(0, Math.round((target - current) * 100) / 100),
    };
  }, [liveData]);

  return (
    <div className="ld-embed" data-de-theme={theme} data-paused={paused ? 'true' : 'false'}>
      {/* ===== PAGE HEAD + LIVE CONTROLS ===== */}
      <div className="ld-head-row">
        <div className="ld-page-head">
          <span className="ld-page-eyebrow">Live Dashboard</span>
          <h1 className="ld-page-title">{view === 'thai' ? 'แบบประเมินภาษาไทย ป.1–3' : 'ภาพรวมคุณภาพโรงเรียน'}</h1>
          <p className="ld-page-sub">
            {view === 'thai'
              ? 'สรุปผลแบบประเมินตนเองการจัดการเรียนการสอน · เจาะลึกจากภาพรวมสู่รายบุคคล'
              : <>อัปเดต {paused ? '(หยุดชั่วคราว)' : `${secondsAgo}s ที่แล้ว`} · ขอบเขต <strong>{liveData?.scopeLabel || '—'}</strong></>}
          </p>
        </div>

        <div className="ld-controls">
          {view === 'qmodel' ? (
            <>
              <span className="ld-live-pill">
                <span className="ld-dot" aria-hidden="true" />
                <span>Live · ปรับทุก 5 วินาที</span>
              </span>
              <button
                className="ld-icon-btn"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'เล่น polling' : 'หยุด polling'}
                title={paused ? 'Resume' : 'Pause'}
              >
                {paused ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="6,4 20,12 6,20" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                )}
              </button>
            </>
          ) : null}
          <button
            className="ld-icon-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'ออก Fullscreen' : 'Fullscreen'}
            title="Fullscreen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9V4h5" />
              <path d="M20 9V4h-5" />
              <path d="M4 15v5h5" />
              <path d="M20 15v5h-5" />
            </svg>
          </button>
        </div>
      </div>

        {/* ===== VIEW TABS ===== */}
        <div className="ld-view-tabs" role="tablist" aria-label="เลือกแบบประเมิน">
          <button role="tab" aria-selected={view === 'qmodel'} className={`ld-view-tab${view === 'qmodel' ? ' active' : ''}`} onClick={() => setView('qmodel')}>
            Q-Model (เรียลไทม์)
          </button>
          <button role="tab" aria-selected={view === 'thai'} className={`ld-view-tab${view === 'thai' ? ' active' : ''}`} onClick={() => setView('thai')}>
            ภาษาไทย ป.1–3
          </button>
        </div>

        {view === 'thai' ? (
          <div className="ld-thai-panel">
            <ThaiP13DashboardView dark={theme === 'dark'} />
          </div>
        ) : (
        <>
        {/* ===== FILTER BAR ===== */}
        <div className="ld-filterbar" role="toolbar" aria-label="ตัวกรอง">
          <ScopeSelector
            scope={scope}
            schoolId={schoolId}
            networkId={networkId}
            academicYearId={academicYearId}
            termId={termId}
            schools={schools}
            networks={networks}
            academicYears={academicYears}
            terms={terms}
            locked={!!lockedSchool}
            lockedLabel={lockedSchool?.nameTh}
            onScopeChange={(s) => {
              setScope(s);
              setSchoolId(undefined);
              setNetworkId(undefined);
            }}
            onSchoolChange={setSchoolId}
            onNetworkChange={setNetworkId}
            onYearChange={setAcademicYearId}
            onTermChange={setTermId}
          />
        </div>

        {loading ? (
          <div className="ld-loading">
            <div className="ld-loading-inner">
              <div className="ld-spinner" aria-hidden="true" />
              <div>กำลังโหลดข้อมูล…</div>
            </div>
          </div>
        ) : (
          <div className="ld-main">
            {/* ===== LEFT — KPI stack ===== */}
            <aside className="ld-kpi-stack" aria-label="สรุปตัวเลขสำคัญ">
              <KpiCard label="อัตราความสำเร็จ">
                <div className="ld-kpi-value" style={{ color: 'var(--de-success-500)' }}>
                  <AnimatedNumber value={liveData?.completionRate ?? 0} suffix="%" style={{ display: 'inline' }} />
                </div>
                <div className="ld-kpi-meta">
                  <span>ส่งครบ {liveData?.totalSessions ?? 0} รอบ</span>
                </div>
              </KpiCard>

              <KpiCard label="ดัชนีคุณภาพโดยรวม">
                <div className="ld-kpi-value" style={{ color: 'var(--de-brand-400)' }}>
                  <AnimatedNumber value={liveData?.overallQualityIndex ?? 0} suffix="%" style={{ display: 'inline' }} />
                </div>
                <div className="ld-kpi-meta">
                  <span>เป้าหมาย {overall.target.toFixed(2)} · เป็นอยู่ {overall.current.toFixed(2)}</span>
                </div>
              </KpiCard>

              <KpiCard label="ครูที่กำลังประเมิน">
                <div className="ld-kpi-value ld-kpi-value-sm" style={{ color: 'var(--de-warning-500)' }}>
                  <AnimatedNumber value={liveData?.activeEvaluators ?? 0} style={{ display: 'inline' }} />
                  <span className="ld-kpi-suffix">คน</span>
                </div>
                <div className="ld-kpi-meta">
                  <span>ใน 1 ชั่วโมงนี้</span>
                </div>
              </KpiCard>

              <KpiCard label="ครูที่ประเมินทั้งหมด">
                <div className="ld-kpi-value ld-kpi-value-sm" style={{ color: 'var(--de-accent-500)' }}>
                  <AnimatedNumber value={liveData?.totalEvaluators ?? 0} style={{ display: 'inline' }} />
                  <span className="ld-kpi-suffix">คน</span>
                </div>
                <div className="ld-kpi-meta">
                  <span>โรงเรียน {liveData?.participatingSchools ?? 0} แห่ง</span>
                </div>
              </KpiCard>

              <KpiCard label="รายการประเมินทั้งหมด">
                <div className="ld-kpi-value ld-kpi-value-sm" style={{ color: 'var(--de-info-500)' }}>
                  <AnimatedNumber value={liveData?.totalResponses ?? 0} style={{ display: 'inline' }} />
                </div>
                <div className="ld-kpi-meta">
                  <span>ข้อความที่บันทึก</span>
                </div>
              </KpiCard>
            </aside>

            {/* ===== CENTER ===== */}
            <section className="ld-col-center">
              {/* Dimension grid */}
              <div className="ld-dim-grid">
                {dimensionCards.map((d) => (
                  <div key={d.key} className="ld-dim-card">
                    <span className="ld-dim-name">
                      <strong>{d.labelTh}</strong> · {d.indCount} ตัวชี้วัด
                    </span>
                    <div className="ld-dim-scores">
                      <div className="ld-dim-score">
                        <span className="ld-dim-score-num blue">{d.target.toFixed(2)}</span>
                        <span className="ld-dim-score-cap">พึงประสงค์</span>
                      </div>
                      <div className="ld-dim-score">
                        <span className="ld-dim-score-num violet">{d.current.toFixed(2)}</span>
                        <span className="ld-dim-score-cap">เป็นอยู่</span>
                      </div>
                    </div>
                    <div className="ld-dim-bars">
                      <div className="ld-dim-bar">
                        <div className="ld-dim-bar-fill blue" style={{ width: `${d.targetPct}%` }} />
                      </div>
                      <div className="ld-dim-bar">
                        <div className="ld-dim-bar-fill violet" style={{ width: `${d.currentPct}%` }} />
                      </div>
                    </div>
                    <span className={`ld-dim-meta${d.gap >= 0.6 ? ' warn' : ''}`}>
                      Gap {d.gap.toFixed(2)} ·{' '}
                      {d.status === 'green' ? 'พัฒนาเชิงบวก' : d.status === 'yellow' ? 'เฝ้าระวัง' : 'ต้องเร่งพัฒนา'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Spider chart */}
              <div className="ld-card">
                <h2 className="ld-card-title">
                  <span>มิติคุณภาพ — Q-Model</span>
                  <span className="ld-card-subtle">เปรียบเทียบ พึงประสงค์ vs เป็นอยู่</span>
                </h2>
                <div className="ld-spider-card">
                  <div className="ld-spider-host">
                    <LiveSpiderChart data={liveData?.spiderData ?? []} height={420} dark={theme === 'dark'} />
                  </div>
                  <div className="ld-legend" aria-label="คำอธิบายสี">
                    <div className="ld-legend-item">
                      <span className="ld-legend-swatch blue" aria-hidden="true" />
                      <span className="ld-legend-name">
                        คะแนนพึงประสงค์
                        <small>เป้าหมายตามมาตรฐาน</small>
                      </span>
                      <span className="ld-legend-val">{overall.target.toFixed(2)}</span>
                    </div>
                    <div className="ld-legend-item">
                      <span className="ld-legend-swatch violet" aria-hidden="true" />
                      <span className="ld-legend-name">
                        คะแนนเป็นอยู่
                        <small>สภาพที่ประเมินจริง</small>
                      </span>
                      <span className="ld-legend-val">{overall.current.toFixed(2)}</span>
                    </div>
                    <div className="ld-legend-item warn">
                      <span className="ld-legend-swatch warn" aria-hidden="true" />
                      <span className="ld-legend-name">
                        ช่องว่างเฉลี่ย
                        <small>พึงประสงค์ − เป็นอยู่</small>
                      </span>
                      <span className="ld-legend-val warn">{overall.gap.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== RIGHT — indicator section tabs ===== */}
            <aside className="ld-col-right" aria-label="ตัวชี้วัดรายข้อ">
              <div className="ld-card ld-card-glass">
                <h2 className="ld-card-title">
                  <span>ตัวชี้วัดรายข้อ</span>
                  <span className="ld-card-subtle">{activeMeta?.full}</span>
                </h2>

                <div className="ld-ind-tabs" role="tablist">
                  {SECTION_TABS.map((t) => (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={t.key === activeTab}
                      onClick={() => setActiveTab(t.key)}
                      className="ld-ind-tab"
                      title={t.full}
                    >
                      <span>{t.short}</span>
                      <span className="ld-count">{indicatorsBySection[t.key]?.length ?? 0}</span>
                    </button>
                  ))}
                </div>

                <div className="ld-ind-list">
                  {activeIndicators.length === 0 ? (
                    <div className="ld-ind-empty">ไม่มีตัวชี้วัดในมิตินี้</div>
                  ) : (
                    activeIndicators.map((ind, idx) => {
                      const hasData = ind.score !== null && ind.progress !== null;
                      return (
                        <div
                          key={`${ind.sectionKey}-${ind.code ?? idx}`}
                          className={`ld-ind-row${hasData ? '' : ' empty'}`}
                        >
                          <span className="ld-ind-code">{ind.code ?? '—'}</span>
                          <span className="ld-ind-text">{ind.nameTh}</span>
                          <span className={`ld-ind-score${hasData ? '' : ' empty'}`}>
                            {hasData ? `${ind.score?.toFixed(2)}/${ind.max}` : '—'}
                          </span>
                          <div className="ld-ind-bar">
                            {hasData && (
                              <div
                                className="ld-ind-bar-fill"
                                style={{ width: `${Math.max(0, Math.min(100, ind.progress ?? 0))}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
        </>
        )}

        <footer className="ld-footer">
          {view === 'thai'
            ? 'DE Dashboard · แบบประเมินภาษาไทย ป.1–3 · ครู (self) · ผอ. (director) · ค่าเป้าหมาย'
            : `DE Live Dashboard · Q-Model 4 มิติ · ปรับข้อมูลทุก ${POLL_INTERVAL / 1000} วินาที`}
        </footer>
    </div>
  );
}

function KpiCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ld-kpi" aria-live="polite">
      <span className="ld-kpi-label">{label}</span>
      {children}
    </div>
  );
}

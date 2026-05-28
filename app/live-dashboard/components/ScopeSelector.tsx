// app/live-dashboard/components/ScopeSelector.tsx
// Scope filter (school | network | district) + year/term selectors — DE Design v2 (PRD §3.1)
// Uses .ld-scope-tabs + .ld-select classes from dashboard.css.

'use client';

interface School {
  id: number;
  nameTh: string;
}
interface Network {
  id: number;
  name: string;
}
interface AcademicYear {
  id: number;
  year: string;
}
interface Term {
  id: number;
  termNumber: number;
  academicYearId: number;
}

interface ScopeSelectorProps {
  scope: 'school' | 'network' | 'district';
  schoolId?: number;
  networkId?: number;
  academicYearId?: number;
  termId?: number;
  schools: School[];
  networks: Network[];
  academicYears: AcademicYear[];
  terms: Term[];
  onScopeChange: (scope: 'school' | 'network' | 'district') => void;
  onSchoolChange: (id?: number) => void;
  onNetworkChange: (id?: number) => void;
  onYearChange: (id?: number) => void;
  onTermChange: (id?: number) => void;
}

const SCOPE_LABEL: Record<ScopeSelectorProps['scope'], string> = {
  school: 'รายโรงเรียน',
  network: 'กลุ่มโรงเรียน',
  district: 'เขตพื้นที่',
};

export default function ScopeSelector({
  scope,
  schoolId,
  networkId,
  academicYearId,
  termId,
  schools,
  networks,
  academicYears,
  terms,
  onScopeChange,
  onSchoolChange,
  onNetworkChange,
  onYearChange,
  onTermChange,
}: ScopeSelectorProps) {
  const filteredTerms = academicYearId
    ? terms.filter((t) => t.academicYearId === academicYearId)
    : terms;

  return (
    <>
      <span className="ld-filter-label">ขอบเขต</span>
      <div className="ld-scope-tabs" role="tablist">
        {(['school', 'network', 'district'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-pressed={scope === s}
            onClick={() => onScopeChange(s)}
            className="ld-scope-tab"
          >
            {SCOPE_LABEL[s]}
          </button>
        ))}
      </div>

      {scope === 'school' && (
        <select
          aria-label="เลือกโรงเรียน"
          value={schoolId ?? ''}
          onChange={(e) => onSchoolChange(e.target.value ? parseInt(e.target.value) : undefined)}
          className="ld-select"
        >
          <option value="">— เลือกโรงเรียน —</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameTh}
            </option>
          ))}
        </select>
      )}

      {scope === 'network' && (
        <select
          aria-label="เลือกกลุ่มโรงเรียน"
          value={networkId ?? ''}
          onChange={(e) => onNetworkChange(e.target.value ? parseInt(e.target.value) : undefined)}
          className="ld-select"
        >
          <option value="">— เลือกกลุ่มโรงเรียน —</option>
          {networks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      )}

      <select
        aria-label="ปีการศึกษา"
        value={academicYearId ?? ''}
        onChange={(e) => {
          onYearChange(e.target.value ? parseInt(e.target.value) : undefined);
          onTermChange(undefined);
        }}
        className="ld-select"
      >
        <option value="">ทุกปีการศึกษา</option>
        {academicYears.map((y) => (
          <option key={y.id} value={y.id}>
            ปีการศึกษา {y.year}
          </option>
        ))}
      </select>

      {academicYearId && filteredTerms.length > 0 && (
        <select
          aria-label="ภาคเรียน"
          value={termId ?? ''}
          onChange={(e) => onTermChange(e.target.value ? parseInt(e.target.value) : undefined)}
          className="ld-select"
        >
          <option value="">ทุกเทอม</option>
          {filteredTerms.map((t) => (
            <option key={t.id} value={t.id}>
              เทอม {t.termNumber}
            </option>
          ))}
        </select>
      )}
    </>
  );
}

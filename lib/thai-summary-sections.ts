// lib/thai-summary-sections.ts
// Maps a stored ThaiP13Summary.result envelope to a flat list of titled
// sections, so the export route, the print page, and the admin UI all render
// the same content from one place. Handles both the leadership summary shape
// (kind undefined) and the supervision brief shape (kind = 'supervision').
// Pure TS (no server-only deps) so client components can import it too.

export interface ViewSection {
  title: string;
  text?: string; // a single paragraph
  items?: string[]; // a bullet list
}

export function summarySections(result: any): ViewSection[] {
  const ai = result?.ai || {};
  const out: ViewSection[] = [];
  const push = (title: string, content: string | string[] | undefined) => {
    if (Array.isArray(content)) { if (content.length) out.push({ title, items: content }); }
    else if (content && content.trim()) out.push({ title, text: content });
  };

  if (result?.kind === 'supervision') {
    push('ภาพรวมครู (สำหรับทีมหนุนเสริม)', ai.executiveSummary);
    push('จุดเด่นที่ควรชื่นชม/ต่อยอด', ai.strengths);
    push('ประเด็นที่ควรพัฒนา/เฝ้าระวัง', ai.concerns);
    push('ประเด็นที่ทีมควรสังเกตเมื่อเข้านิเทศ', ai.supervisionFocus);
    push('ข้อเสนอแนะการนิเทศของทีม', ai.coachingRecommendations);
    return out;
  }

  // Leadership summary (default)
  push('บทสรุปผู้บริหาร', ai.executiveSummary);
  push('จุดแข็ง', ai.strengths);
  push('จุดที่ควรพัฒนา', ai.improvements);
  push('ประเด็นจากการสะท้อนคิด', ai.reflectionInsights);
  push('ข้อเสนอแนะ', ai.recommendations);
  return out;
}

// Document title per result kind.
export function summaryDocTitle(result: any): string {
  if (result?.kind === 'supervision') {
    return `บทสรุปเพื่อการนิเทศ — ภาษาไทย ป.1–3 (การประเมินครั้งที่ ${result.round || ''})`;
  }
  return 'บทสรุปผลการประเมินการจัดการเรียนการสอนภาษาไทย ป.1–3';
}

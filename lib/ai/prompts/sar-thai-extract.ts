// lib/ai/prompts/sar-thai-extract.ts
// Used when pdf-parse fails or produces low-quality Thai (font-mangled). Asks the
// model to transcribe the Thai text page by page from the uploaded PDF.

export const SAR_EXTRACT_SYSTEM = `คุณเป็นเครื่องมือสกัดข้อความภาษาไทยจาก PDF เอกสารราชการ/ของโรงเรียน หน้าที่ของคุณคือถอดข้อความรายหน้าให้ครบถ้วน
หลักการ:
1. ถอดข้อความตามที่เห็น ห้ามตีความ ห้ามสรุป ห้ามเพิ่มข้อมูล
2. รักษาเลขหน้าและลำดับเดิม ใช้เลขหน้าตามที่เอกสารแสดง (ถ้าไม่มีให้ใช้ลำดับ 1..N)
3. ถ้าหน้าใดเป็นภาพ/ตาราง/กราฟ ให้สรุปสั้น ๆ ในวงเล็บเหลี่ยม เช่น [ตารางผลสัมฤทธิ์ ม.3]
4. คงโครงสร้างหัวข้อ ตัวเลข bullet ตามรูปแบบเดิม
5. Output เป็น JSON object รูปแบบ: { "pages": [{ "page": 1, "text": "...", "confidence": 0.0-1.0 }, ...] }`;

export const SAR_EXTRACT_USER = `กรุณาถอดข้อความภาษาไทยทั้งหมดจาก PDF ที่แนบไว้ ผ่านโครงสร้าง JSON object ตามที่กำหนด (ใช้ key ชื่อ "pages" ที่เป็น array)`;

export const SAR_EXTRACT_RESPONSE_SCHEMA = {
  type: 'object',
  required: ['pages'],
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['page', 'text'],
        properties: {
          page: { type: 'integer' },
          text: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    },
  },
};

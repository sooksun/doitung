# Toast Usage Guide

## การใช้งาน Toast ในระบบ

ระบบใช้ `react-toastify` สำหรับแสดง notifications แทน `alert()` และ `confirm()` แบบเดิม

## Import

```typescript
import { 
  toastSuccess, 
  toastError, 
  toastInfo, 
  toastWarning, 
  toastConfirm,
  toastLoading,
  toastDismiss,
  toastPromise 
} from '@/lib/toast';
```

## ฟังก์ชันที่ใช้ได้

### 1. toastSuccess(message, options?)
แสดงข้อความสำเร็จ (สีเขียว)

```typescript
toastSuccess('บันทึกข้อมูลสำเร็จ');
```

### 2. toastError(message, options?)
แสดงข้อความผิดพลาด (สีแดง)

```typescript
toastError('เกิดข้อผิดพลาดในการบันทึก');
```

### 3. toastInfo(message, options?)
แสดงข้อมูล (สีน้ำเงิน)

```typescript
toastInfo('กรุณาตรวจสอบข้อมูล');
```

### 4. toastWarning(message, options?)
แสดงคำเตือน (สีเหลือง)

```typescript
toastWarning('กรุณากรอกข้อมูลให้ครบถ้วน');
```

### 5. toastConfirm(message, onConfirm, onCancel?)
แสดง dialog ยืนยัน (แทน confirm)

```typescript
toastConfirm(
  'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?',
  () => {
    // ทำงานเมื่อกดยืนยัน
    handleDelete();
  },
  () => {
    // ทำงานเมื่อกดยกเลิก (optional)
    console.log('ยกเลิก');
  }
);
```

### 6. toastLoading(message, options?)
แสดง loading toast (ต้อง dismiss เอง)

```typescript
const toastId = toastLoading('กำลังบันทึกข้อมูล...');
// ... ทำงาน ...
toastDismiss(toastId);
```

### 7. toastDismiss(toastId?)
ปิด toast ที่ระบุ หรือปิดทั้งหมด

```typescript
toastDismiss(); // ปิดทั้งหมด
toastDismiss(toastId); // ปิดเฉพาะ toast ที่ระบุ
```

### 8. toastPromise(promise, { pending, success, error })
แสดง toast สำหรับ async operation

```typescript
toastPromise(
  fetch('/api/data'),
  {
    pending: 'กำลังโหลดข้อมูล...',
    success: 'โหลดข้อมูลสำเร็จ',
    error: 'เกิดข้อผิดพลาด'
  }
);
```

## ตัวอย่างการใช้งาน

### แทนที่ alert()

**เดิม:**
```typescript
alert('บันทึกข้อมูลสำเร็จ');
```

**ใหม่:**
```typescript
toastSuccess('บันทึกข้อมูลสำเร็จ');
```

### แทนที่ confirm()

**เดิม:**
```typescript
if (confirm('คุณแน่ใจหรือไม่?')) {
  handleDelete();
}
```

**ใหม่:**
```typescript
toastConfirm(
  'คุณแน่ใจหรือไม่?',
  () => {
    handleDelete();
  }
);
```

### ใช้ใน try-catch

```typescript
try {
  const res = await fetch('/api/data');
  const data = await res.json();
  
  if (res.ok) {
    toastSuccess('บันทึกข้อมูลสำเร็จ');
  } else {
    toastError(data.error || 'เกิดข้อผิดพลาด');
  }
} catch (err) {
  toastError('เกิดข้อผิดพลาดในการบันทึก');
}
```

## Customization

Toast ถูกตั้งค่าไว้ที่ `app/components/ToastProvider.tsx` สามารถปรับแต่งได้ตามต้องการ:

- Position: `top-right`
- Auto close: `3000ms`
- Theme: `light`
- Font: `Kanit` (สำหรับภาษาไทย)


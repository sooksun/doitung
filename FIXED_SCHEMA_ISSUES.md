# ✅ แก้ไข Schema Validation Errors

## 🔧 ปัญหาที่พบ

มี **6 validation errors** ใน Prisma schema:

1. ❌ `SchoolNetwork.objectives` - missing opposite relation field on `OKRObjective`
2. ❌ `EvaluationSession.evaluator` - missing opposite relation field on `User`
3. ❌ `OKRObjective.network` - missing opposite relation field on `SchoolNetwork`
4. ❌ `OKRObjective.owner` - missing opposite relation field on `User`
5. ❌ `OKRKeyResult.owner` - missing opposite relation field on `User`
6. ❌ `OKRAction.owner` - missing opposite relation field on `User`

## ✅ วิธีแก้ไข

### 1. เพิ่ม Opposite Relations ใน `User` Model

```prisma
model User {
  // ... existing fields ...
  
  // Relations (เพิ่ม)
  actionRatings      OKRActionRating[]    @relation("ActionRatingEvaluator")
  evaluationSessions EvaluationSession[]  @relation("Evaluator")
  objectives         OKRObjective[]       @relation("OKRObjectiveOwner")
  keyResults         OKRKeyResult[]       @relation("OKRKeyResultOwner")
  actions            OKRAction[]          @relation("OKRActionOwner")
}
```

### 2. เพิ่ม Relation Name ใน `SchoolNetwork.objectives`

```prisma
model SchoolNetwork {
  // ... existing fields ...
  
  objectives  OKRObjective[]  @relation("NetworkOKRs")  // เพิ่ม relation name
}
```

### 3. อัปเดต Relation Names ใน Models อื่นๆ

#### OKRObjective
```prisma
owner  User?  @relation("OKRObjectiveOwner", fields: [ownerId], references: [id])
network SchoolNetwork? @relation("NetworkOKRs", fields: [networkId], references: [id])
```

#### OKRKeyResult
```prisma
owner  User?  @relation("OKRKeyResultOwner", fields: [ownerId], references: [id])
```

#### OKRAction
```prisma
owner  User?  @relation("OKRActionOwner", fields: [ownerId], references: [id])
```

#### EvaluationSession (มีอยู่แล้ว)
```prisma
evaluator  User  @relation("Evaluator", fields: [evaluatorId], references: [id])
```

## ✅ ผลลัพธ์

หลังแก้ไข:
- ✅ `npm run db:generate` - สำเร็จ
- ✅ `npm run db:push` - สำเร็จ
- ✅ `npm run db:seed` - สำเร็จ

## 📝 สรุป

**ปัญหาหลัก:** Prisma ต้องการ **opposite relation fields** ในทุก relation เพื่อให้ Prisma Client สามารถ query ทั้งสองฝั่งได้

**วิธีแก้:** เพิ่ม relation fields ในฝั่งที่ขาด โดยใช้ **relation name** เพื่อระบุว่าคู่กับ relation ไหน

---

**อัปเดตล่าสุด**: 2024


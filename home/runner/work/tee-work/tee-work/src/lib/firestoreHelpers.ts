/**
 * @file firestoreHelpers.ts
 * @description Helper functions สำหรับ Firestore queries
 */

import { QueryConstraint, orderBy } from "firebase/firestore";

/**
 * ❌ ปัญหาเดิม: where + orderBy เดียวกัน ต้อง composite index
 * ✅ แก้ไข: ใช้ orderBy โดยลำพัง (client-side sorting)
 * 
 * Firestore limitation:
 * - ห้าม where + orderBy บนฟิลด์เดียวกัน (ต้อง composite index)
 * - วิธีแก้: ลบ where, เอาข้อมูลทั้งหมด, เรียงด้าน client
 */
export function safeOrderBy(
  field: string,
  direction: "asc" | "desc" = "desc"
): QueryConstraint[] {
  // ✅ ส่งคืน empty array เพื่อให้ client-side sorting ทำงาน
  // เนื่องจาก loanService มี sortLoans() และ sortRepayments() อยู่แล้ว
  return [];
}

/**
 * Alternative: ถ้าต้องการใช้ orderBy ต้อง create composite index
 * 
 * Steps:
 * 1. ลอง query ธรรมดา
 * 2. Firestore จะให้ URL ในคอนโซล
 * 3. คลิกลิงค์ → Firebase Console จะเปิด Create Index
 * 4. รอสร้าง index เสร็จ
 */
export function safeOrderByWithCompositeIndex(
  field: string,
  direction: "asc" | "desc" = "desc"
): QueryConstraint[] {
  // ✅ ใช้ orderBy โดยตรง (ต้องมี composite index ใน Firebase)
  return [orderBy(field, direction)];
}

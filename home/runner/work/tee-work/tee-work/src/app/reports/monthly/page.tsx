
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function MonthlyReportRemovedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-2xl font-bold mb-4">หน้านี้ถูกลบไปแล้ว</h1>
      <p className="text-muted-foreground mb-8">This page has been removed.</p>
      <Button asChild>
        <Link href="/reports">กลับไปที่หน้ารายงาน</Link>
      </Button>
    </div>
  );
}

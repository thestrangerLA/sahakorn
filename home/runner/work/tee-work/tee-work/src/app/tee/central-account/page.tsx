import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function PageRemoved() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-4">
      <Card className="w-full max-w-md">
          <CardHeader>
              <CardTitle className="text-2xl font-bold mb-4">หน้านี้ถูกลบไปแล้ว</CardTitle>
              <CardDescription>This page has been removed as per your request.</CardDescription>
          </CardHeader>
          <CardContent>
              <Button asChild>
                <Link href="/tee">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    ກັບໄປໜ້າ Tee Business
                </Link>
              </Button>
          </CardContent>
      </Card>
    </div>
  );
}

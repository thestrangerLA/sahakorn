import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function PageRemoved() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-4">
      <Card className="w-full max-w-md">
          <CardHeader>
              <CardTitle className="text-2xl font-bold mb-4">Page Removed</CardTitle>
              <CardDescription>This page has been removed to simplify the app. The main dashboard is now at the root.</CardDescription>
          </CardHeader>
          <CardContent>
              <Button asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
              </Button>
          </CardContent>
      </Card>
    </div>
  );
}

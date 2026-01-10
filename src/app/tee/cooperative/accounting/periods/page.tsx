
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AccountingPeriodsPage() {
    // This is a placeholder page. Logic for managing periods will be added in the future.
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ຈັດການງວດບັນຊີ</h1>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>ຈັດການງວດບັນຊີ</CardTitle>
                        <CardDescription>
                           หน้านี้อยู่ระหว่างการพัฒนา จะใช้สำหรับปิดงวดบัญชีในแต่ละเดือน
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-16 text-muted-foreground">
                            Coming Soon...
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}

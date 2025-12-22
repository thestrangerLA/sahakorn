
"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react';

export default function CentralAccountPage() {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປ</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-bold">ບັນຊີກອງກາງ</h1>
            </header>
            <main className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Under Construction</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>This page is currently under construction.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}

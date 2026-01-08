
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Handshake, PlusCircle, MoreHorizontal } from "lucide-react";
import { format } from 'date-fns';
import type { Loan } from '@/lib/types';
import { listenToCooperativeLoans } from '@/services/cooperativeLoanService';
import { Badge } from '@/components/ui/badge';
import { useClientRouter } from '@/hooks/useClientRouter';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function CooperativeLoansPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useClientRouter();

    useEffect(() => {
        const unsubscribe = listenToCooperativeLoans(setLoans, () => setLoading(false));
        return () => unsubscribe();
    }, []);

    const summary = useMemo(() => {
        const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
        const activeLoans = loans.filter(l => l.status === 'disbursed' || l.status === 'overdue').length;
        const pendingLoans = loans.filter(l => l.status === 'submitted').length;
        return { totalLoanAmount, activeLoans, pendingLoans };
    }, [loans]);

    const handleRowClick = (loanId: string) => {
        router.push(`/tee/cooperative/loans/${loanId}`);
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ລະບົບສິນເຊື່ອສະຫະກອນ</h1>
                <div className="ml-auto">
                    <Button size="sm" asChild>
                        <Link href="/tee/cooperative/loans/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            ສ້າງຄຳຮ້ອງສິນເຊື່ອ
                        </Link>
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ຍອດສິນເຊື່ອທັງໝົດ</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.totalLoanAmount)} KIP</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ສິນເຊື່ອທີ່ເຄື່ອນໄຫວ</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{summary.activeLoans}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ສິນເຊື່ອທີ່ລໍຖ້າອະນຸມັດ</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{summary.pendingLoans}</p></CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>ລາຍການສິນເຊື່ອທັງໝົດ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ລະຫັດກູ້ຢືມ</TableHead>
                                    <TableHead>ຊື່ສະມາຊິກ</TableHead>
                                    <TableHead>ປະເພດສິນເຊື່ອ</TableHead>
                                    <TableHead className="text-right">ຈຳນວນເງິນ</TableHead>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ສະຖານະ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">ກຳລັງໂຫລດ...</TableCell></TableRow>
                                ) : loans.length > 0 ? (
                                    loans.map(loan => (
                                        <TableRow key={loan.id} onClick={() => handleRowClick(loan.id)} className="cursor-pointer">
                                            <TableCell className="font-mono">{loan.loanCode}</TableCell>
                                            <TableCell>{/* Member Name will be fetched later */}</TableCell>
                                            <TableCell>{/* Loan Type Name will be fetched later */}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(loan.amount)}</TableCell>
                                            <TableCell>{format(loan.applicationDate, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell><Badge>{loan.status}</Badge></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">ບໍ່ມີຂໍ້ມູນສິນເຊື່ອ</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

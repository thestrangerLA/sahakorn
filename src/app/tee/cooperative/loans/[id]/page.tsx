
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Handshake, DollarSign, Calendar, Percent, Landmark, Banknote } from "lucide-react";
import { format } from "date-fns";
import type { Loan, LoanRepayment } from '@/lib/types';
import { listenToRepaymentsForLoan } from '@/services/cooperativeLoanService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const StatCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export default function LoanDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [loan, setLoan] = useState<Loan | null>(null);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchLoan = async () => {
            const loanDocRef = doc(db, 'cooperativeLoans', id);
            const docSnap = await getDoc(loanDocRef);
            if (docSnap.exists()) {
                setLoan({ id: docSnap.id, ...docSnap.data() } as Loan);
            }
            setLoading(false);
        };

        fetchLoan();

        const unsubscribeRepayments = listenToRepaymentsForLoan(id, setRepayments);
        
        return () => {
            unsubscribeRepayments();
        };
    }, [id]);

    const totalPaid = useMemo(() => repayments.reduce((sum, r) => sum + r.amountPaid, 0), [repayments]);
    const outstandingBalance = useMemo(() => (loan?.amount || 0) - totalPaid, [loan, totalPaid]);

    const monthlyPayment = useMemo(() => {
        if (!loan || !loan.amount || !loan.interestRate || !loan.term) {
            return 0;
        }
        const P = loan.amount;
        const i = loan.interestRate / 100 / 12; // Monthly interest rate
        const n = loan.term;

        if (i === 0) {
            return P / n;
        }

        const M = P * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
        return M;
    }, [loan]);

    if (loading) {
        return <div className="text-center p-8">Loading loan details...</div>;
    }

    if (!loan) {
        return <div className="text-center p-8">Loan not found.</div>;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/loans">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ລາຍລະອຽດສິນເຊື່ອ: {loan.loanCode}</h1>
                 <div className="ml-auto">
                    <Badge variant={loan.status === 'paid_off' ? 'default' : 'secondary'}>{loan.status}</Badge>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <StatCard title="ເງິນກູ້ຢືມ" value={`${formatCurrency(loan.amount)} KIP`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="ອັດຕາດອກເບ້ຍ" value={`${loan.interestRate}% / ປີ`} icon={<Percent className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="ໄລຍະເວລາ" value={`${loan.term} ເດືອນ`} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="ຍອດຈ່າຍແຕ່ລະເດືອນ" value={`${formatCurrency(monthlyPayment)} KIP`} icon={<Banknote className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="ຍອດຄ້າງຊຳລະ" value={`${formatCurrency(outstandingBalance)} KIP`} icon={<Landmark className="h-4 w-4 text-muted-foreground" />} />
                </div>
                
                 <Card>
                    <CardHeader>
                        <CardTitle>ປະຫວັດການຊຳລະ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ວັນທີຊຳລະ</TableHead>
                                    <TableHead className="text-right">ຈຳນວນເງິນ</TableHead>
                                    <TableHead className="text-right">ເງິນຕົ້ນ</TableHead>
                                    <TableHead className="text-right">ດອກເບ້ຍ</TableHead>
                                    <TableHead className="text-right">ຍອດເຫຼືອ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {repayments.length > 0 ? repayments.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{format(r.repaymentDate, 'dd/MM/yyyy')}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(r.amountPaid)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(r.principal)}</TableCell>
                                        <TableCell className="text-right text-red-500">{formatCurrency(r.interest)}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(r.outstandingBalance)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">ບໍ່ມີປະຫວັດການຊຳລະ</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

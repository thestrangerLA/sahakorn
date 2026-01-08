
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Handshake, DollarSign, Calendar as CalendarIcon, Percent, Landmark, Banknote, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import type { Loan, LoanRepayment, CurrencyValues } from '@/lib/types';
import { listenToRepaymentsForLoan, addLoanRepayment, listenToLoan } from '@/services/cooperativeLoanService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd'];
const initialCurrencyValues: CurrencyValues = { kip: 0, baht: 0, usd: 0, cny: 0 };


const StatCard = ({ title, values, icon }: { title: string, values: CurrencyValues, icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {currencies.map(c => {
                const amount = values[c];
                return amount > 0 ? <div key={c} className="text-2xl font-bold">{formatCurrency(amount)} {c.toUpperCase()}</div> : null
            })}
        </CardContent>
    </Card>
);

export default function LoanDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    const [loan, setLoan] = useState<Loan | null>(null);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loading, setLoading] = useState(true);

    const [repaymentAmount, setRepaymentAmount] = useState<CurrencyValues>({ kip: 0, thb: 0, usd: 0, cny: 0 });

    useEffect(() => {
        if (!id) return;

        const unsubscribeLoan = listenToLoan(id, (loanData) => {
            if (loanData) {
                setLoan(loanData);
            }
            setLoading(false);
        });

        const unsubscribeRepayments = listenToRepaymentsForLoan(id, setRepayments);
        
        return () => {
            unsubscribeLoan();
            unsubscribeRepayments();
        };
    }, [id]);

    const { totalPaid, outstandingBalance } = useMemo(() => {
        if (!loan) return { totalPaid: { ...initialCurrencyValues }, outstandingBalance: { ...initialCurrencyValues } };

        const totalLoanAmountWithInterest = { ...initialCurrencyValues };
         currencies.forEach(c => {
            const amount = loan.amount?.[c] || 0;
            totalLoanAmountWithInterest[c] = amount + (amount * (loan.interestRate || 0) / 100);
        });
        
        const totalPaid = repayments.reduce((sum, r) => {
            currencies.forEach(c => sum[c] += r.amountPaid?.[c] || 0);
            return sum;
        }, { ...initialCurrencyValues });

        const outstanding = { ...initialCurrencyValues };
        currencies.forEach(c => {
            outstanding[c] = totalLoanAmountWithInterest[c] - totalPaid[c];
        });
        
        return { totalPaid, outstandingBalance: outstanding };
    }, [repayments, loan]);

    
    const handleMakePayment = async () => {
        const repaymentDate = new Date();
        const totalPayment = Object.values(repaymentAmount).reduce((sum, v) => sum + v, 0);

        if (!loan || totalPayment <= 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ", variant: "destructive" });
            return;
        }
        
        try {
            await addLoanRepayment(loan.id, repaymentAmount, repaymentDate);
            toast({ title: "ຊຳລະສິນເຊື່ອສຳເລັດ" });
            setRepaymentAmount({ kip: 0, thb: 0, usd: 0, cny: 0 });
        } catch (error: any) {
            console.error("Error making payment:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: error.message, variant: "destructive" });
        }
    };


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
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <StatCard title="ເງິນກູ້ຢືມ" values={loan.amount} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">%ກຳໄລ</CardTitle><Percent className="h-4 w-4 text-muted-foreground" /></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{loan.interestRate}% / ປີ</p></CardContent>
                    </Card>
                    <StatCard title="ຍອດຄ້າງຊຳລະ" values={outstandingBalance} icon={<Landmark className="h-4 w-4 text-muted-foreground" />} />
                </div>
                
                 <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
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
                                            <TableHead className="text-right">ຍອດເຫຼືອ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {repayments.length > 0 ? repayments.map(r => (
                                            <TableRow key={r.id}>
                                                <TableCell>{format(r.repaymentDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right">
                                                    {currencies.map(c => r.amountPaid[c] > 0 && <div key={c}>{formatCurrency(r.amountPaid[c])} {c.toUpperCase()}</div>)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                     {currencies.map(c => r.outstandingBalance[c] !== 0 && <div key={c}>{formatCurrency(r.outstandingBalance[c])} {c.toUpperCase()}</div>)}
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">ບໍ່ມີປະຫວັດການຊຳລະ</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                     <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>ຊຳລະສິນເຊື່ອ</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                 <div className="grid gap-2">
                                    <Label>ຈຳນວນເງິນ</Label>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Input type="number" placeholder="KIP" value={repaymentAmount.kip || ''} onChange={e => setRepaymentAmount(p => ({...p, kip: Number(e.target.value)}))} />
                                        <Input type="number" placeholder="THB" value={repaymentAmount.thb || ''} onChange={e => setRepaymentAmount(p => ({...p, thb: Number(e.target.value)}))} />
                                        <Input type="number" placeholder="USD" value={repaymentAmount.usd || ''} onChange={e => setRepaymentAmount(p => ({...p, usd: Number(e.target.value)}))} />
                                    </div>
                                </div>
                                <Button onClick={handleMakePayment} className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    ຢືນຢັນການຊຳລະ
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                 </div>
            </main>
        </div>
    );
}

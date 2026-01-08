
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
import type { Loan, LoanRepayment } from '@/lib/types';
import { listenToRepaymentsForLoan, getLoan, addLoanRepayment } from '@/services/cooperativeLoanService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';


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
    const { toast } = useToast();

    const [loan, setLoan] = useState<Loan | null>(null);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loading, setLoading] = useState(true);

    const [repaymentDate, setRepaymentDate] = useState<Date | undefined>(new Date());
    const [repaymentAmount, setRepaymentAmount] = useState(0);

    useEffect(() => {
        if (!id) return;

        const fetchLoan = async () => {
            setLoading(true);
            const loanData = await getLoan(id);
            if (loanData) {
                setLoan(loanData);
            }
            setLoading(false);
        };

        fetchLoan();

        const unsubscribeRepayments = listenToRepaymentsForLoan(id, setRepayments);
        
        return () => {
            unsubscribeRepayments();
        };
    }, [id]);

    const { totalPaid, outstandingBalance } = useMemo(() => {
        if (!loan) return { totalPaid: 0, outstandingBalance: 0 };
        const totalLoanAmountWithInterest = loan.amount * (1 + (loan.interestRate || 0) / 100) + loan.amount;
        const totalPaid = repayments.reduce((sum, r) => sum + r.amountPaid, 0);
        const outstanding = totalLoanAmountWithInterest - totalPaid;
        return { totalPaid, outstandingBalance: outstanding };
    }, [repayments, loan]);

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
    
    const handleMakePayment = async () => {
        if (!loan || !repaymentDate || repaymentAmount <= 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາເລືອກວັນທີ ແລະ ປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ", variant: "destructive" });
            return;
        }
        
        try {
            await addLoanRepayment(loan.id, repaymentAmount, repaymentDate);
            toast({ title: "ຊຳລະສິນເຊື່ອສຳເລັດ" });
            setRepaymentAmount(0);
            setRepaymentDate(new Date());
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
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <StatCard title="ເງິນກູ້ຢືມ" value={`${formatCurrency(loan.amount)} KIP`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="%ກຳໄລ" value={`${loan.interestRate}% / ປີ`} icon={<Percent className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="ໄລຍະເວລາ" value={`${loan.term} ເດືອນ`} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="ຍອດຈ່າຍແຕ່ລະເດືອນ" value={`${formatCurrency(monthlyPayment)} KIP`} icon={<Banknote className="h-4 w-4 text-muted-foreground" />} />
                    <StatCard title="ຍອດຄ້າງຊຳລະ" value={`${formatCurrency(outstandingBalance)} KIP`} icon={<Landmark className="h-4 w-4 text-muted-foreground" />} />
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
                    </div>
                     <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>ຊຳລະສິນເຊື່ອ</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="repayment-date">ວັນທີຊຳລະ</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {repaymentDate ? format(repaymentDate, "PPP") : <span>ເລືອກວັນທີ</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={repaymentDate} onSelect={setRepaymentDate} initialFocus showOutsideDays={false} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                 <div className="grid gap-2">
                                    <Label htmlFor="repayment-amount">ຈຳນວນເງິນ</Label>
                                    <Input id="repayment-amount" type="number" value={repaymentAmount || ''} onChange={(e) => setRepaymentAmount(Number(e.target.value))} />
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

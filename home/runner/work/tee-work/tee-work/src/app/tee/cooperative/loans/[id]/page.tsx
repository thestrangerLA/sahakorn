
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Handshake, DollarSign, Calendar as CalendarIcon, Percent, Landmark, Banknote, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Loan, LoanRepayment, CurrencyValues } from '@/lib/types';
import { listenToRepaymentsForLoan, addLoanRepayment, listenToLoan } from '@/services/cooperativeLoanService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


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

type NewRepayment = {
    id: string;
    date: Date;
    amount: CurrencyValues;
};

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd'];

export default function LoanDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    const [loan, setLoan] = useState<Loan | null>(null);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [newRepayments, setNewRepayments] = useState<NewRepayment[]>([]);

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

    const { totalPaid, outstandingBalance, newOutstandingBalance } = useMemo(() => {
        const initialTotals = { kip: 0, thb: 0, usd: 0, cny: 0 };
        if (!loan) return { totalPaid: {...initialTotals}, outstandingBalance: {...initialTotals}, newOutstandingBalance: {...initialTotals} };

        const totalLoanAmountWithInterest = { ...initialTotals };
        currencies.forEach(c => {
             totalLoanAmountWithInterest[c] = (loan.amount[c] || 0) * (1 + (loan.interestRate || 0) / 100);
        });
        
        const totalPaid = repayments.reduce((sum, r) => {
            currencies.forEach(c => {
                sum[c] += r.amountPaid?.[c] || 0;
            });
            return sum;
        }, { ...initialTotals });
        
        const outstanding = { ...initialTotals };
        currencies.forEach(c => {
            outstanding[c] = totalLoanAmountWithInterest[c] - totalPaid[c];
        });

        const totalNewRepayment = newRepayments.reduce((sum, r) => {
            currencies.forEach(c => {
                sum[c] += r.amount?.[c] || 0;
            });
            return sum;
        }, { ...initialTotals });

        const newOutstanding = { ...initialTotals };
        currencies.forEach(c => {
            newOutstanding[c] = outstanding[c] - totalNewRepayment[c];
        });

        return { totalPaid, outstandingBalance: outstanding, newOutstandingBalance: newOutstanding };
    }, [repayments, loan, newRepayments]);

    
    const handleMakePayment = async () => {
        if (!loan || newRepayments.length === 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາເພີ່ມລາຍການຊຳລະ", variant: "destructive" });
            return;
        }
        
        const paymentsToSave = newRepayments.filter(r => currencies.some(c => r.amount[c] > 0));
        if (paymentsToSave.length === 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ", description: "ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຕ້ອງການຊຳລະ", variant: "destructive" });
            return;
        }

        try {
            await addLoanRepayment(loan.id, paymentsToSave.map(p => ({amount: p.amount, date: p.date})));
            toast({ title: "ຊຳລະສິນເຊື່ອສຳເລັດ" });
            setNewRepayments([]);
        } catch (error: any) {
            console.error("Error making payment:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: error.message, variant: "destructive" });
        }
    };
    
    const handleAddNewRepaymentRow = () => {
        setNewRepayments(prev => [...prev, { id: uuidv4(), date: new Date(), amount: { kip: 0, thb: 0, usd: 0, cny: 0 } }]);
    };

    const handleUpdateNewRepayment = (rowId: string, field: 'date' | keyof CurrencyValues, value: any) => {
        setNewRepayments(prev => prev.map(row => {
            if (row.id === rowId) {
                if (field === 'date') {
                    return { ...row, date: value as Date };
                }
                return { ...row, amount: { ...row.amount, [field]: Number(value) } };
            }
            return row;
        }));
    };

    const handleDeleteNewRepaymentRow = (rowId: string) => {
        setNewRepayments(prev => prev.filter(row => row.id !== rowId));
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
                    {currencies.map(c => {
                        const amount = loan.amount?.[c] || 0;
                        if (amount === 0) return null;
                        return <StatCard key={c} title={`ເງິນກູ້ຢືມ (${c.toUpperCase()})`} value={`${formatCurrency(amount)}`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
                    })}
                    <StatCard title="%ດອກເບ້ຍ" value={`${loan.interestRate}% / ປີ`} icon={<Percent className="h-4 w-4 text-muted-foreground" />} />
                    {currencies.map(c => {
                        const amount = outstandingBalance[c];
                         if ((loan.amount?.[c] || 0) === 0 && amount === 0) return null;
                        return <StatCard key={c} title={`ຍອດຄ້າງຊຳລະ (${c.toUpperCase()})`} value={`${formatCurrency(amount)}`} icon={<Landmark className="h-4 w-4 text-muted-foreground" />} />
                    })}
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
                                            <TableHead className="text-right">KIP</TableHead>
                                            <TableHead className="text-right">THB</TableHead>
                                            <TableHead className="text-right">USD</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {repayments.length > 0 ? repayments.map(r => (
                                            <TableRow key={r.id}>
                                                <TableCell>{format(r.repaymentDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(r.amountPaid.kip || 0)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(r.amountPaid.thb || 0)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(r.amountPaid.usd || 0)}</TableCell>
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
                     <div className="lg:col-span-1 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>ຊຳລະສິນເຊື່ອ</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ວັນທີ</TableHead>
                                            <TableHead colSpan={3}>ຈຳນວນເງິນ</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {newRepayments.map(row => (
                                            <TableRow key={row.id}>
                                                <TableCell className="p-1 w-[120px]">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8 w-full justify-start font-normal text-xs">
                                                                <CalendarIcon className="mr-1 h-3 w-3" />
                                                                {format(row.date, 'dd/MM/yy')}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={row.date} onSelect={(d) => d && handleUpdateNewRepayment(row.id, 'date', d)} /></PopoverContent>
                                                    </Popover>
                                                </TableCell>
                                                {currencies.map(c => (
                                                    <TableCell key={c} className="p-1">
                                                        <Input type="number" placeholder={c.toUpperCase()} value={row.amount[c] || ''} onChange={(e) => handleUpdateNewRepayment(row.id, c, e.target.value)} className="h-8 text-right" />
                                                    </TableCell>
                                                ))}
                                                <TableCell className="p-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteNewRepaymentRow(row.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <Button onClick={handleAddNewRepaymentRow} className="w-full" variant="outline"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມແຖວ</Button>
                                <Button onClick={handleMakePayment} className="w-full">ຢືນຢັນການຊຳລະ</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>ຍອດເຫຼືອຫຼັງຊຳລະ</CardTitle>
                            </CardHeader>
                            <CardContent>
                               {currencies.map(c => {
                                   if ((loan.amount?.[c] || 0) === 0 && newOutstandingBalance[c] === 0) return null;
                                   return (
                                     <div key={c} className="flex justify-between items-center py-1">
                                       <span className="text-sm font-medium">{c.toUpperCase()}:</span>
                                       <span className="text-lg font-bold">{formatCurrency(newOutstandingBalance[c])}</span>
                                   </div>
                                )})}
                            </CardContent>
                        </Card>
                    </div>
                 </div>
            </main>
        </div>
    );
}


    
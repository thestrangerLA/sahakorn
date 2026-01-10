
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
import { ArrowLeft, Handshake, DollarSign, Calendar as CalendarIcon, Percent, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Loan, LoanRepayment, CurrencyValues, CooperativeMember } from '@/lib/types';
import { listenToRepaymentsForLoan, addLoanRepayment, listenToLoan, updateLoan } from '@/services/cooperativeLoanService';
import { getCooperativeMember } from '@/services/cooperativeMemberService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';


const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const StatCard = ({ title, value, icon, subValue }: { title: string, value: string | number, icon: React.ReactNode, subValue?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        </CardContent>
    </Card>
);

const currencies: (keyof Loan['amount'])[] = ['kip', 'thb', 'usd'];
const initialCurrencyValues = { kip: 0, thb: 0, usd: 0 };

type NewRepayment = {
    id: string;
    date: Date;
    note?: string;
    amount: {
        kip: number;
        thb: number;
        usd: number;
    };
};

export default function LoanDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    const [loan, setLoan] = useState<Loan | null>(null);
    const [member, setMember] = useState<CooperativeMember | null>(null);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [newRepayments, setNewRepayments] = useState<NewRepayment[]>([]);

    useEffect(() => {
        if (!id) return;

        const unsubscribeLoan = listenToLoan(id, async (loanData) => {
            if (loanData) {
                setLoan(loanData);
                if (loanData.memberId && (!member || member.id !== loanData.memberId)) {
                    const memberData = await getCooperativeMember(loanData.memberId);
                    setMember(memberData);
                }
            }
            setLoading(false);
        });

        const unsubscribeRepayments = listenToRepaymentsForLoan(id, setRepayments);
        
        return () => {
            unsubscribeLoan();
            unsubscribeRepayments();
        };
    }, [id, member]);

    const { totalPaid, outstandingBalance, totalLoanWithInterest } = useMemo(() => {
        const paid = { ...initialCurrencyValues };
        const outstanding = { ...initialCurrencyValues };
        const loanWithInterest = { ...initialCurrencyValues };

        if (loan) {
            currencies.forEach(c => {
                const principal = loan.amount[c] || 0;
                const interest = principal * (loan.interestRate / 100);
                loanWithInterest[c] = principal + interest;

                const paidForCurrency = repayments.reduce((sum, r) => sum + (r.amountPaid[c] || 0), 0);
                paid[c] = paidForCurrency;
                outstanding[c] = loanWithInterest[c] - paidForCurrency;
            });
        }
        
        return { totalPaid: paid, outstandingBalance: outstanding, totalLoanWithInterest: loanWithInterest };
    }, [repayments, loan]);

    const handleMakePayment = async () => {
        if (!loan || newRepayments.length === 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາເພີ່ມລາຍການຊຳລະ", variant: "destructive" });
            return;
        }
        
        const paymentsToSave = newRepayments.filter(r => currencies.some(c => (r.amount[c] || 0) > 0));
        if (paymentsToSave.length === 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຖືກຕ້ອງ", description: "ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຕ້ອງການຊຳລະ", variant: "destructive" });
            return;
        }

        try {
            await addLoanRepayment(loan.id, paymentsToSave.map(p => ({ amount: p.amount, date: p.date, note: p.note })));
            
            // Check if loan is paid off
            const newTotalPaid = { ...totalPaid };
            paymentsToSave.forEach(p => {
                currencies.forEach(c => {
                    newTotalPaid[c] += p.amount[c];
                });
            });
            const isPaidOff = currencies.every(c => newTotalPaid[c] >= totalLoanWithInterest[c]);
            if (isPaidOff && loan.status !== 'paid_off') {
                await updateLoan(loan.id, { status: 'paid_off' });
            }

            toast({ title: "ຊຳລະສິນເຊື່ອສຳເລັດ" });
            setNewRepayments([]);
        } catch (error: any) {
            console.error("Error making payment:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: error.message, variant: "destructive" });
        }
    };
    
    const handleAddNewRepaymentRow = () => {
        setNewRepayments(prev => [...prev, { id: uuidv4(), date: new Date(), amount: { kip: 0, thb: 0, usd: 0 } }]);
    };

    const handleUpdateNewRepayment = (rowId: string, field: 'date' | 'note' | 'kip' | 'thb' | 'usd', value: any) => {
        setNewRepayments(prev => prev.map(row => {
            if (row.id === rowId) {
                if (field === 'date' || field === 'note') {
                    return { ...row, [field]: value };
                }
                return { ...row, amount: { ...row.amount, [field]: Number(value) } };
            }
            return row;
        }));
    };

    const handleDeleteNewRepaymentRow = (rowId: string) => {
        setNewRepayments(prev => prev.filter(row => row.id !== rowId));
    };

    if (loading) return <div className="text-center p-8">Loading loan details...</div>;
    if (!loan) return <div className="text-center p-8">Loan not found.</div>;

    const totalOutstandingValue = Object.values(outstandingBalance).reduce((sum, val) => sum + val, 0);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/loans"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ລາຍລະອຽດສິນເຊື່ອ: {loan.loanCode}</h1>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 grid lg:grid-cols-3">
                 <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>ສະຫຼຸບຂໍ້ມູນສິນເຊື່ອ</span>
                                <Badge variant={totalOutstandingValue <= 0 ? 'success' : 'warning'}>
                                    {totalOutstandingValue <= 0 ? 'ຈ່າຍໝົດແລ້ວ' : 'ຍັງຄ້າງ'}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="font-semibold">ລະຫັດສິນເຊື່ອ:</span> {loan.loanCode}</div>
                                <div><span className="font-semibold">ສະມາຊິກ:</span> {member?.name || '...'}</div>
                                <div><span className="font-semibold">ວັນທີກູ້:</span> {format(loan.applicationDate, 'dd/MM/yyyy')}</div>
                                <div><span className="font-semibold">ອັດຕາດອກເບ້ຍ:</span> {loan.interestRate}% ຕໍ່ປີ</div>
                            </div>
                            <Table className="mt-4">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ສະກຸນເງິນ</TableHead>
                                        <TableHead className="text-right">ເງິນຕົ້ນ</TableHead>
                                        <TableHead className="text-right">ຕົ້ນ+ດອກເບ້ຍ</TableHead>
                                        <TableHead className="text-right">ຈ່າຍແລ້ວ</TableHead>
                                        <TableHead className="text-right">ຍອດຄົງເຫຼືອ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currencies.map(c => (
                                        <TableRow key={c}>
                                            <TableCell className="font-semibold uppercase">{c}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(loan.amount[c] || 0)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(totalLoanWithInterest[c] || 0)}</TableCell>
                                            <TableCell className="text-right text-green-600">{formatCurrency(totalPaid[c] || 0)}</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">{formatCurrency(outstandingBalance[c] || 0)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>ປະຫວັດການຊຳລະ</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>ວັນທີ</TableHead><TableHead>ຈຳນວນ</TableHead><TableHead>ໝາຍເຫດ</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {repayments.length > 0 ? repayments.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell>{format(r.repaymentDate, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                {currencies.map(c => (r.amountPaid[c] || 0) > 0 && <div key={c}>{`${formatCurrency(r.amountPaid[c])} ${c.toUpperCase()}`}</div>)}
                                            </TableCell>
                                            <TableCell>{r.note}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={3} className="text-center h-24">ບໍ່ມີປະຫວັດການຊຳລະ</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                 </div>
                 <div className="lg:col-span-1 space-y-4">
                     <Card>
                        <CardHeader><CardTitle>ເພີ່ມການຊຳລະເງິນ</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {newRepayments.map((row, index) => (
                                <div key={row.id} className="p-3 border rounded-md space-y-2 relative">
                                    <Label className="text-xs text-muted-foreground">ລາຍການຊຳລະ #{index + 1}</Label>
                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleDeleteNewRepaymentRow(row.id)}><Trash2 className="h-4 w-4 text-red-400"/></Button>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="w-full justify-start font-normal text-xs">
                                                <CalendarIcon className="mr-1 h-3 w-3" />{format(row.date, 'dd/MM/yyyy')}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={row.date} onSelect={(d) => d && handleUpdateNewRepayment(row.id, 'date', d)} /></PopoverContent>
                                    </Popover>
                                    <div className="grid grid-cols-3 gap-2">
                                        {currencies.map(c => (
                                            <Input key={c} type="number" placeholder={c.toUpperCase()} value={row.amount[c] || ''} onChange={(e) => handleUpdateNewRepayment(row.id, c, e.target.value)} className="h-8 text-right" />
                                        ))}
                                    </div>
                                    <Textarea placeholder="ໝາຍເຫດ (ຖ້າມີ)" value={row.note || ''} onChange={e => handleUpdateNewRepayment(row.id, 'note', e.target.value)} className="text-xs"/>
                                </div>
                            ))}
                            <Button onClick={handleAddNewRepaymentRow} className="w-full" variant="outline"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມລາຍການຊຳລະ</Button>
                            <Button onClick={handleMakePayment} className="w-full" disabled={newRepayments.length === 0}>ບັນທຶກການຊຳລະ</Button>
                        </CardContent>
                    </Card>
                 </div>
            </main>
        </div>
    );
}

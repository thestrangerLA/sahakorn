
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, DollarSign, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { listenToLoansByMember, addLoanRepayment } from '@/services/cooperativeLoanService';
import type { CooperativeMember, Loan, CurrencyValues } from '@/lib/types';
import Link from 'next/link';

const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];

const formatCurrencyDisplay = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

export default function LoanPaymentPage() {
    const { toast } = useToast();

    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

    const [loans, setLoans] = useState<Loan[]>([]);
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

    const [paymentDate, setPaymentDate] = useState<Date>(new Date());
    const [paymentAmount, setPaymentAmount] = useState<CurrencyValues>({...initialCurrencyValues});
    const [note, setNote] = useState('');
    const [paymentChannel, setPaymentChannel] = useState<'cash' | 'bank_bcel'>('cash');
    
    const selectedLoan = loans.find(l => l.id === selectedLoanId);

    useEffect(() => {
        const unsubscribe = listenToCooperativeMembers(setMembers);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if(selectedMemberId) {
            const unsubscribe = listenToLoansByMember(selectedMemberId, setLoans);
            return () => unsubscribe();
        } else {
            setLoans([]);
            setSelectedLoanId(null);
        }
    }, [selectedMemberId]);

    const handleAmountChange = (currency: keyof CurrencyValues, value: string) => {
        setPaymentAmount(prev => ({ ...prev, [currency]: Number(value) || 0 }));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedMemberId || !selectedLoanId || !selectedLoan) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບ", description: "ກະລຸນາເລືອກສະມາຊິກ ແລະ ສິນເຊື່ອ", variant: "destructive" });
            return;
        }
        const totalPayment = Object.values(paymentAmount).reduce((a,b) => a+b, 0);
        if(totalPayment === 0) {
            toast({ title: "ຈຳນວນເງິນຕ້ອງບໍ່ເປັນ 0", variant: "destructive" });
            return;
        }

        try {
            await addLoanRepayment(selectedLoanId, [{
                amount: paymentAmount,
                date: startOfDay(paymentDate),
                note: note,
                paymentChannel: paymentChannel,
            }]);

            toast({ title: "ຊໍາລະສຳເລັດ" });
            setPaymentAmount({...initialCurrencyValues});
            setNote('');
        } catch(error) {
            console.error(error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ຊຳລະສິນເຊື່ອ</h1>
            </header>
            <main className="flex flex-1 items-start justify-center p-4 sm:p-6">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>ຊໍາລະໜີ້</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="grid gap-4">
                            {/* เลือกสมาชิก */}
                            <div className="grid gap-2">
                                <Label>ສະມາຊິກ</Label>
                                <Select value={selectedMemberId || ''} onValueChange={(v) => setSelectedMemberId(v || null)}>
                                    <SelectTrigger><SelectValue placeholder="ເລືອກສະມາຊິກ..." /></SelectTrigger>
                                    <SelectContent>
                                        {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.memberId})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* เลือก Loan */}
                            <div className="grid gap-2">
                                <Label>ການກູ້</Label>
                                <Select value={selectedLoanId || ''} onValueChange={(v) => setSelectedLoanId(v || null)} disabled={!selectedMemberId}>
                                    <SelectTrigger><SelectValue placeholder="ເລືອກການກູ້..." /></SelectTrigger>
                                    <SelectContent>
                                        {loans.map(l => <SelectItem key={l.id} value={l.id}>{l.loanCode} - {l.loanType}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* วันที่ชำระ */}
                            <div className="grid gap-2">
                                <Label>ວັນທີຊໍາລະ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left">
                                            <CalendarIcon className="mr-2 h-4 w-4" /> {format(paymentDate, "PPP")}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={paymentDate} onSelect={(d) => setPaymentDate(d || new Date())} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* จำนวนเงิน */}
                            {selectedLoan && (
                                <div className="grid gap-2">
                                     <div className="grid gap-2">
                                        <Label>ຊ່ອງທາງການຊຳລະ</Label>
                                        <Select value={paymentChannel} onValueChange={(v) => setPaymentChannel(v as 'cash' | 'bank_bcel')}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">ເງິນສົດ (Cash)</SelectItem>
                                                <SelectItem value="bank_bcel">ບັນຊີ BCEL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Label>ຈຳນວນຊໍາລະ</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {currencies.map(cur => (
                                            <div key={cur}>
                                                <Label className="text-xs">{cur.toUpperCase()}</Label>
                                                <Input type="number" value={paymentAmount[cur] || ''} onChange={e => handleAmountChange(cur, e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid gap-2 mt-2">
                                         <Label htmlFor="note">ໝາຍເຫດ</Label>
                                         <Input id="note" value={note} onChange={e => setNote(e.target.value)} />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <Button type="submit" className="flex items-center gap-2"><DollarSign /> ຊໍາລະ</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

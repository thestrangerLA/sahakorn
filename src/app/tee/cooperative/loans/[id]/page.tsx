
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Loan, LoanRepayment, CurrencyValues, CooperativeMember } from '@/lib/types';
import { listenToRepaymentsForLoan, listenToLoan, deleteLoanRepayment, updateLoanRepayment } from '@/services/cooperativeLoanService';
import { getCooperativeMember } from '@/services/cooperativeMemberService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const currencies: (keyof Loan['amount'])[] = ['kip', 'thb', 'usd'];

export default function LoanDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    const [loan, setLoan] = useState<Loan | null>(null);
    const [member, setMember] = useState<CooperativeMember | null>(null);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [repaymentToDelete, setRepaymentToDelete] = useState<LoanRepayment | null>(null);


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
        const paid: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
        const outstanding: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
        const loanWithInterest: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

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

    const handleRepaymentUpdate = async (repaymentId: string, field: keyof LoanRepayment, value: any) => {
        try {
            await updateLoanRepayment(repaymentId, { [field]: value });
            // The listener will automatically update the state, no need for toast here to avoid being noisy
        } catch (error) {
            console.error("Failed to update repayment:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: "ບໍ່ສາມາດອັບເດດຂໍ້ມູນການຊຳລະໄດ້", variant: "destructive" });
        }
    };
    
    const handleRepaymentAmountUpdate = async (repaymentId: string, currency: 'kip' | 'thb' | 'usd', value: number) => {
        const repayment = repayments.find(r => r.id === repaymentId);
        if (!repayment) return;

        const updatedAmountPaid = {
            ...repayment.amountPaid,
            [currency]: value
        };
        
        try {
            await updateLoanRepayment(repaymentId, { amountPaid: updatedAmountPaid });
        } catch (error) {
             console.error("Failed to update repayment amount:", error);
             toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: "ບໍ່ສາມາດອັບເດດຈຳນວນເງິນໄດ້", variant: "destructive" });
        }
    }


    const handleDeleteClick = (e: React.MouseEvent, repayment: LoanRepayment) => {
        e.stopPropagation();
        setRepaymentToDelete(repayment);
    };

    const confirmDelete = async () => {
        if (!repaymentToDelete) return;
        try {
            await deleteLoanRepayment(repaymentToDelete.id);
            toast({
                title: "ລົບການຊຳລະສຳເລັດ",
            });
        } catch (error) {
            console.error("Error deleting repayment:", error);
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                variant: "destructive",
            });
        } finally {
            setRepaymentToDelete(null);
        }
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
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="space-y-4">
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
                        <CardHeader>
                            <CardTitle>ປະຫວັດການຊຳລະ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px]">ວັນທີ</TableHead>
                                        <TableHead className="text-right">KIP</TableHead>
                                        <TableHead className="text-right">THB</TableHead>
                                        <TableHead className="text-right">USD</TableHead>
                                        <TableHead>ໝາຍເຫດ</TableHead>
                                        <TableHead className="text-center">ລຶບ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {repayments.length > 0 ? (
                                        repayments.map(r => (
                                            <TableRow key={r.id}>
                                                <TableCell>{format(r.repaymentDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="p-1">
                                                    <Input type="number" defaultValue={r.amountPaid.kip} onBlur={(e) => handleRepaymentAmountUpdate(r.id, 'kip', Number(e.target.value))} className="h-8 text-right"/>
                                                </TableCell>
                                                <TableCell className="p-1">
                                                     <Input type="number" defaultValue={r.amountPaid.thb} onBlur={(e) => handleRepaymentAmountUpdate(r.id, 'thb', Number(e.target.value))} className="h-8 text-right"/>
                                                </TableCell>
                                                <TableCell className="p-1">
                                                     <Input type="number" defaultValue={r.amountPaid.usd} onBlur={(e) => handleRepaymentAmountUpdate(r.id, 'usd', Number(e.target.value))} className="h-8 text-right"/>
                                                </TableCell>
                                                <TableCell className="p-1">
                                                    <Input defaultValue={r.note} onBlur={(e) => handleRepaymentUpdate(r.id, 'note', e.target.value)} className="h-8"/>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, r)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">ບໍ່ມີປະຫວັດການຊຳລະ</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                 </div>
                 <AlertDialog open={!!repaymentToDelete} onOpenChange={(open) => !open && setRepaymentToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>ຢືນຢັນການລົບ</AlertDialogTitle>
                            <AlertDialogDescription>
                                ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບລາຍການຊຳລະນີ້? ການກະທຳນີ້ບໍ່ສາມາດຍ້ອນກັບໄດ້.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => { e.stopPropagation(); setRepaymentToDelete(null); }}>ຍົກເລີກ</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete}>ຢືນຢັນ</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </div>
    );
}



"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Handshake, PlusCircle, MoreHorizontal, Banknote, CheckCircle, Hourglass } from "lucide-react";
import { format } from 'date-fns';
import type { Loan, CooperativeMember, LoanRepayment } from '@/lib/types';
import { listenToCooperativeLoans, deleteLoan, listenToAllRepayments } from '@/services/cooperativeLoanService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { Badge } from '@/components/ui/badge';
import { useClientRouter } from '@/hooks/useClientRouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function CooperativeLoansPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useClientRouter();
    const { toast } = useToast();
    
    const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

    useEffect(() => {
        const unsubscribeLoans = listenToCooperativeLoans(setLoans, () => setLoading(false));
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        const unsubscribeRepayments = listenToAllRepayments(setRepayments);
        return () => {
            unsubscribeLoans();
            unsubscribeMembers();
            unsubscribeRepayments();
        };
    }, []);

    const memberMap = useMemo(() => {
        return members.reduce((acc, member) => {
            acc[member.id] = member.name;
            return acc;
        }, {} as Record<string, string>);
    }, [members]);

    const summary = useMemo(() => {
        const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
        const activeLoans = loans.filter(l => l.status === 'disbursed' || l.status === 'overdue').length;
        const pendingLoans = loans.filter(l => l.status === 'submitted').length;
        
        const repaymentsByLoan = repayments.reduce((acc, r) => {
            if (!acc[r.loanId]) {
                acc[r.loanId] = 0;
            }
            acc[r.loanId] += r.amountPaid;
            return acc;
        }, {} as Record<string, number>);

        const totalPaidAmount = loans
            .filter(l => l.status === 'paid_off')
            .reduce((sum, l) => sum + l.amount, 0);

        const totalOutstandingAmount = loans
            .filter(l => l.status !== 'paid_off' && l.status !== 'rejected' && l.status !== 'draft')
            .reduce((sum, l) => {
                const totalLoanWithInterest = l.amount * (1 + (l.interestRate || 0) / 100);
                const paidAmount = repaymentsByLoan[l.id] || 0;
                return sum + (totalLoanWithInterest - paidAmount);
            }, 0);


        return { totalLoanAmount, activeLoans, pendingLoans, totalPaidAmount, totalOutstandingAmount };
    }, [loans, repayments]);

    const handleRowClick = (loanId: string) => {
        router.push(`/tee/cooperative/loans/${loanId}`);
    };
    
    const handleDeleteClick = (e: React.MouseEvent, loan: Loan) => {
        e.stopPropagation();
        setLoanToDelete(loan);
    };

    const confirmDelete = async () => {
        if (!loanToDelete) return;
        try {
            await deleteLoan(loanToDelete.id);
            toast({
                title: "ລົບສິນເຊື່ອສຳເລັດ",
                description: `ສິນເຊື່ອລະຫັດ ${loanToDelete.loanCode} ໄດ້ຖືກລົບອອກແລ້ວ.`,
            });
        } catch (error) {
            console.error("Error deleting loan:", error);
            toast({
                title: "ເກີດຂໍ້ຜິດພາດ",
                description: "ບໍ່ສາມາດລົບສິນເຊື່ອໄດ້.",
                variant: "destructive",
            });
        } finally {
            setLoanToDelete(null);
        }
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ຍອດສິນເຊື່ອທັງໝົດ</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.totalLoanAmount)} KIP</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ສິນເຊື່ອທີ່ເຄື່ອນໄຫວ</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{summary.activeLoans}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ລໍຖ້າອະນຸມັດ</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{summary.pendingLoans}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ຍອດສິນເຊື່ອຈ່າຍແລ້ວ</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaidAmount)} KIP</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ຍອດສິນເຊື່ອຄົງເຫຼືອ</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutstandingAmount)} KIP</p></CardContent>
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
                                    <TableHead className="text-right">ຈຳນວນເງິນ</TableHead>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ສະຖານະ</TableHead>
                                    <TableHead className="text-right">ການດຳເນີນການ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">ກຳລັງໂຫລດ...</TableCell></TableRow>
                                ) : loans.length > 0 ? (
                                    loans.map(loan => (
                                        <TableRow key={loan.id} onClick={() => handleRowClick(loan.id)} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell className="font-mono">{loan.loanCode}</TableCell>
                                            <TableCell>{memberMap[loan.memberId] || 'N/A'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(loan.amount)}</TableCell>
                                            <TableCell>{format(loan.applicationDate, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell><Badge>{loan.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => handleRowClick(loan.id)}>
                                                            ເບິ່ງລາຍລະອຽດ
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="text-red-500" 
                                                            onSelect={(e) => handleDeleteClick(e, loan)}
                                                        >
                                                            ລົບ
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
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

            <AlertDialog open={!!loanToDelete} onOpenChange={(open) => !open && setLoanToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                        <AlertDialogDescription>
                            คุณแน่ใจหรือไม่ว่าต้องการลบสินเชื่อรหัส "{loanToDelete?.loanCode}" ของ "{memberMap[loanToDelete?.memberId || '']}"? 
                            การกระทำนี้จะลบข้อมูลการชำระคืนทั้งหมดที่เกี่ยวข้องและไม่สามารถย้อนกลับได้
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>ຍົກເລີກ</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>ຢືນຢັນ</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

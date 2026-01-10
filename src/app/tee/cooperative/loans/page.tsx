
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Handshake, PlusCircle, MoreHorizontal, Banknote, CheckCircle, Hourglass, ChevronDown } from "lucide-react";
import { format, getYear } from 'date-fns';
import type { Loan, CooperativeMember, LoanRepayment, CurrencyValues } from '@/lib/types';
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
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
const currencies: (keyof Pick<CurrencyValues, 'kip' | 'thb' | 'usd'>)[] = ['kip', 'thb', 'usd'];

export default function CooperativeLoansPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useClientRouter();
    const { toast } = useToast();
    
    const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());


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
    
    const availableYears = useMemo(() => {
        const years = new Set(loans.map(l => getYear(l.applicationDate)));
        return Array.from(years).sort((a, b) => b - a);
    }, [loans]);

    const memberMap = useMemo(() => {
        return members.reduce((acc, member) => {
            acc[member.id] = member.name;
            return acc;
        }, {} as Record<string, string>);
    }, [members]);

    const loansWithDetails = useMemo(() => {
      const filteredLoans = loans.filter(loan => {
        if (!selectedYear) return true;
        return getYear(loan.applicationDate) === selectedYear;
      });

      return filteredLoans.map(loan => {
        const loanRepayments = repayments.filter(r => r.loanId === loan.id);

        const principal: CurrencyValues = { ...initialCurrencyValues };
        const principalAndInterest: CurrencyValues = { ...initialCurrencyValues };
        const totalPaid: CurrencyValues = { ...initialCurrencyValues };
        const outstandingBalance: CurrencyValues = { ...initialCurrencyValues };
        const profit: CurrencyValues = { ...initialCurrencyValues };

        currencies.forEach(c => {
          const p = loan.amount?.[c] || 0;
          principal[c] = p;

          const interest = p * ((loan.interestRate || 0) / 100);
          principalAndInterest[c] = p + interest;

          totalPaid[c] = loanRepayments.reduce(
            (sum, r) => sum + (r.amountPaid?.[c] || 0),
            0
          );

          outstandingBalance[c] = principalAndInterest[c] - totalPaid[c];
          
          if(totalPaid[c] > 0) {
              const paidTowardsInterest = Math.max(0, totalPaid[c] - p);
              profit[c] = Math.min(paidTowardsInterest, interest);
          }
        });

        const totalOutstanding = currencies.reduce(
          (sum, c) => sum + outstandingBalance[c],
          0
        );

        const calculatedStatus =
          totalOutstanding <= 0.01 ? 'ຈ່າຍໝົດແລ້ວ' : 'ຍັງຄ້າງ';

        return {
          ...loan,
          principal,
          principalAndInterest,
          totalPaid,
          outstandingBalance,
          profit,
          calculatedStatus,
        };
      });
    }, [loans, repayments, selectedYear]);

    const summary = useMemo(() => {
        const totalLoanAmount: CurrencyValues = { ...initialCurrencyValues };
        const totalPaidAmount: CurrencyValues = { ...initialCurrencyValues };
        const totalOutstandingAmount: CurrencyValues = { ...initialCurrencyValues };
        const totalProfitAmount: CurrencyValues = { ...initialCurrencyValues };

        loansWithDetails.forEach(loan => {
            currencies.forEach(c => {
                totalLoanAmount[c] += loan.principal[c] || 0;
                totalPaidAmount[c] += loan.totalPaid[c] || 0;
                totalProfitAmount[c] += loan.profit[c] || 0;

                if (loan.calculatedStatus !== 'ຈ່າຍໝົດແລ້ວ') {
                    totalOutstandingAmount[c] += loan.outstandingBalance[c] || 0;
                }
            });
        });

        return { totalLoanAmount, totalPaidAmount, totalOutstandingAmount, totalProfitAmount };
    }, [loansWithDetails]);


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
                <div className="ml-auto flex items-center gap-2">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                                <span>{selectedYear ? `ປີ ${selectedYear + 543}` : 'ທຸກໆປີ'}</span>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedYear(null)}>ທຸກໆປີ</DropdownMenuItem>
                            {availableYears.map(year => (
                                <DropdownMenuItem key={year} onClick={() => setSelectedYear(year)}>
                                    ປີ {year + 543}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" asChild>
                        <Link href="/tee/cooperative/loans/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            ສ້າງຄຳຮ້ອງສິນເຊື່ອ
                        </Link>
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {currencies.map(c => (
                        <Card key={c}>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              ສະຫຼຸບຍອດ {c.toUpperCase()}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">ຍອດສິນເຊື່ອທັງໝົດ</span>
                              <span className="font-medium">
                                {formatCurrency(summary.totalLoanAmount[c])}
                              </span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">ຍອດກຳໄລ</span>
                                <span className="font-medium text-blue-600">
                                    {formatCurrency(summary.totalProfitAmount[c])}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">ຍອດຈ່າຍແລ້ວ</span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(summary.totalPaidAmount[c])}
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">ຍອດຄົງເຫຼືອ</span>
                              <span className="font-medium text-red-600">
                                {formatCurrency(summary.totalOutstandingAmount[c])}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>ລາຍການສິນເຊື່ອທັງໝົດ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ລະຫັດ/ຊື່</TableHead>
                                    <TableHead className="text-right">ເງິນຕົ້ນ</TableHead>
                                    <TableHead className="text-right">ກຳໄລ</TableHead>
                                    <TableHead className="text-right">ເງິນຕົ້ນ+ກຳໄລ</TableHead>
                                    <TableHead className="text-right">ຍອດຈ່າຍແລ້ວ</TableHead>
                                    <TableHead className="text-right">ຍອດຄົງເຫຼືອ</TableHead>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ສະຖານະ</TableHead>
                                    <TableHead className="text-right">ການດຳເນີນການ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={10} className="text-center h-24">ກຳລັງໂຫລດ...</TableCell></TableRow>
                                ) : loansWithDetails.length > 0 ? (
                                    loansWithDetails.map(loan => (
                                        <TableRow key={loan.id} onClick={() => handleRowClick(loan.id)} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell>
                                                <div className="font-mono">{loan.loanCode}</div>
                                                <div>{memberMap[loan.memberId] || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 {currencies.map(c => {
                                                    const amount = loan.principal[c] || 0;
                                                    return amount > 0 ? <div key={c}>{formatCurrency(amount)} {c.toUpperCase()}</div> : null;
                                                })}
                                            </TableCell>
                                             <TableCell className="text-right text-blue-500">
                                                {currencies.map(c => {
                                                    const amount = loan.principalAndInterest[c] - loan.principal[c] || 0;
                                                    return amount > 0 ? <div key={c}>{formatCurrency(amount)} {c.toUpperCase()}</div> : null;
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                 {currencies.map(c => {
                                                    const amount = loan.principalAndInterest[c] || 0;
                                                    return amount > 0 ? <div key={c}>{formatCurrency(amount)} {c.toUpperCase()}</div> : null;
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600">
                                                {currencies.map(c => {
                                                    const amount = loan.totalPaid[c] || 0;
                                                    return (loan.amount?.[c] || 0) > 0 || amount > 0 ? <div key={c}>{formatCurrency(amount)} {c.toUpperCase()}</div> : null;
                                                })}
                                            </TableCell>
                                             <TableCell className="text-right text-red-600">
                                                {currencies.map(c => {
                                                     if ((loan.amount?.[c] || 0) === 0 && (loan.totalPaid[c] || 0) === 0) return null;
                                                     const amount = loan.outstandingBalance[c] || 0;
                                                     return <div key={c}>{formatCurrency(amount)} {c.toUpperCase()}</div>;
                                                })}
                                            </TableCell>
                                            <TableCell>{format(loan.applicationDate, 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>
                                                <Badge variant={loan.calculatedStatus === 'ຈ່າຍໝົດແລ້ວ' ? 'success' : 'warning'}>
                                                    {loan.calculatedStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>ການດຳເນີນການ</DropdownMenuLabel>
                                                        <DropdownMenuItem 
                                                            className="text-red-500"
                                                            onClick={(e) => handleDeleteClick(e, loan)}
                                                        >
                                                            ລົບ
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={10} className="text-center h-24">ບໍ່ມີຂໍ້ມູນສິນເຊື່ອ</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
            <AlertDialog open={!!loanToDelete} onOpenChange={(open) => !open && setLoanToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ຢືນยันການລົບ</AlertDialogTitle>
                        <AlertDialogDescription>
                            ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບສິນເຊື່ອລະຫັດ "{loanToDelete?.loanCode}" ຂອງ "{memberMap[loanToDelete?.memberId || '']}"? 
                            ການກະທຳນີ້ຈະລົບຂໍ້ມູນການຊຳລະຄືນທັງໝົດທີ່ກ່ຽວຂ້ອງ ແລະ ບໍ່ສາມາດย้อนกลับໄດ້.
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

    
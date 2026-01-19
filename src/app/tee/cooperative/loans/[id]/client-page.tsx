
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
import { ArrowLeft, Trash2, Calendar as CalendarIcon, PlusCircle, Edit, Save } from "lucide-react";
import { format, addYears } from "date-fns";
import type { Loan, LoanRepayment, CurrencyValues, CooperativeMember } from '@/lib/types';
import { listenToRepaymentsForLoan, listenToLoan, deleteLoanRepayment, updateLoanRepayment, addLoanRepayment, updateLoan } from '@/services/cooperativeLoanService';
import { getCooperativeMember } from '@/services/cooperativeMemberService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';


const formatCurrency = (value: number) => {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

const currencies: (keyof Omit<CurrencyValues, 'cny'>)[] = ['kip', 'thb', 'usd'];
const initialCurrencyValues: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };


type NewRepayment = {
    id: string;
    date: Date;
    note?: string;
    amount: Omit<CurrencyValues, 'cny'>;
};

export default function LoanDetailPageClient({ initialLoan }: { initialLoan: Loan }) {
    const { toast } = useToast();

    const [loan, setLoan] = useState<Loan | null>(initialLoan);
    const [member, setMember] = useState<CooperativeMember | null>(null);
    const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
    
    const [repaymentToDelete, setRepaymentToDelete] = useState<LoanRepayment | null>(null);
    const [newRepayments, setNewRepayments] = useState<NewRepayment[]>([]);

    const [isEditing, setIsEditing] = useState(false);
    const [editedLoan, setEditedLoan] = useState<Loan | null>(initialLoan);


    useEffect(() => {
        if (!initialLoan?.id) return;

        const unsubscribeLoan = listenToLoan(initialLoan.id, async (loanData) => {
            if (loanData) {
                setLoan(loanData);
                setEditedLoan(loanData);
                if (loanData.memberId && (!member || member.id !== loanData.memberId)) {
                    const memberData = await getCooperativeMember(loanData.memberId);
                    setMember(memberData);
                }
            }
        });

        const unsubscribeRepayments = listenToRepaymentsForLoan(initialLoan.id, setRepayments);
        
        return () => {
            unsubscribeLoan();
            unsubscribeRepayments();
        };
    }, [initialLoan?.id, member]);

     const { totalPaid, outstandingBalance, totalLoanWithInterest, repaymentSchedule } = useMemo(() => {
        if (!loan) {
            return {
                totalPaid: { ...initialCurrencyValues },
                outstandingBalance: { ...initialCurrencyValues },
                totalLoanWithInterest: { ...initialCurrencyValues },
                repaymentSchedule: []
            };
        }
        
        const paid = repayments.reduce((acc, r) => {
            currencies.forEach(c => {
                acc[c] += r.amountPaid?.[c] || 0;
            });
            return acc;
        }, { ...initialCurrencyValues });
    
        const outstanding = currencies.reduce((acc, c) => {
            const balance = (loan.repaymentAmount[c] || 0) - paid[c];
            acc[c] = Math.abs(balance) < 0.01 ? 0 : balance; // Handle floating point inaccuracies
            return acc;
        }, { ...initialCurrencyValues });
        
        // Calculate running balance for display
        let runningBalance = { ...(loan.repaymentAmount) };
        const scheduleWithBalances = [...repayments]
            .sort((a, b) => a.repaymentDate.getTime() - b.repaymentDate.getTime()) // Oldest first
            .map(repayment => {
                const outstandingForThisRow = { ...runningBalance };
                 currencies.forEach(c => {
                    runningBalance[c] -= (repayment.amountPaid?.[c] || 0);
                });

                const principalPortion = { ...initialCurrencyValues };
                const profitPortion = { ...initialCurrencyValues };

                currencies.forEach(c => {
                    const payment = repayment.amountPaid[c] || 0;
                    if (payment <= 0) return;

                    const totalProfitForLoan = (loan.repaymentAmount[c] || 0) - (loan.amount[c] || 0);
                    const totalPrincipalForLoan = loan.amount[c] || 0;

                    const paidPrincipalBeforeThis = repayments
                        .filter(r => r.repaymentDate.getTime() < repayment.repaymentDate.getTime())
                        .reduce((sum, r) => sum + (r.principalPortion?.[c] || 0), 0);
                    
                    const paidProfitBeforeThis = repayments
                        .filter(r => r.repaymentDate.getTime() < repayment.repaymentDate.getTime())
                        .reduce((sum, r) => sum + (r.profitPortion?.[c] || 0), 0);

                    const remainingProfit = totalProfitForLoan - paidProfitBeforeThis;
                    
                    const profitPaidThisTime = Math.min(payment, Math.max(0, remainingProfit));
                    profitPortion[c] = profitPaidThisTime;

                    const principalPaidThisTime = payment - profitPaidThisTime;
                    principalPortion[c] = principalPaidThisTime;
                });

                // We return the outstanding *before* this payment for the "outstanding" column in that row
                return { ...repayment, outstandingBalance: outstandingForThisRow, principalPortion, profitPortion };
            })
            .sort((a, b) => b.repaymentDate.getTime() - a.repaymentDate.getTime()); // Newest first for display
    
        return { 
            totalPaid: paid, 
            outstandingBalance: outstanding, 
            totalLoanWithInterest: loan.repaymentAmount,
            repaymentSchedule: scheduleWithBalances,
        };
    }, [repayments, loan]);

    const handleSaveLoanInfo = async () => {
        if (!editedLoan) return;
        try {
            await updateLoan(editedLoan.id, { 
                loanCode: editedLoan.loanCode,
                purpose: editedLoan.purpose,
                durationYears: editedLoan.durationYears,
            });
            toast({ title: 'ອັບເດດຂໍ້ມູນສິນເຊື່ອສຳເລັດ' });
            setIsEditing(false);
        } catch (error) {
            toast({ title: 'ເກີດຂໍ້ຜິດພາດ', variant: 'destructive' });
        }
    };
    
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

    const handleAddNewRepaymentRow = () => {
        setNewRepayments(prev => [...prev, { id: uuidv4(), date: new Date(), amount: { kip: 0, thb: 0, usd: 0 } }]);
    };

    const handleNewRepaymentChange = (id: string, field: 'date' | 'note' | `amount.${keyof Omit<CurrencyValues, 'cny'>}`, value: any) => {
        setNewRepayments(prev => prev.map(r => {
            if (r.id === id) {
                if (field.startsWith('amount.')) {
                    const currency = field.split('.')[1] as keyof Omit<CurrencyValues, 'cny'>;
                    return { ...r, amount: { ...r.amount, [currency]: Number(value) }};
                }
                return { ...r, [field]: value };
            }
            return r;
        }));
    };
    
    const removeNewRepaymentRow = (id: string) => {
        setNewRepayments(prev => prev.filter(r => r.id !== id));
    };

    const handleConfirmRepayments = async () => {
        if (!loan?.id) return;
        const validRepayments = newRepayments.filter(r => (r.amount.kip || 0) > 0 || (r.amount.thb || 0) > 0 || (r.amount.usd || 0) > 0);
        if (validRepayments.length === 0) {
            toast({ title: "ບໍ່ມີລາຍການຊຳລະ", description: "ກະລຸນາປ້ອນຈຳນວນເງິນຢ່າງໜ້ອຍໜຶ່ງລາຍການ", variant: "destructive"});
            return;
        }

        try {
            await addLoanRepayment(loan.id, validRepayments);
            toast({ title: "ບັນທຶກການຊຳລະສຳເລັດ" });
            setNewRepayments([]);
        } catch (error) {
            console.error("Error confirming repayments:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ", variant: "destructive"});
        }
    };


    if (!loan || !editedLoan) return <div className="text-center p-8">Loading loan details...</div>;

    const totalOutstandingValue = Object.values(outstandingBalance).reduce((sum, val) => sum + val, 0);
    
    const dueDate = loan.durationYears ? addYears(loan.applicationDate, loan.durationYears) : null;


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/loans"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ລາຍລະອຽດສິນເຊື່ອ: {loan.loanCode}</h1>
                 <div className="ml-auto">
                    {isEditing ? (
                        <Button size="sm" onClick={handleSaveLoanInfo}><Save className="mr-2 h-4 w-4"/>ບັນທຶກ</Button>
                    ) : (
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4"/>ແກ້ໄຂ</Button>
                    )}
                </div>
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
                             <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                 <div>
                                    <Label>ລະຫັດສິນເຊື່ອ:</Label>
                                    {isEditing ? <Input value={editedLoan.loanCode} onChange={e => setEditedLoan(p => p? {...p, loanCode: e.target.value} : null)} /> : <p className="font-semibold">{loan.loanCode}</p>}
                                </div>
                                <div><span className="font-semibold">ຜູ້ກູ້ຢືມ:</span> {loan.memberId ? member?.name : loan.debtorName || '...'}</div>
                                 <div>
                                    <Label>ຈຸດປະສົງ:</Label>
                                    {isEditing ? <Input value={editedLoan.purpose} onChange={e => setEditedLoan(p => p? {...p, purpose: e.target.value} : null)} /> : <p className="font-semibold">{loan.purpose || '-'}</p>}
                                </div>
                                <div>
                                    <Label>ໄລຍະເວລາ (ປີ):</Label>
                                    {isEditing ? <Input type="number" value={editedLoan.durationYears} onChange={e => setEditedLoan(p => p ? {...p, durationYears: Number(e.target.value)} : null)} /> : <p className="font-semibold">{loan.durationYears || 'N/A'} ປີ</p>}
                                </div>
                                <div><span className="font-semibold">ວັນທີເລີ່ມສັນຍາ:</span> {format(loan.applicationDate, 'dd/MM/yyyy')}</div>
                                <div><span className="font-semibold">ວັນຄົບກຳນົດ:</span> {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'N/A'}</div>
                            </div>
                            <Table className="mt-4">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ສະກຸນເງິນ</TableHead>
                                        <TableHead className="text-right">ເງິນຕົ້ນ</TableHead>
                                        <TableHead className="text-right">ກຳໄລ</TableHead>
                                        <TableHead className="text-right">ຍອດຕ້ອງຈ່າຍ</TableHead>
                                        <TableHead className="text-right">ຈ່າຍແລ້ວ</TableHead>
                                        <TableHead className="text-right">ຍອດຄົງເຫຼືອ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currencies.map(c => {
                                        const principal = loan.amount[c] || 0;
                                        const totalToRepay = totalLoanWithInterest[c] || 0;
                                        const profit = totalToRepay - principal;
                                        if (principal === 0 && totalToRepay === 0) return null;
                                        return (
                                            <TableRow key={c}>
                                                <TableCell className="font-semibold uppercase">{c}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(principal)}</TableCell>
                                                <TableCell className="text-right text-blue-600">{formatCurrency(profit)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(totalToRepay)}</TableCell>
                                                <TableCell className="text-right text-green-600">{formatCurrency(totalPaid[c] || 0)}</TableCell>
                                                <TableCell className="text-right font-bold text-red-600">{formatCurrency(outstandingBalance[c] || 0)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>ເພີ່ມການຊຳລະຄືນ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {newRepayments.map((r, index) => (
                                    <div key={r.id} className="flex items-center gap-2 p-2 border rounded-md">
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className="w-[150px] justify-start text-left font-normal h-9">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {r.date ? format(r.date, "dd/MM/yy") : <span>ເລືອກວັນທີ</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={r.date} onSelect={(date) => handleNewRepaymentChange(r.id, 'date', date)} initialFocus /></PopoverContent>
                                        </Popover>
                                        {currencies.map(c => (
                                            (loan.amount[c] || 0) > 0 &&
                                            <div key={c} className="flex items-center gap-1">
                                                <Label htmlFor={`new-repayment-${c}-${index}`} className="uppercase text-xs">{c}</Label>
                                                <Input id={`new-repayment-${c}-${index}`} type="number" value={r.amount[c]} onChange={(e) => handleNewRepaymentChange(r.id, `amount.${c}`, e.target.value)} className="h-9 w-[100px] text-right"/>
                                            </div>
                                        ))}
                                        <Textarea value={r.note} onChange={e => handleNewRepaymentChange(r.id, 'note', e.target.value)} placeholder="ໝາຍເຫດ" className="h-9 flex-1" />
                                        <Button variant="ghost" size="icon" onClick={() => removeNewRepaymentRow(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex justify-between">
                                <Button variant="outline" onClick={handleAddNewRepaymentRow}><PlusCircle className="mr-2 h-4 w-4"/>ເພີ່ມລາຍການຊຳລະ</Button>
                                {newRepayments.length > 0 && <Button onClick={handleConfirmRepayments}>ຢືນຢັນການຊຳລະ</Button>}
                            </div>
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
                                        <TableHead>ວັນທີຈ່າຍ</TableHead>
                                        <TableHead>ຍອດຈ່າຍ</TableHead>
                                        <TableHead>ຕົ້ນທຶນ</TableHead>
                                        <TableHead>ກຳໄລ</TableHead>
                                        <TableHead>ຍອດຄົງເຫຼືອ</TableHead>
                                        <TableHead className="text-center">ລຶບ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {repaymentSchedule.length > 0 ? (
                                        repaymentSchedule.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell>{format(r.repaymentDate, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>
                                                    {currencies.map(c => (
                                                        (r.amountPaid?.[c] > 0) && <div key={c}>{formatCurrency(r.amountPaid[c])} {c.toUpperCase()}</div>
                                                    ))}
                                                </TableCell>
                                                <TableCell>
                                                    {currencies.map(c => (
                                                        (r.principalPortion?.[c] > 0) && <div key={c}>{formatCurrency(r.principalPortion[c])} {c.toUpperCase()}</div>
                                                    ))}
                                                </TableCell>
                                                <TableCell>
                                                    {currencies.map(c => (
                                                        (r.profitPortion?.[c] > 0) && <div key={c}>{formatCurrency(r.profitPortion[c])} {c.toUpperCase()}</div>
                                                    ))}
                                                </TableCell>
                                                 <TableCell>
                                                    {currencies.map(c => (
                                                        (loan.amount?.[c] > 0 || (r.outstandingBalance && r.outstandingBalance[c])) && 
                                                        <div key={c}>{formatCurrency(r.outstandingBalance[c])} {c.toUpperCase()}</div>
                                                    ))}
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

    
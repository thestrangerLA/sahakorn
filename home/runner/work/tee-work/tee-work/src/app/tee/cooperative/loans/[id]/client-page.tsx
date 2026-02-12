
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import { format, addYears } from "date-fns";
import {
  ArrowLeft,
  Trash2,
  Calendar as CalendarIcon,
  PlusCircle,
  Edit,
  Save,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

import type { Loan, LoanRepayment, CurrencyValues, CooperativeMember } from '@/lib/types';
import {
  listenToLoan,
  listenToRepaymentsForLoan,
  addLoanRepayment,
  deleteLoanRepayment,
  updateLoan,
} from '@/services/cooperativeLoanService';
import { getCooperativeMember } from '@/services/cooperativeMemberService';
import { useToast } from "@/hooks/use-toast";
import { toDateSafe } from "@/lib/timestamp";

const currencies: (keyof Omit<CurrencyValues, "cny">)[] = [
  "kip",
  "thb",
  "usd",
];

const formatCurrency = (v = 0) =>
  new Intl.NumberFormat("lo-LA").format(v);

type NewRepayment = {
  id: string;
  date: Date;
  amount: Omit<CurrencyValues, "cny">;
  note?: string;
};

export default function LoanDetailPageClient({
  initialLoan,
}: {
  initialLoan: Loan;
}) {
  const { toast } = useToast();

  const [loan, setLoan] = useState<Loan | null>(initialLoan);
  const [member, setMember] = useState<CooperativeMember | null>(null);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [newRepayments, setNewRepayments] = useState<NewRepayment[]>([]);
  const [repaymentToDelete, setRepaymentToDelete] =
    useState<LoanRepayment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLoan, setEditedLoan] = useState<Loan | null>(initialLoan);

  /* ---------------- listen realtime ---------------- */
  useEffect(() => {
    if (!initialLoan.id) return;

    const unsubLoan = listenToLoan(initialLoan.id, async (loanData) => {
        if (loanData) {
            setLoan(loanData);
            setEditedLoan(loanData);
            if (loanData.memberId && (!member || member.id !== loanData.memberId)) {
                const memberData = await getCooperativeMember(loanData.memberId);
                setMember(memberData);
            }
        }
    });

    const unsubRepay = listenToRepaymentsForLoan(
      initialLoan.id,
      setRepayments
    );
    return () => {
      unsubLoan();
      unsubRepay();
    };
  }, [initialLoan.id, member]);

  /* ---------------- summary ---------------- */
    const totalPaid = useMemo(() => {
        return repayments.reduce(
        (acc, r) => {
            currencies.forEach(
            (c) => (acc[c] += r.amountPaid?.[c] || 0)
            );
            return acc;
        },
        { kip: 0, thb: 0, usd: 0 }
        );
    }, [repayments]);

    const outstandingBalance = useMemo(() => {
        if (!loan) return { kip: 0, thb: 0, usd: 0 };
        return currencies.reduce(
        (acc, c) => {
            const totalRepayable = loan.repaymentAmount?.[c] || 0;
            const paid = totalPaid[c] || 0;
            acc[c] = totalRepayable - paid;
            return acc;
        },
        { kip: 0, thb: 0, usd: 0 }
        );
    }, [loan, totalPaid]);

    const isSettled = useMemo(() => 
        Object.values(outstandingBalance).every(v => v <= 0.01)
    , [outstandingBalance]);

  const repaymentHistory = useMemo(() => {
    if (!loan) return [];

    const history: (LoanRepayment & { amountToPay: Omit<CurrencyValues, 'cny'>, remaining: Omit<CurrencyValues, 'cny'> })[] = [];
    const sortedRepayments = [...repayments].sort((a, b) => a.repaymentDate.getTime() - b.repaymentDate.getTime());
    
    let runningBalance = { ...(loan.repaymentAmount || { kip: 0, thb: 0, usd: 0 }) };

    for (const repayment of sortedRepayments) {
        const amountToPayThisTime = { ...runningBalance };

        const amountPaid = repayment.amountPaid || { kip: 0, thb: 0, usd: 0 };
        
        const remainingAfterPayment = {
            kip: (amountToPayThisTime.kip || 0) - (amountPaid.kip || 0),
            thb: (amountToPayThisTime.thb || 0) - (amountPaid.thb || 0),
            usd: (amountToPayThisTime.usd || 0) - (amountPaid.usd || 0),
        };

        history.push({
            ...repayment,
            amountToPay: amountToPayThisTime,
            remaining: remainingAfterPayment,
        });

        runningBalance = remainingAfterPayment;
    }

    return history.sort((a, b) => b.repaymentDate.getTime() - a.repaymentDate.getTime());
  }, [loan, repayments]);


  /* ---------------- handlers ---------------- */
  const handleConfirmRepayments = async () => {
    if (!loan) return;

    const valid = newRepayments.filter((r) =>
      currencies.some((c) => r.amount[c] > 0)
    );

    if (!valid.length) {
      toast({
        title: "ບໍ່ມີຈຳນວນເງິນ",
        variant: "destructive",
      });
      return;
    }

    await addLoanRepayment(loan.id, valid);
    setNewRepayments([]);
    toast({ title: "ບັນທຶກສຳເລັດ" });
  };

  const confirmDelete = async () => {
    if (!repaymentToDelete) return;
    await deleteLoanRepayment(repaymentToDelete.id);
    setRepaymentToDelete(null);
    toast({ title: "ລົບສຳເລັດ" });
  };
  
    const handleSaveLoanInfo = async () => {
        if (!editedLoan) return;
        try {
            await updateLoan(editedLoan.id, { 
                loanCode: editedLoan.loanCode,
                purpose: editedLoan.purpose,
                durationYears: editedLoan.durationYears,
                applicationDate: editedLoan.applicationDate,
            });
            toast({ title: 'ອັບເດດຂໍ້ມູນສິນເຊື່ອສຳເລັດ' });
            setIsEditing(false);
        } catch (error) {
            toast({ title: 'ເກີດຂໍ້ຜິດພາດ', variant: 'destructive' });
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

    const handleDeleteClick = (e: React.MouseEvent, repayment: LoanRepayment) => {
        e.stopPropagation();
        setRepaymentToDelete(repayment);
    };

  if (!loan || !editedLoan) return null;
  
  const dueDate = loan.durationYears ? addYears(toDateSafe(loan.applicationDate)!, loan.durationYears) : null;


  /* ---------------- UI ---------------- */
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
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                  <span>ສະຫຼຸບຂໍ້ມູນສິນເຊື່ອ</span>
                  <Badge variant={isSettled ? 'success' : 'warning'}>
                      {isSettled ? 'ຈ່າຍໝົດແລ້ວ' : 'ຍັງຄ້າງ'}
                  </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                     <div>
                        <Label>ລະຫັດສິນເຊື່ອ:</Label>
                        {isEditing ? <Input value={editedLoan.loanCode} onChange={e => setEditedLoan(p => p? {...p, loanCode: e.target.value} : null)} /> : <p className="font-semibold">{loan.loanCode}</p>}
                    </div>
                    <div>
                        <Label>ຜູ້ກູ້ຢືມ:</Label>
                        <p className="font-semibold">{loan.memberId ? member?.name : loan.debtorName || '...'}</p>
                    </div>
                     <div>
                        <Label>ຈຸດປະສົງ:</Label>
                        {isEditing ? <Input value={editedLoan.purpose} onChange={e => setEditedLoan(p => p? {...p, purpose: e.target.value} : null)} /> : <p className="font-semibold">{loan.purpose || '-'}</p>}
                    </div>
                    <div>
                        <Label>ໄລຍະເວລາ (ປີ):</Label>
                        {isEditing ? <Input type="number" value={editedLoan.durationYears} onChange={e => setEditedLoan(p => p ? {...p, durationYears: Number(e.target.value)} : null)} /> : <p className="font-semibold">{loan.durationYears || 'N/A'} ປີ</p>}
                    </div>
                     <div>
                        <Label>ວັນທີເລີ່ມສັນຍາ:</Label>
                        {isEditing ? (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {editedLoan.applicationDate ? format(toDateSafe(editedLoan.applicationDate)!, "PPP") : <span>ເລືອກວັນທີ</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={toDateSafe(editedLoan.applicationDate)!}
                                        onSelect={(date) => setEditedLoan(p => p ? { ...p, applicationDate: date || new Date() } : null)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        ) : <p className="font-semibold">{format(toDateSafe(loan.applicationDate)!, 'dd/MM/yyyy')}</p>}
                    </div>
                    <div>
                        <Label>ວັນຄົບກຳນົດ:</Label>
                        <p className="font-semibold">{dueDate ? format(dueDate, 'dd/MM/yyyy') : 'N/A'}</p>
                    </div>
                </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ສະກຸນ</TableHead>
                    <TableHead className="text-right">ເງິນຕົ້ນ</TableHead>
                    <TableHead className="text-right">ກຳໄລ</TableHead>
                    <TableHead className="text-right">ຍອດຕ້ອງຈ່າຍ</TableHead>
                    <TableHead className="text-right">ຈ່າຍແລ້ວ</TableHead>
                    <TableHead className="text-right">ຄົງເຫຼືອ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.filter(c => (loan.amount[c] || 0) > 0).map((c) => (
                    <TableRow key={c}>
                      <TableCell>{c.toUpperCase()}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(loan.amount[c])}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(
                          (loan.repaymentAmount[c] || 0) - (loan.amount[c] || 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(loan.repaymentAmount[c] || 0)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(totalPaid[c])}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(outstandingBalance[c])}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">ປະຫວັດການຊຳລະ: {loan.memberId ? member?.name : loan.debtorName || '...'}</h3>
                 <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>ວັນທີຈ່າຍ</TableHead>
                        <TableHead className="text-right">ຈຳນວນເງິນທັງໝົດ</TableHead>
                        <TableHead className="text-right">ຍອດຈ່າຍ</TableHead>
                        <TableHead className="text-right">ຄົງເຫຼືອ</TableHead>
                        <TableHead className="text-center">ລຶບ</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {repaymentHistory.map((r) => (
                        <TableRow key={r.id}>
                        <TableCell>
                            {format(r.repaymentDate, "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                            {currencies.map(
                            (c) =>
                                (r.amountToPay?.[c] ?? 0) > 0 && (
                                <div key={c}>
                                    {formatCurrency(r.amountToPay?.[c] ?? 0)}{" "}
                                    {c.toUpperCase()}
                                </div>
                                )
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            {currencies.map(
                            (c) =>
                                (r.amountPaid?.[c] ?? 0) > 0 && (
                                <div key={c}>
                                    {formatCurrency(r.amountPaid?.[c] ?? 0)}{" "}
                                    {c.toUpperCase()}
                                </div>
                                )
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            {currencies.map((c) => (
                            (r.amountToPay?.[c] || 0) > 0 &&
                                <div key={c}>
                                    {formatCurrency(r.remaining?.[c] ?? 0)}{" "}
                                    {c.toUpperCase()}
                                </div>
                            ))}
                        </TableCell>
                        <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, r)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              </div>
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

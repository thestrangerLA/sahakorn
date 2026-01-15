
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, PlusCircle, Calendar as CalendarIcon, Scale, Search, Trash2, Users, Briefcase, TrendingUp, BookOpen, Pencil } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import { listenToCooperativeTransactions, getAccountBalances, deleteTransactionGroup, recordUserAction, updateCooperativeAccountSummary, listenToCooperativeAccountSummary } from '@/services/cooperativeAccountingService';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { listenToCooperativeDeposits } from '@/services/cooperativeDepositService';
import type { Account, Transaction, CurrencyValues, UserAction, AccountSummary, CooperativeMember, CooperativeDeposit } from '@/lib/types';
import { DateRange } from "react-day-picker";
import { cn } from '@/lib/utils';
import { useClientRouter } from '@/hooks/useClientRouter';


const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard = ({ title, balances, icon, className, onClick, href }: { title: string, balances: CurrencyValues, icon?: React.ReactNode, className?: string, onClick?: () => void, href?: string }) => {
    const cardContent = (
         <Card className={cn("relative", className, (onClick || href) && "cursor-pointer hover:bg-muted/80")} onClick={onClick}>
            {onClick && <Pencil className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                   <CardTitle className="text-sm font-medium">{title}</CardTitle>
                </div>
                {icon || <Scale className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                {currencies.map(c => (
                    (balances?.[c] || 0) !== 0 && (
                    <div key={c} className="text-xs">
                        <span className="font-semibold uppercase">{c}: </span> 
                        <span>{formatCurrency(balances[c] || 0)}</span>
                    </div>
                    )
                ))}
                 {Object.values(balances || {}).every(v => v === 0) && <p className="text-xs text-muted-foreground">-</p>}
            </CardContent>
        </Card>
    );

     if (href) {
        return <Link href={href} passHref>{cardContent}</Link>;
    }

    return cardContent;
};

const userActions: { value: UserAction; label: string }[] = [
    { value: 'MEMBER_DEPOSIT', label: 'ສະມາຊິກຝາກເງິນ (Member Deposit)' },
    { value: 'SET_MEMBER_DEPOSITS', label: 'ຕັ້ງຍອດເງິນຝາກສະມາຊິກ (Set Member Deposits)' },
    { value: 'MEMBER_WITHDRAW', label: 'ສະມາຊິກຖອນເງິນ (Member Withdraw)' },
    { value: 'SELL_CREDIT', label: 'ຂາຍເຊື່ອ (Sell on Credit)' },
    { value: 'COLLECT_RECEIVABLE', label: 'ເກັບເງິນຈາກລູກໜີ້ (Collect Receivable)' },
    { value: 'INVESTMENT_CASH', label: 'ລົງທຶນ (Investment)' },
    { value: 'RECEIVE_INVESTMENT_INCOME', label: 'ຮັບກຳໄລຈາກການລົງທຶນ (Receive Investment Income)' },
    { value: 'SELL_MURABAHA', label: 'ຂາຍມີກຳໄລ (Murabaha)' },
    { value: 'COLLECT_MURABAHA_RECEIVABLE', label: 'ຮັບຊຳລະຈາກລູກໜີ້ການຄ້າ' },
    { value: 'PAY_GENERAL_EXPENSE', label: 'ຈ່າຍຄ່າໃຊ້ຈ່າຍທົ່ວໄປ (Pay General Expense)' },
];


type JournalEntry = {
    transactionGroupId: string;
    date: Date;
    description: string;
    userAction?: UserAction;
    debit: { accountId: string; amount: CurrencyValues };
    credit: { accountId: string; amount: CurrencyValues };
};

export default function CooperativeAccountingPage() {
    const { toast } = useToast();
    const router = useClientRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>(defaultAccounts);
    const [accountBalances, setAccountBalances] = useState<Record<string, CurrencyValues>>({});
    const [summary, setSummary] = useState<AccountSummary | null>(null);
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    
    // Form state
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<CurrencyValues>({ kip: 0, thb: 0, usd: 0, cny: 0 });
    const [profitAmount, setProfitAmount] = useState<CurrencyValues>({ kip: 0, thb: 0, usd: 0, cny: 0 });
    const [selectedAction, setSelectedAction] = useState<UserAction | undefined>();
    const [paymentChannel, setPaymentChannel] = useState<'cash' | 'bank_bcel'>('cash');

    // Filter state
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [filterAccountId, setFilterAccountId] = useState<string>('all');
    const [filterDescription, setFilterDescription] = useState('');

    // Edit BCEL Dialog State
    const [isEditBcelOpen, setEditBcelOpen] = useState(false);
    const [bcelEditValues, setBcelEditValues] = useState<CurrencyValues>({ ...initialCurrencyValues });

    useEffect(() => {
        const unsubscribeTxs = listenToCooperativeTransactions(setTransactions);
        const unsubscribeSummary = listenToCooperativeAccountSummary(setSummary);
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        const unsubscribeDeposits = listenToCooperativeDeposits(setDeposits);
        return () => {
            unsubscribeTxs();
            unsubscribeSummary();
            unsubscribeMembers();
            unsubscribeDeposits();
        };
    }, []);

    useEffect(() => {
        const balances = getAccountBalances(transactions);
        setAccountBalances(balances);
    }, [transactions]);
    
    const totalMemberDeposits = useMemo(() => {
        return members.reduce((total, member) => {
            const memberDeposits = deposits.filter(d => d.memberId === member.id);
            const currentTotal: CurrencyValues = {
                kip: (member.deposits?.kip || 0) + memberDeposits.reduce((sum, d) => sum + (d.kip || 0), 0),
                thb: (member.deposits?.thb || 0) + memberDeposits.reduce((sum, d) => sum + (d.thb || 0), 0),
                usd: (member.deposits?.usd || 0) + memberDeposits.reduce((sum, d) => sum + (d.usd || 0), 0),
                cny: 0
            };
            total.kip += currentTotal.kip;
            total.thb += currentTotal.thb;
            total.usd += currentTotal.usd;
            return total;
        }, { kip: 0, thb: 0, usd: 0, cny: 0 });
    }, [members, deposits]);


    useEffect(() => {
        if(summary?.bankAccount){
            setBcelEditValues(summary.bankAccount);
        }
    }, [summary?.bankAccount, isEditBcelOpen]);

    const handleAmountChange = (stateSetter: React.Dispatch<React.SetStateAction<CurrencyValues>>, currency: keyof CurrencyValues, value: string) => {
        stateSetter(prev => ({ ...prev, [currency]: Number(value) || 0 }));
    }

    const journalEntries = useMemo(() => {
        const grouped = transactions.reduce((acc, tx) => {
            if (!acc[tx.transactionGroupId]) {
                acc[tx.transactionGroupId] = {
                    transactionGroupId: tx.transactionGroupId,
                    date: tx.date,
                    description: tx.description,
                    userAction: tx.userAction,
                    debit: { accountId: '', amount: { ...initialCurrencyValues } },
                    credit: { accountId: '', amount: { ...initialCurrencyValues } }
                };
            }
            if (tx.type === 'debit') {
                acc[tx.transactionGroupId].debit = { accountId: tx.accountId, amount: tx.amount };
            } else {
                acc[tx.transactionGroupId].credit = { accountId: tx.accountId, amount: tx.amount };
            }
            return acc;
        }, {} as Record<string, JournalEntry>);
        
        let filteredEntries = Object.values(grouped);

        if(dateRange?.from && dateRange?.to) {
            filteredEntries = filteredEntries.filter(entry => 
                entry.date >= dateRange.from! && entry.date <= dateRange.to!
            );
        }

        if(filterAccountId && filterAccountId !== 'all') {
            filteredEntries = filteredEntries.filter(entry => 
                entry.debit.accountId === filterAccountId || entry.credit.accountId === filterAccountId
            );
        }

        if(filterDescription) {
            filteredEntries = filteredEntries.filter(entry =>
                entry.description.toLowerCase().includes(filterDescription.toLowerCase())
            );
        }

        return filteredEntries.sort((a,b) => b.date.getTime() - a.date.getTime());
    }, [transactions, dateRange, filterAccountId, filterDescription]);

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const totalAmount = Object.values(amount).reduce((sum, val) => sum + val, 0);

        if (!date || !description || !selectedAction) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບ", description: "ກະລຸນາເລືອກເຫດການ, ວັນທີ ແລະ ໃສ່ຄຳອະທິບາຍ", variant: "destructive" });
            return;
        }
         if (totalAmount === 0) {
            toast({ title: "ຈຳນວນເງິນຜິດພາດ", description: "ຈຳນວນເງິນຕ້ອງບໍ່ແມ່ນສູນ", variant: "destructive" });
            return;
        }

        try {
            await recordUserAction({
                action: selectedAction,
                amount,
                profit: selectedAction === 'SELL_MURABAHA' ? profitAmount : undefined,
                description,
                date,
                paymentChannel
            });
            toast({ title: "ສ້າງທຸລະກຳສຳເລັດ" });
            // Reset form
            setDate(new Date());
            setDescription('');
            setSelectedAction(undefined);
            setAmount({ kip: 0, thb: 0, usd: 0, cny: 0 });
            setProfitAmount({ kip: 0, thb: 0, usd: 0, cny: 0 });
            setPaymentChannel('cash');

        } catch (error) {
            console.error("Error adding transaction:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: errorMessage, variant: "destructive" });
        }
    }
    
    const handleDeleteTransactionGroup = async (groupId: string) => {
        try {
            await deleteTransactionGroup(groupId);
            toast({ title: "ລຶບທຸລະກຳສຳເລັດ" });
        } catch (error) {
            console.error("Error deleting transaction group:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການລຶບ", variant: "destructive" });
        }
    }

    const handleSaveBcel = async () => {
        try {
            await updateCooperativeAccountSummary({ bankAccount: bcelEditValues });
            toast({ title: "ອັບເດດຍອດບັນຊີ BCEL ສຳເລັດ" });
            setEditBcelOpen(false);
        } catch (error) {
            toast({ title: "Error saving BCEL balance", variant: "destructive" });
        }
    };


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                 <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ການບັນຊີ (ສະຫະກອນ)</h1>
                </div>
                 <div className="ml-auto">
                    <Button asChild variant="outline">
                        <Link href="/tee/cooperative/income-expense">
                             <BookOpen className="mr-2 h-4 w-4"/>
                            ໄປທີ່ໜ້າລາຍຮັບ-ລາຍຈ່າຍ
                        </Link>
                    </Button>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                    {accounts
                        .filter(a => a.type === 'asset' || (a.type === 'equity' && (a.id === 'share_capital' || a.id === 'opening_balance_equity')))
                        .map(acc => {
                            let balances = accountBalances[acc.id] || { ...initialCurrencyValues };
                            if (acc.id === 'bank_bcel' && summary?.bankAccount) {
                                balances = summary.bankAccount;
                            }
                             if (acc.id === 'share_capital') {
                                balances = totalMemberDeposits;
                            }

                            return (
                            <SummaryCard 
                                key={acc.id} 
                                title={acc.name} 
                                balances={balances} 
                                icon={
                                    acc.type === 'equity' ? <Briefcase className="h-4 w-4 text-muted-foreground" /> :
                                    acc.id === 'investments' ? <TrendingUp className="h-4 w-4 text-muted-foreground" /> :
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                }
                                onClick={
                                    acc.id === 'bank_bcel' ? () => setEditBcelOpen(true) : undefined
                                }
                                href={acc.href}
                            />
                        )})
                    }
                </div>
                 <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>ບັນທຶກລາຍການ (Journal Entry)</CardTitle>
                            <CardDescription>ເລືອກເຫດການທີ່ເກີດຂຶ້ນຈິງ, ລະບົບຈະລົງບັນຊີໃຫ້ອັດຕະໂນມັດ</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddTransaction} className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label>ເຫດການ (Action)</Label>
                                    <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as UserAction)}>
                                        <SelectTrigger><SelectValue placeholder="ເລືອກເຫດການທີ່ເກີດຂຶ້ນ..." /></SelectTrigger>
                                        <SelectContent>{userActions.map(action => <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
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
                                <div className="grid gap-2">
                                    <Label htmlFor="date">ວັນທີ</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date ? format(date, "PPP") : <span>ເລືອກວັນທີ</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus  /></PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">ຄຳອະທິບາຍ</Label>
                                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="ເຊັ່ນ: ຮັບເງິນຄ່າຫຸ້ນຈາກ ທ້າວ ກ."/>
                                </div>
                                
                                <div className="grid gap-2">
                                  <Label className="text-sm font-medium">{selectedAction === 'SELL_MURABAHA' ? 'ເງິນຕົ້ນ (Principal)' : 'ຈຳນວນເງິນ (Amount)'}</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                      <div><Label className="text-xs">KIP</Label><Input type="number" value={amount.kip || ''} onChange={e => handleAmountChange(setAmount, 'kip', e.target.value)} /></div>
                                      <div><Label className="text-xs">THB</Label><Input type="number" value={amount.thb || ''} onChange={e => handleAmountChange(setAmount, 'thb', e.target.value)} /></div>
                                      <div><Label className="text-xs">USD</Label><Input type="number" value={amount.usd || ''} onChange={e => handleAmountChange(setAmount, 'usd', e.target.value)} /></div>
                                      <div><Label className="text-xs">CNY</Label><Input type="number" value={amount.cny || ''} onChange={e => handleAmountChange(setAmount, 'cny', e.target.value)} /></div>
                                  </div>
                                </div>
                                
                                {selectedAction === 'SELL_MURABAHA' && (
                                   <div className="grid gap-2">
                                      <Label className="text-sm font-medium">ກຳໄລ (Profit)</Label>
                                      <div className="grid grid-cols-2 gap-2">
                                          <div><Label className="text-xs">KIP</Label><Input type="number" value={profitAmount.kip || ''} onChange={e => handleAmountChange(setProfitAmount, 'kip', e.target.value)} /></div>
                                          <div><Label className="text-xs">THB</Label><Input type="number" value={profitAmount.thb || ''} onChange={e => handleAmountChange(setProfitAmount, 'thb', e.target.value)} /></div>
                                          <div><Label className="text-xs">USD</Label><Input type="number" value={profitAmount.usd || ''} onChange={e => handleAmountChange(setProfitAmount, 'usd', e.target.value)} /></div>
                                          <div><Label className="text-xs">CNY</Label><Input type="number" value={profitAmount.cny || ''} onChange={e => handleAmountChange(setProfitAmount, 'cny', e.target.value)} /></div>
                                      </div>
                                    </div>
                                )}


                                <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມທຸລະກຳ</Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>ປະຫວັດທຸລະກຳ</CardTitle>
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="date" variant={"outline"} className="w-auto justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>ເລືອກຊ່ວງວັນທີ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                                    </PopoverContent>
                                </Popover>
                                <Select value={filterAccountId} onValueChange={setFilterAccountId}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="ກອງຕາມບັນຊີ" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ທຸກບັນຊີ</SelectItem>
                                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="ຄົ້ນຫາຄຳອະທິບາຍ..." className="pl-8 w-auto" value={filterDescription} onChange={(e) => setFilterDescription(e.target.value)} />
                                </div>
                                <Button variant="ghost" onClick={() => { setDateRange(undefined); setFilterAccountId('all'); setFilterDescription(''); }}>ລ້າງໂຕກອງ</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ວັນທີ</TableHead>
                                        <TableHead>ລາຍລະອຽດ</TableHead>
                                        <TableHead>ບັນຊີ</TableHead>
                                        <TableHead className="text-right">ເດບິດ</TableHead>
                                        <TableHead className="text-right">ເຄຣດິດ</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {journalEntries.map(entry => {
                                        const debitAccount = accounts.find(a => a.id === entry.debit.accountId);
                                        const creditAccount = accounts.find(a => a.id === entry.credit.accountId);
                                        const actionLabel = userActions.find(a => a.value === entry.userAction)?.label;
                                        return (
                                        <React.Fragment key={entry.transactionGroupId}>
                                            <TableRow>
                                                <TableCell rowSpan={2} className="align-top py-2">{format(entry.date, "dd/MM/yyyy")}</TableCell>
                                                <TableCell rowSpan={2} className="align-top py-2 max-w-xs">
                                                  <div className="font-medium">{actionLabel || entry.description}</div>
                                                  {actionLabel && <div className="text-xs text-muted-foreground">{entry.description}</div>}
                                                </TableCell>
                                                <TableCell className="py-1">{debitAccount?.name}</TableCell>
                                                <TableCell className="text-right text-green-600 font-mono py-1">
                                                     {currencies.map(c => entry.debit.amount[c] > 0 ? <div key={c}>{formatCurrency(entry.debit.amount[c])}</div>: null)}
                                                </TableCell>
                                                <TableCell className="py-1"></TableCell>
                                                <TableCell rowSpan={2} className="text-center align-middle py-2">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>ຢືນຢັນການລົບ?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    ການກະທຳນີ້ຈະລຶບທັງລາຍການ Debit ແລະ Credit ທີ່ກ່ຽວຂ້ອງ. ບໍ່ສາມາດຍົກເລີກໄດ້.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>ຍົກເລີກ</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteTransactionGroup(entry.transactionGroupId)}>ຢືນຢັນ</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8 py-1">{creditAccount?.name}</TableCell>
                                                <TableCell className="py-1"></TableCell>
                                                <TableCell className="text-right text-red-600 font-mono py-1">
                                                     {currencies.map(c => entry.credit.amount[c] > 0 ? <div key={c}>{formatCurrency(entry.credit.amount[c])}</div>: null)}
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    )})}
                                </TableBody>
                            </Table>
                            {journalEntries.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳ</div>}
                        </CardContent>
                    </Card>
                </div>
            </main>
             <Dialog open={isEditBcelOpen} onOpenChange={setEditBcelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ແກ້ໄຂຍອດເງິນໃນບັນຊີ BCEL</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {currencies.map(c => (
                            <div key={c} className="grid gap-2">
                                <Label htmlFor={`bcel-${c}`}>{c.toUpperCase()}</Label>
                                <Input id={`bcel-${c}`} type="number" value={bcelEditValues[c]} onChange={e => setBcelEditValues(prev => ({...prev, [c]: Number(e.target.value) || 0}))} />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditBcelOpen(false)}>ຍົກເລີກ</Button>
                        <Button onClick={handleSaveBcel}>ບັນທຶກ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

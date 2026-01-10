

"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Landmark, Wallet, PlusCircle, Calendar as CalendarIcon, MoreHorizontal, Trash2, Combine, ArrowUpCircle, ArrowDownCircle, ChevronDown, Scale } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { format, startOfDay, isWithinInterval, startOfMonth, endOfMonth, getYear, setMonth, getMonth } from "date-fns"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import { listenToCooperativeTransactions, getAccountBalances, createTransaction } from '@/services/cooperativeAccountingService';
import type { Account, Transaction, Currency } from '@/lib/types';


const currencies: (keyof Currency)[] = ['kip', 'thb', 'usd'];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard = ({ title, balances }: { title: string, balances: Currency }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {currencies.map(c => (
                <div key={c} className="text-xs">
                    <span className="font-semibold uppercase">{c}: </span>
                    <span>{formatCurrency(balances[c] || 0)}</span>
                </div>
            ))}
        </CardContent>
    </Card>
);

export default function CooperativeAccountancyPage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>(defaultAccounts);
    const [accountBalances, setAccountBalances] = useState<Record<string, Currency>>({});
    
    // Form state
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [description, setDescription] = useState('');
    const [debitAccountId, setDebitAccountId] = useState('');
    const [creditAccountId, setCreditAccountId] = useState('');
    const [amount, setAmount] = useState<Currency>({ kip: 0, thb: 0, usd: 0, cny: 0 });

    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const balances = getAccountBalances(transactions);
        setAccountBalances(balances);
    }, [transactions]);

    const handleAmountChange = (currency: keyof Currency, value: string) => {
        setAmount(prev => ({ ...prev, [currency]: Number(value) || 0 }));
    }

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const totalAmount = amount.kip + amount.thb + amount.usd;
        if (!date || !description || !debitAccountId || !creditAccountId || totalAmount === 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບ", description: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ", variant: "destructive" });
            return;
        }
        try {
            await createTransaction(debitAccountId, creditAccountId, amount, description);
            toast({ title: "ສ້າງທຸລະກຳສຳເລັດ" });
            // Reset form
            setDate(new Date());
            setDescription('');
            setDebitAccountId('');
            setCreditAccountId('');
            setAmount({ kip: 0, thb: 0, usd: 0, cny: 0 });

        } catch (error) {
            console.error("Error adding transaction:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ການບັນຊີ (ສະຫະກອນ)</h1>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                     {accounts.filter(a => a.type === 'asset').map(acc => (
                         <SummaryCard key={acc.id} title={acc.name} balances={accountBalances[acc.id] || { kip: 0, thb: 0, usd: 0, cny: 0 }} />
                     ))}
                </div>
                 <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>ບັນທຶກລາຍການ (Journal Entry)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddTransaction} className="grid gap-4">
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
                                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Debit (ເດບິດ)</Label>
                                        <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                                            <SelectTrigger><SelectValue placeholder="ເລືອກບັນຊີ" /></SelectTrigger>
                                            <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                     <div className="grid gap-2">
                                        <Label>Credit (ເຄຣດິດ)</Label>
                                        <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                                            <SelectTrigger><SelectValue placeholder="ເລືອກບັນຊີ" /></SelectTrigger>
                                            <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2">
                                    <div><Label className="text-xs">KIP</Label><Input type="number" value={amount.kip || ''} onChange={e => handleAmountChange('kip', e.target.value)} /></div>
                                    <div><Label className="text-xs">THB</Label><Input type="number" value={amount.thb || ''} onChange={e => handleAmountChange('thb', e.target.value)} /></div>
                                    <div><Label className="text-xs">USD</Label><Input type="number" value={amount.usd || ''} onChange={e => handleAmountChange('usd', e.target.value)} /></div>
                                </div>

                                <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມທຸລະກຳ</Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>ປະຫວັດທຸລະກຳ</CardTitle>
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map(tx => {
                                        const account = accounts.find(a => a.id === tx.accountId);
                                        return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(tx.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell>{account?.name}</TableCell>
                                            <TableCell className="text-right text-green-600 font-mono">
                                                {tx.type === 'debit' ? currencies.map(c => tx.amount[c] > 0 ? <div key={c}>{formatCurrency(tx.amount[c])} {c.toUpperCase()}</div>: null) : '-'}
                                            </TableCell>
                                             <TableCell className="text-right text-red-600 font-mono">
                                                {tx.type === 'credit' ? currencies.map(c => tx.amount[c] > 0 ? <div key={c}>{formatCurrency(tx.amount[c])} {c.toUpperCase()}</div>: null) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                            {transactions.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳ</div>}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

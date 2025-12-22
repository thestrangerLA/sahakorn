
"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Landmark, Wallet, PlusCircle, Calendar as CalendarIcon, MoreHorizontal, Trash2, Combine, ArrowUpCircle, ArrowDownCircle, ChevronDown } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { format, startOfDay, isWithinInterval, startOfMonth, endOfMonth, getYear, setMonth, getMonth } from "date-fns"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listenToCentralAccountSummary, updateCentralAccountSummary, listenToCentralTransactions, addCentralTransaction, updateCentralTransaction, deleteCentralTransaction } from '@/services/centralAccountancyService';
import type { AccountSummary, Transaction } from '@/lib/types';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard = ({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
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

export default function CentralAccountPage() {
    const { toast } = useToast();
    const [summary, setSummary] = useState<AccountSummary | null>(null);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({ type: 'expense', description: '', amount: 0 });
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [historyDisplayMonth, setHistoryDisplayMonth] = useState<Date>(new Date());

    useEffect(() => {
        const unsubscribeSummary = listenToCentralAccountSummary(setSummary);
        const unsubscribeTransactions = listenToCentralTransactions(setTransactions);
        return () => {
            unsubscribeSummary();
            unsubscribeTransactions();
        };
    }, []);

    const filteredTransactions = useMemo(() => {
        const start = startOfMonth(historyDisplayMonth);
        const end = endOfMonth(historyDisplayMonth);
        return transactions.filter(tx => isWithinInterval(tx.date, { start, end }));
    }, [transactions, historyDisplayMonth]);

    const totalIncome = useMemo(() => {
        return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);

    const totalExpense = useMemo(() => {
        return transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    }, [transactions]);
    
    const netTotal = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !newTransaction.description || newTransaction.amount === undefined) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບ", description: "ກະລຸນາໃສ່ວັນທີ, ຄຳອະທິບາຍ ແລະ ຈຳນວນເງິນ", variant: "destructive" });
            return;
        }
        try {
            await addCentralTransaction({
                date: startOfDay(date),
                type: newTransaction.type || 'expense',
                description: newTransaction.description || '',
                amount: Number(newTransaction.amount || 0),
            });
            toast({ title: "ເພີ່ມທຸລະກຳສຳເລັດ" });
            setNewTransaction({ type: 'expense', description: '', amount: 0 });
            setDate(new Date());
        } catch (error) {
            console.error("Error adding transaction: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    const handleUpdateTransaction = async () => {
        if (!editingTransaction) return;
        try {
            await updateCentralTransaction(editingTransaction.id, {
                ...editingTransaction,
                date: startOfDay(editingTransaction.date),
            });
            toast({ title: "ອັບເດດທຸລະກຳສຳເລັດ" });
            setEditingTransaction(null);
        } catch (error) {
            console.error("Error updating transaction: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!window.confirm("ເຈົ້າແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການນີ້?")) return;
        try {
            await deleteCentralTransaction(id);
            toast({ title: "ລຶບທຸລະກຳສຳເລັດ" });
        } catch (error) {
            console.error("Error deleting transaction: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    const MonthYearSelector = () => {
        const currentYear = getYear(new Date());
        const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
        years.push(2025);
        const uniqueYears = [...new Set(years)].sort();

        const months = Array.from({ length: 12 }, (_, i) => setMonth(new Date(), i));

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                        {format(historyDisplayMonth, "LLLL yyyy")}
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {uniqueYears.map(year => (
                         <DropdownMenuSub key={year}>
                            <DropdownMenuSubTrigger>
                                <span>{year + 543}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    {months.map(month => (
                                        <DropdownMenuItem 
                                            key={getMonth(month)} 
                                            onClick={() => {
                                                const newDate = new Date(year, getMonth(month), 1);
                                                setHistoryDisplayMonth(newDate);
                                            }}
                                        >
                                            {format(month, "LLLL")}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                             </DropdownMenuPortal>
                        </DropdownMenuSub>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };
    
    if (!summary) {
        return <div className="flex items-center justify-center h-screen">ກຳລັງໂຫລດຂໍ້ມູນ...</div>;
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ບັນຊີກອງກາງ</h1>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                     <SummaryCard title="ລາຍຮັບ" value={formatCurrency(totalIncome)} icon={<ArrowUpCircle className="h-5 w-5 text-green-500" />} />
                     <SummaryCard title="ລາຍຈ່າຍ" value={formatCurrency(totalExpense)} icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />} />
                     <SummaryCard title="ລວມເງິນທັງໝົດ" value={formatCurrency(netTotal)} icon={<Combine className="h-5 w-5 text-blue-600" />} />
                </div>
                 <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>ເພີ່ມທຸລະກຳ</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddTransaction} className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label>ປະເພດ</Label>
                                    <RadioGroup value={newTransaction.type} onValueChange={(v) => setNewTransaction(p => ({ ...p, type: v as 'income' | 'expense' }))} className="flex gap-4">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="income" id="r-income" /><Label htmlFor="r-income">ລາຍຮັບ</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="expense" id="r-expense" /><Label htmlFor="r-expense">ລາຍຈ່າຍ</Label></div>
                                    </RadioGroup>
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
                                    <Textarea id="description" value={newTransaction.description || ''} onChange={(e) => setNewTransaction(p => ({ ...p, description: e.target.value }))} required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="amount">ຈຳນວນເງິນ (KIP)</Label>
                                    <Input id="amount" type="number" value={newTransaction.amount || ''} onChange={(e) => setNewTransaction(p => ({ ...p, amount: Number(e.target.value) }))} placeholder="0" />
                                </div>
                                <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມທຸລະກຳ</Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <div>
                                <CardTitle>ປະຫວັດທຸລະກຳ</CardTitle>
                                <CardDescription>ລາຍການທຸລະກຳສຳລັບເດືອນທີ່ເລືອກ</CardDescription>
                            </div>
                            <MonthYearSelector />
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ວັນທີ</TableHead>
                                        <TableHead>ຄຳອະທິບາຍ</TableHead>
                                        <TableHead>ປະເພດ</TableHead>
                                        <TableHead className="text-right">ຈຳນວນເງິນ</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTransactions.map(tx => (
                                        <TableRow key={tx.id} className={tx.type === 'income' ? 'bg-green-50/50' : 'bg-red-50/50'}>
                                            <TableCell>{format(tx.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell className="font-medium">{tx.description}</TableCell>
                                            <TableCell>{tx.type === 'income' ? 'ລາຍຮັບ' : 'ລາຍຈ່າຍ'}</TableCell>
                                            <TableCell className={`text-right font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(tx.amount || 0)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => setEditingTransaction(tx)}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTransaction(tx.id)}>Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {filteredTransactions.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳ</div>}
                        </CardContent>
                    </Card>
                </div>
            </main>
             {editingTransaction && (
                 <Dialog open={!!editingTransaction} onOpenChange={(isOpen) => !isOpen && setEditingTransaction(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>ແກ້ໄຂທຸລະກຳ</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                           <RadioGroup value={editingTransaction.type} onValueChange={(v) => setEditingTransaction(p => p ? { ...p, type: v as 'income' | 'expense' } : null)} className="flex gap-4">
                               <div className="flex items-center space-x-2"><RadioGroupItem value="income" id="edit-income" /><Label htmlFor="edit-income">ລາຍຮັບ</Label></div>
                               <div className="flex items-center space-x-2"><RadioGroupItem value="expense" id="edit-expense" /><Label htmlFor="edit-expense">ລາຍຈ່າຍ</Label></div>
                           </RadioGroup>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"}><CalendarIcon className="mr-2 h-4 w-4" />{format(editingTransaction.date, "PPP")}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={editingTransaction.date} onSelect={(d) => setEditingTransaction(p => p ? { ...p, date: d || new Date() } : null)} initialFocus  />
                                </PopoverContent>
                            </Popover>
                            <Textarea value={editingTransaction.description} onChange={(e) => setEditingTransaction(p => p ? { ...p, description: e.target.value } : null)} />
                            <div className="grid gap-2">
                                <Label htmlFor="edit-amount">ຈຳນວນເງິນ (KIP)</Label>
                                <Input id="edit-amount" type="number" value={editingTransaction.amount || ''} onChange={(e) => setEditingTransaction(p => p ? { ...p, amount: Number(e.target.value) } : null)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingTransaction(null)}>ຍົກເລີກ</Button>
                            <Button onClick={handleUpdateTransaction}>ບັນທຶກ</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

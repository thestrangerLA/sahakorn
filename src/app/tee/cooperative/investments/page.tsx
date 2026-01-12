
"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, PlusCircle, Calendar as CalendarIcon, MoreHorizontal, Trash2, Pencil } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { format, startOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listenToCooperativeInvestments, addCooperativeInvestment, updateCooperativeInvestment, deleteCooperativeInvestment } from '@/services/cooperativeInvestmentService';
import type { CooperativeInvestment, CurrencyValues } from '@/lib/types';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

export default function CooperativeInvestmentsPage() {
    const { toast } = useToast();
    const [investments, setInvestments] = useState<CooperativeInvestment[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<CurrencyValues>({ ...initialCurrencyValues });
    const [editingInvestment, setEditingInvestment] = useState<CooperativeInvestment | null>(null);

    useEffect(() => {
        const unsubscribe = listenToCooperativeInvestments(setInvestments);
        return () => unsubscribe();
    }, []);

    const totalInvestments = useMemo(() => {
        return investments.reduce((acc, investment) => {
            currencies.forEach(c => {
                acc[c] = (acc[c] || 0) + (investment.amount[c] || 0);
            });
            return acc;
        }, { ...initialCurrencyValues });
    }, [investments]);
    
    const handleAmountChange = (currency: keyof CurrencyValues, value: string) => {
        setAmount(prev => ({ ...prev, [currency]: Number(value) || 0 }));
    }

    const handleAddInvestment = async (e: React.FormEvent) => {
        e.preventDefault();
        const totalAmount = Object.values(amount).reduce((sum, val) => sum + val, 0);

        if (!date || !description || totalAmount === 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບ", description: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ", variant: "destructive" });
            return;
        }

        try {
            await addCooperativeInvestment({
                date: startOfDay(date),
                description,
                amount,
            });
            toast({ title: "ເພີ່ມການລົງທຶນສຳເລັດ" });
            setDate(new Date());
            setDescription('');
            setAmount({ ...initialCurrencyValues });
        } catch (error) {
            console.error("Error adding investment:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    const handleUpdateInvestment = async () => {
        if (!editingInvestment) return;
        try {
            await updateCooperativeInvestment(editingInvestment.id, {
                date: startOfDay(editingInvestment.date),
                description: editingInvestment.description,
                amount: editingInvestment.amount,
            });
            toast({ title: "ອັບເດດການລົງທຶນສຳເລັດ" });
            setEditingInvestment(null);
        } catch (error) {
            console.error("Error updating investment: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    const handleDeleteInvestment = async (id: string) => {
        if (!window.confirm("ເຈົ້າແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການລົງທຶນນີ້?")) return;
        try {
            await deleteCooperativeInvestment(id);
            toast({ title: "ລຶບການລົງທຶນສຳເລັດ" });
        } catch (error) {
            console.error("Error deleting investment: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ການລົງທຶນ (ສະຫະກອນ)</h1>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>ເພີ່ມການລົງທຶນໃໝ່</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddInvestment} className="grid gap-4">
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
                                    <Label htmlFor="description">ລາຍລະອຽດການລົງທຶນ</Label>
                                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {currencies.map(c => (
                                        <div key={c}>
                                            <Label className="text-xs uppercase">{c}</Label>
                                            <Input type="number" value={amount[c] || ''} onChange={e => handleAmountChange(c, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                                <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມລາຍການ</Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>ປະຫວັດການລົງທຶນ</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ວັນທີ</TableHead>
                                        <TableHead>ລາຍລະອຽດ</TableHead>
                                        {currencies.map(c => <TableHead key={c} className="text-right uppercase">{c}</TableHead>)}
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {investments.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{format(item.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell className="font-medium">{item.description}</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right font-mono">{formatCurrency(item.amount[c] || 0)}</TableCell>)}
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setEditingInvestment(item)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteInvestment(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                 <TableFooter>
                                    <TableRow className="font-bold bg-muted">
                                        <TableCell colSpan={2}>ລວມທັງໝົດ</TableCell>
                                        {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(totalInvestments[c])}</TableCell>)}
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                            {investments.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີປະຫວັດການລົງທຶນ</div>}
                        </CardContent>
                    </Card>
                </div>
            </main>
             {editingInvestment && (
                 <Dialog open={!!editingInvestment} onOpenChange={(isOpen) => !isOpen && setEditingInvestment(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>ແກ້ໄຂການລົງທຶນ</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"}><CalendarIcon className="mr-2 h-4 w-4" />{format(editingInvestment.date, "PPP")}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={editingInvestment.date} onSelect={(d) => setEditingInvestment(p => p ? { ...p, date: d || new Date() } : null)} initialFocus  />
                                </PopoverContent>
                            </Popover>
                            <Textarea value={editingInvestment.description} onChange={(e) => setEditingInvestment(p => p ? { ...p, description: e.target.value } : null)} />
                            <div className="grid grid-cols-2 gap-4">
                                {currencies.map(c => (
                                    <div key={c} className="grid gap-2">
                                        <Label htmlFor={`edit-${c}`} className="uppercase">{c}</Label>
                                        <Input id={`edit-${c}`} type="number" value={editingInvestment.amount[c] || ''} onChange={(e) => setEditingInvestment(p => p ? { ...p, amount: {...p.amount, [c]: Number(e.target.value)} } : null)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingInvestment(null)}>ຍົກເລີກ</Button>
                            <Button onClick={handleUpdateInvestment}>ບັນທຶກ</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

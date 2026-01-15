
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Calendar as CalendarIcon, Printer, Trash2, PlusCircle, Save } from "lucide-react";
import { listenToCooperativeTransactions } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import type { Transaction, CurrencyValues } from '@/lib/types';
import { getYear, format, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const initialDividendStructure = [
    { id: '1', name: 'ບໍລິສັດ', percentage: 0.30 },
    { id: '2', name: 'xiuge', percentage: 0.10 },
    { id: '3', name: 'wenyan', percentage: 0.10 },
    { id: '4', name: 'ການຕະຫຼາດ', percentage: 0.15 },
    { id: '5', name: 'CEO', percentage: 0.30 },
    { id: '6', name: 'ບັນຊີ', percentage: 0.05 },
];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

type DividendItem = { id: string; name: string; percentage: number };

export default function DividendPage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [startDate, setStartDate] = useState<Date | undefined>(startOfYear(new Date()));
    const [endDate, setEndDate] = useState<Date | undefined>(endOfYear(new Date()));
    const [dividendStructure, setDividendStructure] = useState<DividendItem[]>(initialDividendStructure);

    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);

    const netProfit = useMemo(() => {
        const filteredTransactions = transactions.filter(tx => {
            if (!startDate || !endDate) return true;
            return isWithinInterval(tx.date, { start: startDate, end: endDate });
        });

        const totalIncome = { ...initialCurrencyValues };
        const totalExpense = { ...initialCurrencyValues };

        filteredTransactions.forEach(tx => {
            const account = defaultAccounts.find(a => a.id === tx.accountId);
            if (!account) return;

            const multiplier = tx.type === 'debit' ? 1 : -1;
            
            currencies.forEach(c => {
                 const amount = (tx.amount?.[c] || 0) * multiplier;
                 if (account.type === 'income') {
                    totalIncome[c] -= amount;
                } else if (account.type === 'expense') {
                    totalExpense[c] += amount;
                }
            });
        });
        
        return currencies.reduce((acc, c) => {
            acc[c] = totalIncome[c] - totalExpense[c];
            return acc;
        }, { ...initialCurrencyValues });
    }, [transactions, startDate, endDate]);

    const totalPercentage = useMemo(() => {
        return dividendStructure.reduce((sum, item) => sum + (item.percentage || 0), 0);
    }, [dividendStructure]);
    
    const handleDividendChange = (id: string, field: 'name' | 'percentage', value: string | number) => {
        setDividendStructure(prev => prev.map(item => {
            if (item.id === id) {
                if (field === 'percentage' && (typeof value === 'string' || typeof value === 'number')) {
                    return { ...item, percentage: Number(value) / 100 };
                }
                if (field === 'name' && typeof value === 'string') {
                    return { ...item, name: value };
                }
            }
            return item;
        }));
    };

    const addDividendRow = () => {
        setDividendStructure(prev => [...prev, { id: Date.now().toString(), name: '', percentage: 0 }]);
    };

    const removeDividendRow = (id: string) => {
        setDividendStructure(prev => prev.filter(item => item.id !== id));
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/accounting/reports">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ການປັນຜົນກຳໄລ</h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>ໂຕກອງ</CardTitle>
                        <CardContent className="flex flex-col md:flex-row md:items-end gap-4 pt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start-date">ວັນທີເລີ່ມຕົ້ນ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="start-date" variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "dd/MM/yyyy") : <span>ເລືອກ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end-date">ວັນທີສິ້ນສຸດ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="end-date" variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "dd/MM/yyyy") : <span>ເລືອກ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>ການປັນຜົນ</CardTitle>
                         <CardDescription>
                            ກຳໄລສຸດທິຈາກ {startDate ? format(startDate, "PPP") : '...'} ຫາ {endDate ? format(endDate, "PPP") : '...'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(netProfit).map(([currency, value]) => (
                                <div key={currency} className="p-4 border rounded-lg">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase">{currency}</h4>
                                    <p className={`text-2xl font-bold ${value < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {formatCurrency(value)}
                                    </p>
                                </div>
                            ))}
                        </div>
                      <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3">ຜູ້ຮັບຜົນປະໂຫຍດ</TableHead>
                                <TableHead className="w-[120px] text-center">ເປີເຊັນ (%)</TableHead>
                                {currencies.map(c => <TableHead key={c} className="text-right uppercase">{c}</TableHead>)}
                                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dividendStructure.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium p-1">
                                        <Input value={item.name} onChange={(e) => handleDividendChange(item.id, 'name', e.target.value)} className="h-8"/>
                                    </TableCell>
                                    <TableCell className="text-center p-1">
                                         <Input 
                                            type="number"
                                            value={item.percentage * 100} 
                                            onChange={(e) => handleDividendChange(item.id, 'percentage', e.target.value)}
                                            className="h-8 text-center"
                                        />
                                    </TableCell>
                                    {currencies.map(c => (
                                        <TableCell key={c} className="text-right font-mono p-1">
                                            {formatCurrency(netProfit[c] * item.percentage)}
                                        </TableCell>
                                    ))}
                                    <TableCell className="p-1">
                                        <Button variant="ghost" size="icon" onClick={() => removeDividendRow(item.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-muted font-bold">
                                <TableCell>ລວມທັງໝົດ</TableCell>
                                <TableCell className="text-center">{formatCurrency(totalPercentage * 100)}%</TableCell>
                                {currencies.map(c => (
                                    <TableCell key={c} className="text-right font-mono">
                                        {formatCurrency(netProfit[c] * totalPercentage)}
                                    </TableCell>
                                ))}
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                      </Table>
                      <div className="flex justify-between">
                          <Button onClick={addDividendRow} variant="outline">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              ເພີ່ມລາຍການ
                          </Button>
                          <Button onClick={() => window.print()}>
                              <Printer className="mr-2 h-4 w-4" />
                              ພິມ
                          </Button>
                      </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

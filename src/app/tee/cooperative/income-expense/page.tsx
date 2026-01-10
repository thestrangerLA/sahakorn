
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, TrendingUp, TrendingDown, Receipt, ChevronDown } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listenToCooperativeTransactions } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import type { Transaction, CurrencyValues } from '@/lib/types';
import { format, isWithinInterval, startOfMonth, endOfMonth, getYear, setMonth, getMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"


const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard = ({ title, balances }: { title: string, balances: CurrencyValues }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {currencies.map(c => (
                 (balances[c] || 0) !== 0 && (
                 <div key={c} className="text-lg font-bold">
                    <span className="font-semibold uppercase">{c}: </span>
                    <span className={balances[c] < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(balances[c] || 0)}</span>
                </div>)
            ))}
        </CardContent>
    </Card>
);

export default function CooperativeIncomeExpensePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
    
    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);
    
    const filteredTransactions = useMemo(() => {
        const start = startOfMonth(displayMonth);
        const end = endOfMonth(displayMonth);
        return transactions.filter(tx => isWithinInterval(tx.date, { start, end }));
    }, [transactions, displayMonth]);

    const summary = useMemo(() => {
        const income = { ...initialCurrencyValues };
        const expense = { ...initialCurrencyValues };

        filteredTransactions.forEach(tx => {
            const account = defaultAccounts.find(a => a.id === tx.accountId);
            if (!account) return;

            const multiplier = tx.type === 'debit' ? 1 : -1;
            
            currencies.forEach(c => {
                const amount = (tx.amount?.[c] || 0) * multiplier;
                if (account.type === 'income') {
                    income[c] -= amount; // Incomes are credited, so we reverse the sign
                } else if (account.type === 'expense') {
                    expense[c] += amount; // Expenses are debited
                }
            });
        });

        const net = currencies.reduce((acc, c) => {
            acc[c] = income[c] - expense[c];
            return acc;
        }, { ...initialCurrencyValues });

        return { income, expense, net };
    }, [filteredTransactions]);
    
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
                        {format(displayMonth, "LLLL yyyy")}
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
                                                setDisplayMonth(newDate);
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


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                 <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ລາຍຮັບ-ລາຍຈ່າຍ (ສະຫະກອນ)</h1>
                </div>
                 <div className="ml-auto">
                    <MonthYearSelector />
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <SummaryCard title="ລາຍຮັບລວມ" balances={summary.income} />
                    <SummaryCard title="ລາຍຈ່າຍລວມ" balances={summary.expense} />
                    <SummaryCard title="ກຳໄລ/ຂາດທຶນສຸດທິ" balances={summary.net} />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>ລາຍການທຸລະກຳຫຼ້າສຸດ</CardTitle>
                        <CardDescription>ສະແດງທຸກລາຍການເຄື່ອນໄຫວທາງການເງິນ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ລາຍລະອຽດ</TableHead>
                                    <TableHead>ໝວດໝູ່</TableHead>
                                    <TableHead>ປະເພດ</TableHead>
                                    {currencies.map(c => <TableHead key={c} className="text-right uppercase">{c}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {filteredTransactions.map(tx => {
                                    const account = defaultAccounts.find(a => a.id === tx.accountId);
                                    if (!account || (account.type !== 'income' && account.type !== 'expense')) {
                                        return null;
                                    }

                                    const isIncome = account.type === 'income';
                                    // In double entry, income is a credit, expense is a debit.
                                    // A credit transaction on an income account is an increase.
                                    // A debit transaction on an expense account is an increase.
                                    const effectiveType = (isIncome && tx.type === 'credit') || (!isIncome && tx.type === 'debit') ? 'income' : 'expense';

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(tx.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell>
                                                 <Badge variant={effectiveType === 'income' ? 'default' : 'destructive'} className={effectiveType === 'income' ? 'bg-green-100 text-green-800' : ''}>
                                                    {effectiveType === 'income' ? 'ລາຍຮັບ' : 'ລາຍຈ່າຍ'}
                                                </Badge>
                                            </TableCell>
                                            {currencies.map(c => {
                                                const amount = tx.amount[c] || 0;
                                                return (
                                                    <TableCell key={c} className={`text-right font-mono ${amount > 0 ? (effectiveType === 'income' ? 'text-green-600' : 'text-red-600') : ''}`}>
                                                        {amount > 0 ? formatCurrency(amount) : '-'}
                                                    </TableCell>
                                                )
                                            })}
                                        </TableRow>
                                    )
                                }).filter(Boolean)}
                            </TableBody>
                        </Table>
                         {filteredTransactions.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳໃນເດືອນທີ່ເລືອກ</div>}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}


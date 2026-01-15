
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Calendar as CalendarIcon, Printer } from "lucide-react";
import { listenToCooperativeTransactions } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import { listenToCooperativeMembers } from '@/services/cooperativeMemberService';
import { listenToCooperativeDeposits } from '@/services/cooperativeDepositService';
import type { Transaction, CurrencyValues, CooperativeMember, CooperativeDeposit } from '@/lib/types';
import { getYear, format, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from '@/components/ui/label';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
const SHARE_VALUE_KIP = 100000;
const MEMBER_DIVIDEND_PERCENTAGE = 0.40;

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function DividendMembersPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [members, setMembers] = useState<CooperativeMember[]>([]);
    const [deposits, setDeposits] = useState<CooperativeDeposit[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        const unsubscribeTxs = listenToCooperativeTransactions(setTransactions);
        const unsubscribeMembers = listenToCooperativeMembers(setMembers);
        const unsubscribeDeposits = listenToCooperativeDeposits(setDeposits);
        return () => {
            unsubscribeTxs();
            unsubscribeMembers();
            unsubscribeDeposits();
        };
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set(transactions.map(t => getYear(t.date)));
        const currentYear = new Date().getFullYear();
        years.add(currentYear);
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    const netProfit = useMemo(() => {
        const yearDate = new Date(selectedYear, 0, 1);
        const startDate = startOfYear(yearDate);
        const endDate = endOfYear(yearDate);

        const filteredTransactions = transactions.filter(tx => isWithinInterval(tx.date, { start: startDate, end: endDate }));

        const totalIncome = { ...initialCurrencyValues };
        const totalExpense = { ...initialCurrencyValues };

        filteredTransactions.forEach(tx => {
            const account = defaultAccounts.find(a => a.id === tx.accountId);
            if (!account) return;
            const multiplier = tx.type === 'debit' ? 1 : -1;
            currencies.forEach(c => {
                const amount = (tx.amount?.[c] || 0) * multiplier;
                if (account.type === 'income') totalIncome[c] -= amount;
                else if (account.type === 'expense') totalExpense[c] += amount;
            });
        });
        
        return currencies.reduce((acc, c) => {
            acc[c] = totalIncome[c] - totalExpense[c];
            return acc;
        }, { ...initialCurrencyValues });
    }, [transactions, selectedYear]);

    const memberData = useMemo(() => {
        const membersWithDeposits = members.map(member => {
            const memberDeposits = deposits.filter(d => d.memberId === member.id);
            const totalDepositKip = (member.deposits?.kip || 0) + memberDeposits.reduce((sum, d) => sum + (d.kip || 0), 0);
            const shares = Math.floor(totalDepositKip / SHARE_VALUE_KIP);
            return { ...member, totalDepositKip, shares };
        });

        const totalShares = membersWithDeposits.reduce((sum, m) => sum + m.shares, 0);
        
        const memberDividendPool = currencies.reduce((acc, c) => {
            acc[c] = (netProfit[c] || 0) * MEMBER_DIVIDEND_PERCENTAGE;
            return acc;
        }, { ...initialCurrencyValues });

        const dividendPerShare = currencies.reduce((acc, c) => {
            acc[c] = totalShares > 0 ? memberDividendPool[c] / totalShares : 0;
            return acc;
        }, { ...initialCurrencyValues });

        const membersWithDividend = membersWithDeposits.map(m => {
            const dividend = currencies.reduce((acc, c) => {
                acc[c] = m.shares * dividendPerShare[c];
                return acc;
            }, { ...initialCurrencyValues });
            return { ...m, dividend };
        });
        
        return { membersWithDividend, totalShares, memberDividendPool, dividendPerShare };
    }, [members, deposits, netProfit]);


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
                    <h1 className="text-xl font-bold tracking-tight">ລາຍງານການປັນຜົນໃຫ້ສະມາຊິກ</h1>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>ໂຕກອງ</CardTitle>
                        <CardContent className="flex flex-col md:flex-row md:items-end gap-4 pt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="year-selector">ເລືອກປີ</Label>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button id="year-selector" variant="outline" className="w-[200px] justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedYear ? `ປີ ${selectedYear + 543}` : 'ເລືອກປີ'}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {availableYears.map(year => (
                                            <DropdownMenuItem key={year} onSelect={() => setSelectedYear(year)}>
                                                {year + 543}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>ການປັນຜົນໃຫ້ສະມາຊິກ ປີ {selectedYear + 543}</CardTitle>
                         <CardDescription>
                            ກຳໄລສຸດທິທັງໝົດຂອງສະຫະກອນໃນປີ {selectedYear + 543}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(netProfit).map(([currency, value]) => (
                                <div key={currency} className="p-4 border rounded-lg">
                                    <h4 className="text-sm font-medium text-muted-foreground uppercase">{currency}</h4>
                                    <p className={`text-2xl font-bold ${value < 0 ? 'text-red-500' : 'text-green-600'}`}>{formatCurrency(value)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                            <h3 className="font-semibold text-blue-800">ກຳໄລສ່ວນຂອງສະມາຊິກ (40%)</h3>
                             <div className="flex flex-wrap gap-x-4">
                                {Object.entries(memberData.memberDividendPool).map(([currency, value]) => (
                                    <div key={currency} className="text-lg font-bold text-blue-700">
                                        <span className="text-sm uppercase">{currency}:</span> {formatCurrency(value)}
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
                            <h3 className="font-semibold text-amber-800">ເງິນປັນຜົນຕໍ່ຫຸ້ນ</h3>
                             <div className="flex flex-wrap gap-x-4">
                                {Object.entries(memberData.dividendPerShare).map(([currency, value]) => (
                                    <div key={currency} className="text-lg font-bold text-amber-700">
                                        <span className="text-sm uppercase">{currency}:</span> {formatCurrency(value)}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">ຄຳນວນຈາກ: ຍອດເງິນປັນຜົນສະມາຊິກ / ຈຳນວນຫຸ້ນທັງໝົດ ({memberData.totalShares} ຫຸ້ນ)</p>
                        </div>

                      <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ລະຫັດ</TableHead>
                                <TableHead>ຊື່ສະມາຊິກ</TableHead>
                                <TableHead className="text-right">ເງິນຝາກ (KIP)</TableHead>
                                <TableHead className="text-right">ຈຳນວນຫຸ້ນ</TableHead>
                                {currencies.map(c => <TableHead key={c} className="text-right uppercase">ປັນຜົນ {c}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {memberData.membersWithDividend.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-mono">{member.memberId}</TableCell>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(member.totalDepositKip)}</TableCell>
                                    <TableCell className="text-right font-bold">{member.shares}</TableCell>
                                    {currencies.map(c => (
                                        <TableCell key={c} className="text-right font-mono text-green-600">
                                            {formatCurrency(member.dividend[c])}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-muted font-bold">
                                <TableCell colSpan={3} className="text-right">ລວມທັງໝົດ</TableCell>
                                <TableCell className="text-right">{memberData.totalShares}</TableCell>
                                {currencies.map(c => (
                                    <TableCell key={c} className="text-right font-mono text-green-700">
                                        {formatCurrency(memberData.memberDividendPool[c])}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableFooter>
                      </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}


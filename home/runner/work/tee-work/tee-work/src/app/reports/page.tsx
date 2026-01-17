
"use client"

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ArrowLeft, BarChart, ArrowUpCircle, ArrowDownCircle, Scale, Minus, Printer } from "lucide-react";
import { listenToAllTransactions } from '@/services/accountancyService';
import type { Transaction } from '@/lib/types';
import { getYear, getMonth, format } from 'date-fns';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { style: 'currency', currency: 'LAK', currencyDisplay: 'code', minimumFractionDigits: 0 }).format(value).replace('LAK', 'KIP');
};

const SummaryCard = ({ title, value, icon, className }: { title: string, value: string, icon: React.ReactNode, className?: string }) => (
    <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

type MonthlySummary = {
    month: number;
    income: number;
    expense: number;
    net: number;
}

type YearlySummary = {
    year: number;
    income: number;
    expense: number;
    net: number;
    months: MonthlySummary[];
}

export default function ReportsPage() {
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        // Use the specific function to fetch all transactions for the report
        const unsubscribe = listenToAllTransactions(setAllTransactions);
        return () => unsubscribe();
    }, []);

    const grandTotalIncome = useMemo(() => {
        return allTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
    }, [allTransactions]);

    const grandTotalExpense = useMemo(() => {
        return allTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
    }, [allTransactions]);

    const grandTotalNet = useMemo(() => {
        return grandTotalIncome - grandTotalExpense;
    }, [grandTotalIncome, grandTotalExpense]);

    const reportsData: YearlySummary[] = useMemo(() => {
        const groupedByYear: Record<number, Record<number, { income: number, expense: number }>> = {};

        allTransactions.forEach(tx => {
            const year = getYear(tx.date);
            const month = getMonth(tx.date); // 0-11

            if (!groupedByYear[year]) {
                groupedByYear[year] = {};
            }
            if (!groupedByYear[year][month]) {
                groupedByYear[year][month] = { income: 0, expense: 0 };
            }

            if (tx.type === 'income') {
                groupedByYear[year][month].income += tx.amount;
            } else {
                groupedByYear[year][month].expense += tx.amount;
            }
        });

        const result: YearlySummary[] = Object.entries(groupedByYear).map(([yearStr, monthsData]) => {
            const year = parseInt(yearStr);
            let yearlyIncome = 0;
            let yearlyExpense = 0;

            const months: MonthlySummary[] = Object.entries(monthsData).map(([monthStr, data]) => {
                const month = parseInt(monthStr);
                const net = data.income - data.expense;
                yearlyIncome += data.income;
                yearlyExpense += data.expense;
                return { month, income: data.income, expense: data.expense, net };
            }).sort((a, b) => a.month - b.month);

            return {
                year,
                income: yearlyIncome,
                expense: yearlyExpense,
                net: yearlyIncome - yearlyExpense,
                months
            };
        }).sort((a, b) => b.year - a.year); // Sort years descending

        return result;

    }, [allTransactions]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/agriculture">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປໜ້າຫຼັກ</span>
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <BarChart className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ສະຫຼຸບຍອດລາຍປີ/ລາຍເດືອນ</h1>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>ພາບລວມທັງໝົດ</CardTitle>
                        <CardDescription>ສະຫຼຸບລາຍຮັບ, ລາຍຈ່າຍ ແລະ กำไร/ขาดทุนທັງໝົດຕັ້ງແຕ່ເລີ່ມຕົ້ນ</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SummaryCard 
                            title="ລວມລາຍຮັບທັງໝົດ" 
                            value={formatCurrency(grandTotalIncome)}
                            icon={<ArrowUpCircle className="h-5 w-5 text-green-500" />}
                        />
                        <SummaryCard 
                            title="ລວມລາຍຈ່າຍທັງໝົດ" 
                            value={formatCurrency(grandTotalExpense)}
                            icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />}
                        />
                        <SummaryCard 
                            title="ກຳໄລ/ຂາດທຶນສະສົມ" 
                            value={formatCurrency(grandTotalNet)}
                            icon={grandTotalNet >= 0 ? <Scale className="h-5 w-5 text-blue-500" /> : <Minus className="h-5 w-5 text-red-500" />}
                            className={grandTotalNet >= 0 ? 'text-blue-600' : 'text-red-600'}
                        />
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>ສະຫຼຸບຜົນປະກອບການລາຍປີ</CardTitle>
                        <CardDescription>ສະແດງລາຍຮັບ, ລາຍຈ່າຍ ແລະ ກຳໄລສຸດທິ ແຍກຕາມປີ ແລະ ເດືອນ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {reportsData.length > 0 ? (
                             <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                                {reportsData.map((yearSummary, index) => (
                                    <AccordionItem value={`item-${index}`} key={yearSummary.year}>
                                        <AccordionTrigger className="bg-muted/50 px-4 rounded-md">
                                            <div className="flex justify-between w-full pr-4 text-lg font-bold">
                                                <span>ປີ {yearSummary.year + 543}</span>
                                                <div className="flex gap-4">
                                                    <span className="text-green-600">ຮັບ: {formatCurrency(yearSummary.income)}</span>
                                                    <span className="text-red-600">ຈ່າຍ: {formatCurrency(yearSummary.expense)}</span>
                                                    <span className={yearSummary.net >= 0 ? 'text-blue-600' : 'text-red-600'}>
                                                        ກຳໄລ: {formatCurrency(yearSummary.net)}
                                                    </span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-1/4">ເດືອນ</TableHead>
                                                        <TableHead className="text-right text-green-600">ລາຍຮັບ</TableHead>
                                                        <TableHead className="text-right text-red-600">ລາຍຈ່າຍ</TableHead>
                                                        <TableHead className="text-right">ກຳໄລ/ຂາດທຶນສຸດທິ</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {yearSummary.months.map(monthSummary => (
                                                         <TableRow key={monthSummary.month}>
                                                            <TableCell className="font-medium">
                                                                {format(new Date(yearSummary.year, monthSummary.month), "LLLL")}
                                                            </TableCell>
                                                            <TableCell className="text-right">{formatCurrency(monthSummary.income)}</TableCell>
                                                            <TableCell className="text-right">{formatCurrency(monthSummary.expense)}</TableCell>
                                                            <TableCell className={`text-right font-semibold ${monthSummary.net >= 0 ? '' : 'text-red-600'}`}>{formatCurrency(monthSummary.net)}</TableCell>
                                                         </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                             </Accordion>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                ບໍ່ມີຂໍ້ມູນທຸລະກຳ
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}


"use client"

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ArrowLeft, FilePieChart, Calendar as CalendarIcon } from "lucide-react";
import { listenToAllTourPrograms, listenToAllTourCostItems, listenToAllTourIncomeItems } from '@/services/tourReportService';
import type { TourProgram, TourCostItem, TourIncomeItem, Currency } from '@/lib/types';
import { getYear, format, startOfYear, endOfYear, isWithinInterval } from 'date-fns';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from '@/components/ui/label';
import { Calendar } from "@/components/ui/calendar";
import { ExchangeRateCard, type ExchangeRates } from '@/components/tour/ExchangeRateCard';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(value);
};

const currencies: Currency[] = ['LAK', 'THB', 'USD', 'CNY'];

type ProgramReport = TourProgram & {
    totalCost: Record<Currency, number>;
    totalIncome: Record<Currency, number>;
    profit: Record<Currency, number>;
}

type YearlyReport = {
    year: number;
    programs: ProgramReport[];
    totalProfit: Record<Currency, number>;
}

const initialRates: ExchangeRates = {
    USD: { THB: 38, LAK: 25000, CNY: 8 },
    THB: { USD: 0.032, LAK: 700, CNY: 0.25 },
    CNY: { USD: 0.20, THB: 6, LAK: 3500 },
    LAK: { USD: 0.00005, THB: 0.0015, CNY: 0.00035 },
};

export default function ProgramSummaryPage() {
    const [programs, setPrograms] = useState<TourProgram[]>([]);
    const [costs, setCosts] = useState<TourCostItem[]>([]);
    const [incomes, setIncomes] = useState<TourIncomeItem[]>([]);
    const [startDate, setStartDate] = useState<Date | undefined>(startOfYear(new Date()));
    const [endDate, setEndDate] = useState<Date | undefined>(endOfYear(new Date()));
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(initialRates);

    useEffect(() => {
        const unsubscribePrograms = listenToAllTourPrograms(setPrograms);
        const unsubscribeCosts = listenToAllTourCostItems(setCosts);
        const unsubscribeIncomes = listenToAllTourIncomeItems(setIncomes);
        return () => {
            unsubscribePrograms();
            unsubscribeCosts();
            unsubscribeIncomes();
        };
    }, []);

    const reportsData: YearlyReport[] = useMemo(() => {
        const costsByProgram = costs.reduce((acc, item) => {
            if (!acc[item.programId]) {
                acc[item.programId] = [];
            }
            acc[item.programId].push(item);
            return acc;
        }, {} as Record<string, TourCostItem[]>);

        const incomesByProgram = incomes.reduce((acc, item) => {
            if (!acc[item.programId]) {
                acc[item.programId] = [];
            }
            acc[item.programId].push(item);
            return acc;
        }, {} as Record<string, TourIncomeItem[]>);
        
        const filteredPrograms = programs.filter(p => {
            if (!p.date) return false;
            if (!startDate || !endDate) return true;
            return isWithinInterval(p.date, { start: startDate, end: endDate });
        });

        const programReports = filteredPrograms.map(p => {
            const programCosts = costsByProgram[p.id] || [];
            const programIncomes = incomesByProgram[p.id] || [];

            const totalCost = programCosts.reduce((acc, item) => {
                currencies.forEach(c => acc[c] += item[c.toLowerCase() as keyof typeof item] as number || 0);
                return acc;
            }, { LAK: 0, THB: 0, USD: 0, CNY: 0 });

            const totalIncome = programIncomes.reduce((acc, item) => {
                currencies.forEach(c => acc[c] += item[c.toLowerCase() as keyof typeof item] as number || 0);
                return acc;
            }, { LAK: 0, THB: 0, USD: 0, CNY: 0 });

            const profit = currencies.reduce((acc, c) => {
                acc[c] = totalIncome[c] - totalCost[c];
                return acc;
            }, { LAK: 0, THB: 0, USD: 0, CNY: 0 });

            return { ...p, totalCost, totalIncome, profit };
        });

        const groupedByYear = programReports.reduce((acc, report) => {
            const year = getYear(report.date);
            if (!acc[year]) {
                acc[year] = { year, programs: [], totalProfit: { LAK: 0, THB: 0, USD: 0, CNY: 0 } };
            }
            acc[year].programs.push(report);
            currencies.forEach(c => acc[year].totalProfit[c] += report.profit[c]);
            return acc;
        }, {} as Record<number, YearlyReport>);
        
        return Object.values(groupedByYear).sort((a, b) => b.year - a.year);

    }, [programs, costs, incomes, startDate, endDate]);

    const grandTotalProfit = useMemo(() => {
        const total = { LAK: 0, THB: 0, USD: 0, CNY: 0 };
        reportsData.forEach(yearlyReport => {
            (Object.keys(total) as Currency[]).forEach(c => {
                total[c] += yearlyReport.totalProfit[c] || 0;
            });
        });
        return total;
    }, [reportsData]);
    

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tour/reports">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປໜ้ารາຍງານ</span>
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <FilePieChart className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ສະຫຼຸບຜົນປະກອບການລາຍໂປຣແກຣມ</h1>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>ໂຕກອງລາຍງານ</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-4 gap-4">
                        <div className="grid gap-2">
                             <Label htmlFor="start-date">ວັນທີເລີ່ມຕົ້ນ</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="start-date" variant={"outline"} className="justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, "dd/MM/yyyy") : <span>ເລືອກວັນທີ</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus  /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                             <Label htmlFor="end-date">ວັນທີສິ້ນສຸດ</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="end-date" variant={"outline"} className="justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, "dd/MM/yyyy") : <span>ເລືອກວັນທີ</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus  /></PopoverContent>
                            </Popover>
                        </div>
                    </CardContent>
                </Card>

                 {reportsData.map((yearlyReport) => (
                    <Card key={yearlyReport.year}>
                        <CardHeader>
                            <CardTitle>ພາບລວມປີ {yearlyReport.year + 543}</CardTitle>
                            <CardDescription>ພາບລວມກຳໄລ-ຂາດທຶນ ແລະ ລາຍລະອຽດຂອງແຕ່ລະໂປຣແກຣມ</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <h3 className="text-md font-semibold mb-2">ພາບລວມກຳໄລ/ຂາດທຶນ ປະຈຳປີ {yearlyReport.year + 543}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {currencies.map(c => (
                                        <div key={c} className="p-3 bg-background rounded-lg border">
                                            <p className="text-sm text-muted-foreground">{c}</p>
                                            <p className={`text-xl font-bold ${yearlyReport.totalProfit[c] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(yearlyReport.totalProfit[c])}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-md font-semibold mb-2 mt-4">ລາຍລະອຽດລາຍໂປຣແກຣມ</h3>
                                <Accordion type="single" collapsible className="w-full">
                                    {yearlyReport.programs.map((program) => (
                                        <AccordionItem value={program.id} key={program.id}>
                                            <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                                                <div className="flex justify-between w-full pr-4 items-center">
                                                    <div className="text-left">
                                                        <p className="font-bold">{program.programName}</p>
                                                        <p className="text-sm text-muted-foreground">{program.tourCode} | {program.date ? format(program.date, "dd MMM yyyy") : ''}</p>
                                                    </div>
                                                    <div className="flex gap-4 text-xs font-mono text-right">
                                                        {currencies.map(c => (
                                                            <div key={c} className="w-24">
                                                                <span className="text-muted-foreground">{c}: </span> 
                                                                <span className={program.profit[c] >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(program.profit[c])}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>ສະກຸນເງິນ</TableHead>
                                                            <TableHead className="text-right">ລາຍຮັບລວມ</TableHead>
                                                            <TableHead className="text-right">ຕົ້ນທຶນລວມ</TableHead>
                                                            <TableHead className="text-right">ກຳໄລ/ຂາດທຶນ</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {currencies.map(c => (
                                                            <TableRow key={c}>
                                                                <TableCell className="font-medium">{c}</TableCell>
                                                                <TableCell className="text-right text-green-600">{formatCurrency(program.totalIncome[c])}</TableCell>
                                                                <TableCell className="text-right text-red-600">{formatCurrency(program.totalCost[c])}</TableCell>
                                                                <TableCell className={`text-right font-bold ${program.profit[c] >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                                    {formatCurrency(program.profit[c])}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                    <TableFooter>
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-right">
                                                                <Button variant="outline" size="sm" asChild>
                                                                    <Link href={`/tour-programs/${program.id}`}>ໄປທີ່ໜ້າລາຍລະອຽດ</Link>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableFooter>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                 {reportsData.length === 0 && (
                    <Card>
                        <CardContent>
                             <div className="text-center text-muted-foreground py-16">
                                <p>ບໍ່ມີຂໍ້ມູນໂປຣແກຣມສຳລັບຊ່ວງວັນທີທີ່ເລືอก</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <ExchangeRateCard
                    grandTotals={grandTotalProfit}
                    rates={exchangeRates}
                    onRatesChange={setExchangeRates}
                />
            </main>
        </div>
    );
}

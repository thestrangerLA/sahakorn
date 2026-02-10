"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

export type Currency = 'USD' | 'THB' | 'LAK' | 'CNY';
export type ExchangeRates = {
  [K in Currency]?: { [T in Currency]?: number };
};

const currencySymbols: Record<Currency, string> = {
    USD: '$ (ດอลลár)',
    THB: '฿ (ບາດ)',
    LAK: '₭ (ກີບ)',
    CNY: '¥ (ຢວນ)',
};

const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', options).format(num);

export interface ExchangeRateCardProps {
    totalIncome?: Record<Currency, number>;
    totalCost: Record<Currency, number>;
    rates: ExchangeRates;
    onRatesChange: (rates: ExchangeRates) => void;
    profitPercentage?: number;
    onProfitPercentageChange?: (percent: number) => void;
    isSaving?: boolean;
}

export function ExchangeRateCard({ totalIncome, totalCost, rates, onRatesChange, profitPercentage, onProfitPercentageChange, isSaving }: ExchangeRateCardProps) {
    const { toast } = useToast();
    const [targetCurrency, setTargetCurrency] = useState<Currency>('LAK');
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => { setIsClient(true); }, []);

    const handleRateChange = (from: Currency, to: Currency, value: string) => {
        const numericValue = parseFloat(value) || 0;
        
        const newRates = {
            ...rates,
            [from]: { ...rates[from], [to]: numericValue },
        };
        onRatesChange(newRates);
    };

    const convertToTargetCurrency = (amounts?: Record<Currency, number>) => {
        if (!amounts) return 0;
        return (Object.keys(amounts) as Currency[]).reduce((acc, currency) => {
            const amount = amounts[currency] || 0;
            if (currency === targetCurrency) {
                return acc + amount;
            }
            const rate = rates[currency]?.[targetCurrency];
            if (rate) {
                return acc + (amount * rate);
            }
            const rateToUsd = rates[currency]?.USD;
            const rateFromUsd = rates['USD']?.[targetCurrency];
            if (rateToUsd && rateFromUsd) {
                return acc + (amount * rateToUsd * rateFromUsd);
            }
            return acc;
        }, 0);
    };

    const convertedIncome = useMemo(() => convertToTargetCurrency(totalIncome), [totalIncome, rates, targetCurrency]);
    const convertedCost = useMemo(() => convertToTargetCurrency(totalCost), [totalCost, rates, targetCurrency]);
    
    const calculatedProfit = useMemo(() => convertedIncome - convertedCost, [convertedIncome, convertedCost]);

    const sellingPrice = useMemo(() => {
        if (profitPercentage === undefined) return 0;
        return convertedCost * (1 + (profitPercentage / 100));
    }, [convertedCost, profitPercentage]);

    const profitFromPercentage = useMemo(() => {
        if (profitPercentage === undefined) return 0;
        return sellingPrice - convertedCost;
    }, [sellingPrice, convertedCost]);
    
    if (!isClient) {
        return null;
    }

    return (
        <>
            <div className="print:hidden">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>ອັດຕາແລກປ່ຽນ</CardTitle>
                            <CardDescription>ລະບົບຈະບັນທຶກອັດຕະໂນມັດເມື່ອມີການປ່ຽນແປງ</CardDescription>
                        </div>
                         {isSaving && <span className="text-sm text-blue-500 animate-pulse">ກຳລັງບັນທຶກ...</span>}
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md">
                            <Label className="md:col-span-3 font-semibold">1 USD =</Label>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.USD?.THB || ''} onChange={e => handleRateChange('USD', 'THB', e.target.value)} className="h-8"/>
                                <Label className="text-xs">THB</Label>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.USD?.LAK || ''} onChange={e => handleRateChange('USD', 'LAK', e.target.value)} className="h-8"/>
                                <Label className="text-xs">LAK</Label>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.USD?.CNY || ''} onChange={e => handleRateChange('USD', 'CNY', e.target.value)} className="h-8"/>
                                <Label className="text-xs">CNY</Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md">
                            <Label className="md:col-span-3 font-semibold">1 THB =</Label>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.THB?.USD || ''} onChange={e => handleRateChange('THB', 'USD', e.target.value)} className="h-8"/>
                                <Label className="text-xs">USD</Label>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.THB?.LAK || ''} onChange={e => handleRateChange('THB', 'LAK', e.target.value)} className="h-8"/>
                                <Label className="text-xs">LAK</Label>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.THB?.CNY || ''} onChange={e => handleRateChange('THB', 'CNY', e.target.value)} className="h-8"/>
                                <Label className="text-xs">CNY</Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md">
                            <Label className="md:col-span-3 font-semibold">1 CNY =</Label>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.CNY?.USD || ''} onChange={e => handleRateChange('CNY', 'USD', e.target.value)} className="h-8"/>
                                <Label className="text-xs">USD</Label>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.CNY?.THB || ''} onChange={e => handleRateChange('CNY', 'THB', e.target.value)} className="h-8"/>
                                <Label className="text-xs">THB</Label>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.CNY?.LAK || ''} onChange={e => handleRateChange('CNY', 'LAK', e.target.value)} className="h-8"/>
                                <Label className="text-xs">LAK</Label>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 border rounded-md">
                            <Label className="md:col-span-3 font-semibold">1 LAK =</Label>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.LAK?.USD || ''} onChange={e => handleRateChange('LAK', 'USD', e.target.value)} className="h-8"/>
                                <Label className="text-xs">USD</Label>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.LAK?.THB || ''} onChange={e => handleRateChange('LAK', 'THB', e.target.value)} className="h-8"/>
                                <Label className="text-xs">THB</Label>
                            </div>
                            <div className="flex items-center gap-1">
                                <Input type="number" value={rates.LAK?.CNY || ''} onChange={e => handleRateChange('LAK', 'CNY', e.target.value)} className="h-8"/>
                                <Label className="text-xs">CNY</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>{onProfitPercentageChange ? 'ຄຳນວນລາຄາຂາຍ' : 'ສະຫຼຸບກຳໄລ'}</CardTitle>
                    <div className="grid md:grid-cols-2 gap-4 items-end pt-4">
                        <div>
                            <Label htmlFor="target-currency">ເລືອກສະກຸນເງິນທີ່ຕ້ອງການປ່ຽນ</Label>
                            <Select value={targetCurrency} onValueChange={(v: Currency) => setTargetCurrency(v)}>
                                <SelectTrigger id="target-currency">
                                    <SelectValue placeholder="ເລືອກສະກຸນເງິນ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(currencySymbols) as Currency[]).map(c => (
                                        <SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                {totalIncome ? (
                    // Profit Summary View
                    <CardContent className="grid md:grid-cols-3 gap-4">
                        <Card className="bg-green-50 border-green-200">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ລາຍຮັບລວມ ({targetCurrency})</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold">{formatNumber(convertedIncome)}</p></CardContent>
                        </Card>
                        <Card className="bg-red-50 border-red-200">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ຕົ້ນທຶນລວມ ({targetCurrency})</CardTitle></CardHeader>
                            <CardContent><p className="text-2xl font-bold">{formatNumber(convertedCost)}</p></CardContent>
                        </Card>
                        <Card className="bg-blue-50 border-blue-200">
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">ກຳໄລສຸດທິ ({targetCurrency})</CardTitle></CardHeader>
                            <CardContent><p className={`text-2xl font-bold ${calculatedProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatNumber(calculatedProfit)}</p></CardContent>
                        </Card>
                    </CardContent>
                ) : onProfitPercentageChange && profitPercentage !== undefined ? (
                    // Selling Price Calculator View
                    <CardContent className="grid md:grid-cols-3 gap-6 items-end">
                        <div className="grid gap-2">
                            <Label htmlFor="profit-percentage">ກຳໄລທີ່ຕ້ອງການ (%)</Label>
                            <Input 
                                id="profit-percentage" 
                                type="number" 
                                value={profitPercentage} 
                                onChange={e => onProfitPercentageChange(Number(e.target.value) || 0)} 
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2 pt-2 text-right bg-muted/50 p-4 rounded-lg">
                            <div className="text-sm text-muted-foreground">ຕົ້ນທຶນລວມ: <span className="font-bold text-foreground">{formatNumber(convertedCost)} {targetCurrency}</span></div>
                            <div className="text-lg font-bold">ລາຄາຂາຍ: <span className="text-blue-600">{formatNumber(sellingPrice)} {targetCurrency}</span></div>
                            <div className="text-md font-semibold text-green-600">ກຳໄລ: {formatNumber(profitFromPercentage)} {targetCurrency}</div>
                        </div>
                    </CardContent>
                ) : null}
            </Card>
        </>
    );
}


"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart } from 'lucide-react';

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

interface ExchangeRateCardProps {
    grandTotals: Record<Currency, number>;
    rates: ExchangeRates;
    onRatesChange: (rates: ExchangeRates) => void;
}

export function ExchangeRateCard({ grandTotals, rates, onRatesChange }: ExchangeRateCardProps) {
    const [targetCurrency, setTargetCurrency] = useState<Currency>('LAK');

    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);


    const handleRateChange = (from: Currency, to: Currency, value: string) => {
        const numericValue = parseFloat(value) || 0;
        
        onRatesChange({
            ...rates,
            [from]: { ...rates[from], [to]: numericValue },
        });
    };
    
    const convertedTotal = useMemo(() => {
        return (Object.keys(grandTotals) as Currency[]).reduce((acc, currency) => {
            const amount = grandTotals[currency];
            if (currency === targetCurrency) {
                return acc + amount;
            }
            // Find a path, for simplicity, we assume direct conversion or via USD
            const rate = rates[currency]?.[targetCurrency];
            if (rate) {
                return acc + (amount * rate);
            }
             // Fallback via USD if direct rate is missing
            const rateToUsd = rates[currency]?.USD;
            const rateFromUsd = rates['USD']?.[targetCurrency];
            if (rateToUsd && rateFromUsd) {
                return acc + (amount * rateToUsd * rateFromUsd);
            }
            return acc; // Return accumulator if no conversion path found
        }, 0);

    }, [grandTotals, rates, targetCurrency]);

    
    if (!isClient) {
        return null;
    }

    return (
        <>
            <div className="print:hidden">
                <Card>
                    <CardHeader>
                        <CardTitle>ອັດຕາແລກປ່ຽນ</CardTitle>
                        <CardDescription>ສະຫຼຸບລວມຍອດຄ່າໃຊ້ຈ່າຍທັງໝົດ ແລະ ໃສ່ອັດຕາແລກປ່ຽນ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div>
                            <div className="space-y-3 mt-2">
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
                            </div>
                        </div>

                        {/* Converted Total Section */}
                        <Card className="border-dashed border-2">
                            <CardContent className="p-4 space-y-4">
                                <div className="grid md:grid-cols-1 gap-4 items-end">
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
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-1 gap-6 print:grid-cols-1 print:gap-2 print:pt-2">
                <Card>
                    <CardHeader className="print:p-2">
                        <CardTitle className="text-lg print:text-sm">ຍອດລວມທີ່ແປງແລ້ວ</CardTitle>
                        <CardDescription className="text-xs print:hidden">ຍອດລວມທັງໝົດໃນສະກຸນເງິນດຽວ</CardDescription>
                    </CardHeader>
                    <CardContent className="print:p-2">
                        <div className="text-xl print:text-base font-bold text-primary p-4 print:p-2 border bg-muted rounded-md text-center">
                            <p className="text-sm print:text-xs font-medium text-muted-foreground">ຍອດລວມ</p>
                            <span>{formatNumber(convertedTotal)}</span>
                            <span className="text-sm print:text-xs font-medium text-muted-foreground ml-2">{targetCurrency}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

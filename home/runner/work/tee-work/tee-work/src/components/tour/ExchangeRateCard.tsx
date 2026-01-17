

"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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
    totalIncome: Record<Currency, number>;
    totalCost: Record<Currency, number>;
    rates: ExchangeRates;
    onRatesChange: (rates: ExchangeRates) => void;
}

export function ExchangeRateCard({ totalIncome, totalCost, rates, onRatesChange }: ExchangeRateCardProps) {
    const [targetCurrency, setTargetCurrency] = useState<Currency>('LAK');
    const [isClient, setIsClient] = useState(false);
    const [selectedCostCurrencies, setSelectedCostCurrencies] = useState<Currency[]>(['LAK', 'THB', 'USD', 'CNY']);

    useEffect(() => { setIsClient(true); }, []);

    const handleRateChange = (from: Currency, to: Currency, value: string) => {
        const numericValue = parseFloat(value) || 0;
        
        onRatesChange({
            ...rates,
            [from]: { ...rates[from], [to]: numericValue },
        });
    };

    const handleCostCurrencyToggle = (currency: Currency, checked: boolean) => {
        setSelectedCostCurrencies(prev => 
            checked
                ? [...prev, currency]
                : prev.filter(c => c !== currency)
        );
    };
    
    const convertedIncome = useMemo(() => {
        const initialValue = 0;
        if (!totalIncome || typeof totalIncome !== 'object') {
            return initialValue;
        }

        return (Object.keys(totalIncome) as Currency[]).reduce((acc, currency) => {
            const amount = totalIncome[currency] || 0;
            
            if (currency === targetCurrency) {
                return acc + amount;
            }
            
            const rate = rates[currency]?.[targetCurrency];

            if (rate) {
                return acc + (amount * rate);
            }
            // Fallback via USD
            const rateToUsd = rates[currency]?.USD;
            const rateFromUsd = rates['USD']?.[targetCurrency];
            if (rateToUsd && rateFromUsd) {
                return acc + (amount * rateToUsd * rateFromUsd);
            }

            return acc;
        }, initialValue);
    }, [totalIncome, rates, targetCurrency]);


    const convertedCost = useMemo(() => {
        return (selectedCostCurrencies).reduce((acc, currency) => {
            const amount = totalCost[currency] || 0;
            if (currency === targetCurrency) {
                return acc + amount;
            }
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
    }, [totalCost, rates, targetCurrency, selectedCostCurrencies]);

    const convertedProfit = useMemo(() => convertedIncome - convertedCost, [convertedIncome, convertedCost]);
    
    if (!isClient) {
        return null;
    }

    return (
        <>
            <div className="print:hidden">
                <Card>
                    <CardHeader>
                        <CardTitle>ອັດຕາແລກປ່ຽນ</CardTitle>
                        <CardDescription>ໃສ່ອັດຕາແລກປ່ຽນເພື່ອຄຳນວນກຳໄລສຸດທິໃນສະກຸນເງິນດຽວ</CardDescription>
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
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>ສະຫຼຸບກຳໄລ</CardTitle>
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
                        <div className="space-y-2">
                             <Label>ເລືອກຕົ້ນທຶນທີ່ຈະປ່ຽນ</Label>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-2 border rounded-md bg-muted/50">
                                {(Object.keys(totalCost) as Currency[]).map(currency => (
                                    (totalCost[currency] > 0) && (
                                        <div key={currency} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`cost-currency-${currency}`}
                                                checked={selectedCostCurrencies.includes(currency)}
                                                onCheckedChange={(checked) => handleCostCurrencyToggle(currency, !!checked)}
                                            />
                                            <Label htmlFor={`cost-currency-${currency}`} className="font-normal">{currency}</Label>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                        <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium">ລາຍຮັບລວມ ({targetCurrency})</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className="text-2xl font-bold">{formatNumber(convertedIncome)} <span className="text-sm font-medium">{targetCurrency}</span></p>
                        </CardContent>
                    </Card>
                     <Card className="bg-red-50 border-red-200">
                        <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium">ຕົ້ນທຶນລວມ ({targetCurrency})</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className="text-2xl font-bold">{formatNumber(convertedCost)} <span className="text-sm font-medium">{targetCurrency}</span></p>
                        </CardContent>
                    </Card>
                     <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium">ກຳໄລສຸດທິ ({targetCurrency})</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <p className={`text-2xl font-bold ${convertedProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatNumber(convertedProfit)} <span className="text-sm font-medium">{targetCurrency}</span></p>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>
        </>
    );
}

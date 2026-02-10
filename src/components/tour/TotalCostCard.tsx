
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, BedDouble, Truck, Plane, TrainFront, Camera, UtensilsCrossed, Users, FileText, Earth, Ticket } from 'lucide-react';

type Currency = 'USD' | 'THB' | 'LAK' | 'CNY';

type TotalsByCategory = {
    [key: string]: Record<Currency, number>;
};

type TotalCostCardProps = {
    totalsByCategory?: TotalsByCategory;
    totalCost?: Record<Currency, number>; // Make totalCost optional
};

const currencySymbols: Record<Currency, string> = {
    USD: '$',
    THB: '฿',
    LAK: '₭',
    CNY: '¥',
};

const formatNumber = (num: number) => {
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
};

const categoryIcons: { [key: string]: React.ReactNode } = {
    'ຄ່າທີ່ພັກ': <BedDouble className="h-6 w-6 text-purple-500" />,
    'ຄ່າຂົນສົ່ງ': <Truck className="h-6 w-6 text-green-500" />,
    'ຄ່າປີ້ຍົນ': <Plane className="h-6 w-6 text-blue-500" />,
    'ຄ່າປີ້ລົດໄຟ': <TrainFront className="h-6 w-6 text-orange-500" />,
    'ຄ່າເຂົ້າຊົມສະຖານທີ່': <Camera className="h-6 w-6 text-red-500" />,
    'ຄ່າອາຫານ': <UtensilsCrossed className="h-6 w-6 text-yellow-500" />,
    'ຄ່າໄກ້': <Users className="h-6 w-6 text-indigo-500" />,
    'ຄ່າເອກະສານ': <FileText className="h-6 w-6 text-pink-500" />,
    'ຄ່າເພັກເກດຕ່າງປະເທດ': <Earth className="h-6 w-6 text-teal-500" />,
    'ຄ່າກິດຈະກຳ': <Ticket className="h-6 w-6 text-cyan-500" />,
};


export function TotalCostCard({ totalsByCategory, totalCost }: TotalCostCardProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null; 
    }

    const hasData = totalsByCategory && Object.values(totalsByCategory).some(categoryTotals =>
        categoryTotals && Object.values(categoryTotals).some(value => value > 0)
    );

    return (
        <Card className="w-full shadow-md print:shadow-none print:border-0">
            <CardHeader className="flex flex-row items-center gap-3 bg-muted/50 rounded-t-lg print:bg-transparent print:p-2">
                <Calculator className="h-6 w-6 text-primary print:hidden" />
                <CardTitle className="text-xl print:text-sm print:font-bold">ສະຫຼຸບຕາມໝວດໝູ່</CardTitle>
            </CardHeader>
            <CardContent className="p-6 print:p-0">
                {hasData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
                        {Object.entries(totalsByCategory!).map(([category, totals]) => {
                            const filteredTotals = Object.entries(totals).filter(([, value]) => value > 0);
                            if (filteredTotals.length === 0) return null;

                            return (
                                <Card key={category} className="bg-background shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border print:rounded-md">
                                    <CardContent className="p-4 print:p-2 flex items-start gap-3 print:gap-2">
                                        <div className="bg-muted p-3 print:p-1.5 rounded-full print:hidden">
                                            {categoryIcons[category] || <Calculator className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-muted-foreground print:text-xs">{category}</p>
                                            {filteredTotals.map(([currency, value]) => (
                                                <p key={currency} className="text-lg font-bold print:text-sm">
                                                   {currencySymbols[currency as Currency]}{formatNumber(value)}
                                                </p>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-8 print:py-2 print:text-xs">
                        <p>ຍັງບໍ່ມີຂໍ້ມູນຄ່າໃຊ້ຈ່າຍ</p>
                        <p className="text-sm print:hidden">ກະລຸນາປ້ອນຂໍ້ມູນໃນໝວດໝູ່ຕ່າງໆ ເພື່ອເບິ່ງສະຫຼຸບລາຍຈ່າຍ</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

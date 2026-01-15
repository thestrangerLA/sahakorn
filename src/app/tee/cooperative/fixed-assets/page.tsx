
"use client"

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Transaction, CurrencyValues } from '@/lib/types';
import { listenToCooperativeTransactions, deleteTransactionGroup, updateCooperativeTransaction } from '@/services/cooperativeAccountingService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function CooperativeFixedAssetsPage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);

    const fixedAssetTransactions = useMemo(() => {
        return transactions.filter(tx => tx.accountId === 'fixed_assets' && tx.type === 'debit');
    }, [transactions]);
    
    const totalAssets = useMemo(() => {
        return fixedAssetTransactions.reduce((acc, tx) => {
            currencies.forEach(c => {
                acc[c] += tx.amount[c] || 0;
            });
            return acc;
        }, { ...initialCurrencyValues });
    }, [fixedAssetTransactions]);

    const totalCurrentValue = useMemo(() => {
        return fixedAssetTransactions.reduce((acc, tx) => {
            currencies.forEach(c => {
                acc[c] += tx.currentValue?.[c] || 0;
            });
            return acc;
        }, { ...initialCurrencyValues });
    }, [fixedAssetTransactions]);

    const handleDelete = async (transactionGroupId: string | undefined) => {
        if (!transactionGroupId) {
            toast({ title: 'ບໍ່ສາມາດລຶບໄດ້', description: 'ບໍ່ພົບ Transaction Group ID', variant: 'destructive'});
            return;
        }
        try {
            await deleteTransactionGroup(transactionGroupId);
            toast({ title: "ລຶບລາຍການສຳເລັດ" });
        } catch (error) {
            toast({ title: 'ເກີດຂໍ້ຜິດພາດ', variant: 'destructive' });
        }
    }

    const handleCurrentValueChange = async (id: string, currency: keyof CurrencyValues, value: string) => {
        const numericValue = Number(value) || 0;
        
        const txToUpdate = transactions.find(t => t.id === id);
        if (!txToUpdate) return;
        
        const updatedCurrentValue = {
            ...(txToUpdate.currentValue || initialCurrencyValues),
            [currency]: numericValue,
        };

        try {
            await updateCooperativeTransaction(id, { currentValue: updatedCurrentValue });
            // No toast for this to avoid being noisy
        } catch (error) {
            toast({ title: 'Error updating current value', variant: 'destructive' });
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/accounting">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Building className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ສິນຊັບຄົງທີ່ (Fixed Assets)</h1>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>ລາຍການສິນຊັບຄົງທີ່</CardTitle>
                        <CardDescription>ລາຍການທັງໝົດທີ່ຖືກບັນທຶກເປັນສິນຊັບຄົງທີ່ຂອງສະຫະກອນ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead rowSpan={2} className="align-bottom">ວັນທີ</TableHead>
                                    <TableHead rowSpan={2} className="align-bottom">ລາຍລະອຽດ</TableHead>
                                    <TableHead colSpan={4} className="text-center border-b">ມູນຄ່າຊື້</TableHead>
                                    <TableHead colSpan={4} className="text-center border-b">ມູນຄ່າປັດຈຸບັນ</TableHead>
                                    <TableHead rowSpan={2} className="align-bottom"><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                                <TableRow>
                                    {currencies.map(c => <TableHead key={`cost-${c}`} className="text-right uppercase">{c}</TableHead>)}
                                    {currencies.map(c => <TableHead key={`current-${c}`} className="text-right uppercase">{c}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fixedAssetTransactions.length > 0 ? (
                                    fixedAssetTransactions.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(tx.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell className="font-medium">{tx.description}</TableCell>
                                            {currencies.map(c => (
                                                 <TableCell key={`cost-val-${c}`} className="text-right font-mono">{formatCurrency(tx.amount[c])}</TableCell>
                                            ))}
                                            {currencies.map(c => (
                                                <TableCell key={`current-val-${c}`} className="text-right font-mono p-1">
                                                    <Input 
                                                        type="number" 
                                                        defaultValue={tx.currentValue?.[c] || 0}
                                                        onBlur={(e) => handleCurrentValueChange(tx.id, c, e.target.value)}
                                                        className="h-8 text-right"
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>ຢືນຢັນການລົບ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                ການກະທຳນີ້ຈະລຶບການບັນທຶກການຊື້ສິນຊັບນີ້ອອກຈາກລະບົບ. ບໍ່ສາມາດຍົກເລີກໄດ້.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>ຍົກເລີກ</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(tx.transactionGroupId)}>ຢືນຢັນ</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center h-24">ບໍ່ມີລາຍການສິນຊັບຄົງທີ່</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold text-lg bg-muted">
                                    <TableCell colSpan={2}>ມູນຄ່າລວມທັງໝົດ</TableCell>
                                    {currencies.map(c => <TableCell key={`total-cost-${c}`} className="text-right">{formatCurrency(totalAssets[c])}</TableCell>)}
                                    {currencies.map(c => <TableCell key={`total-current-${c}`} className="text-right">{formatCurrency(totalCurrentValue[c])}</TableCell>)}
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

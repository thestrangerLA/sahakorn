
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
        return fixedAssetTransactions.reduce((sum, tx) => sum + (tx.currentValue || 0), 0);
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

    const handleCurrentValueChange = async (id: string, value: string) => {
        const numericValue = Number(value) || 0;
        try {
            await updateCooperativeTransaction(id, { currentValue: numericValue });
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
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ລາຍລະອຽດ</TableHead>
                                    <TableHead className="text-right">ມູນຄ່າ (KIP)</TableHead>
                                    <TableHead className="text-right">ມູນຄ່າ (THB)</TableHead>
                                    <TableHead className="text-right">ມູນຄ່າ (USD)</TableHead>
                                    <TableHead className="text-right">ມູນຄ່າ (CNY)</TableHead>
                                    <TableHead className="text-right">ມູນຄ່າປັດຈຸບັນ (KIP)</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fixedAssetTransactions.length > 0 ? (
                                    fixedAssetTransactions.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(tx.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell className="font-medium">{tx.description}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(tx.amount.kip)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(tx.amount.thb)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(tx.amount.usd)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(tx.amount.cny)}</TableCell>
                                            <TableCell className="text-right font-mono p-1">
                                                <Input 
                                                    type="number" 
                                                    defaultValue={tx.currentValue}
                                                    onBlur={(e) => handleCurrentValueChange(tx.id, e.target.value)}
                                                    className="h-8 text-right"
                                                />
                                            </TableCell>
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
                                        <TableCell colSpan={8} className="text-center h-24">ບໍ່ມີລາຍການສິນຊັບຄົງທີ່</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold text-lg bg-muted">
                                    <TableCell colSpan={2}>ມູນຄ່າລວມທັງໝົດ</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totalAssets.kip)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totalAssets.thb)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totalAssets.usd)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totalAssets.cny)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totalCurrentValue)}</TableCell>
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

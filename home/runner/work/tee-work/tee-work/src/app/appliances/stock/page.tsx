

"use client"

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Trash2, PlusCircle, DollarSign, ArrowDown, ArrowUp, Printer, Search } from "lucide-react";
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { ApplianceStockItem } from '@/lib/types';
import { listenToApplianceStockItems, addApplianceStockItem, deleteApplianceStockItem, updateApplianceStockQuantity, updateApplianceStockItem } from '@/services/applianceStockService';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};


const AddItemDialog = ({ onAddItem }: { onAddItem: (item: Omit<ApplianceStockItem, 'id'|'createdAt'>) => Promise<string> }) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newItem: Omit<ApplianceStockItem, 'id'|'createdAt'> = {
            sku: formData.get('sku') as string,
            name: formData.get('name') as string,
            costPrice: parseFloat(formData.get('costPrice') as string) || 0,
            sellingPrice: parseFloat(formData.get('sellingPrice') as string) || 0,
            currentStock: parseFloat(formData.get('currentStock') as string) || 0,
        };

        if (!newItem.sku || !newItem.name) {
             toast({ title: "Error", description: "ກະລຸນາປ້ອນ SKU ແລະ ຊື່.", variant: "destructive" });
             return;
        }

        try {
            await onAddItem(newItem);
            toast({ title: "Success", description: "ເພີ່ມລາຍການໃໝ່ສຳເລັດ." });
            setOpen(false);
            e.currentTarget.reset();
        } catch (error) {
            console.error("Error adding item:", error);
            toast({ title: "Error", description: "ບໍ່ສາມາດເພີ່ມລາຍການໄດ້.", variant: "destructive" });
        }
    }

    return (
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-8"><PlusCircle className="mr-2 h-4 w-4"/>ເພີ່ມສິນຄ້າ</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>ເພີ່ມເຄື່ອງໃຊ້ໃໝ່</DialogTitle>
                        <DialogDescription>
                           ປ້ອນລາຍລະອຽດຂອງເຄື່ອງໃຊ້ໃໝ່.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="sku">SKU/Code</Label>
                            <Input id="sku" name="sku" required />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="name">ຊື່ເຄື່ອງໃຊ້</Label>
                            <Input id="name" name="name" required />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="costPrice">ຕົ້ນทุน (KIP)</Label>
                            <Input id="costPrice" name="costPrice" type="number" step="1" />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="sellingPrice">ລາຄາຂາຍ (KIP)</Label>
                            <Input id="sellingPrice" name="sellingPrice" type="number" step="1" />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="currentStock">ຈຳນວນນຳເຂົ້າສະຕັອກ</Label>
                            <Input id="currentStock" name="currentStock" type="number" step="1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>ຍົກເລີກ</Button>
                        <Button type="submit">ບັນທຶກ</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

const StockAdjustmentDialog = ({ 
    item, 
    onAdjust, 
    type 
}: { 
    item: ApplianceStockItem, 
    onAdjust: (id: string, change: number, type: 'stock-in' | 'sale', detail: string) => Promise<void>,
    type: 'stock-in' | 'sale'
}) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [quantity, setQuantity] = useState(0);
    const [detail, setDetail] = useState('');

    const handleAdjust = async () => {
        if (quantity <= 0) {
            toast({ title: "Invalid Quantity", variant: "destructive" });
            return;
        }
        const change = type === 'sale' ? -quantity : quantity;
        try {
            await onAdjust(item.id, change, type, detail);
            toast({ title: "Stock updated successfully" });
            setOpen(false);
            setQuantity(0);
            setDetail('');
        } catch (error: any) {
            console.error("Error adjusting stock:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={type === 'stock-in' ? 'outline' : 'destructive'} size="sm" className="h-8">
                     {type === 'stock-in' ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
                    {type === 'stock-in' ? 'ຮັບເຂົ້າ' : 'ຂາຍອອກ'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{type === 'stock-in' ? 'ຮັບສິນຄ້າເຂົ້າ' : 'ຂາຍສິນຄ້າອອກ'}: {item.name}</DialogTitle>
                    <DialogDescription>ບັນທຶກການເຄື່ອນໄຫວສິນຄ້າ.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                     <div className="grid gap-2">
                        <Label htmlFor="quantity">ຈຳນວນ</Label>
                        <Input id="quantity" type="number" value={quantity || ''} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="detail">{type === 'sale' ? 'ລູກຄ້າ (ຖ້າມີ)' : 'ລາຍລະອຽດການນຳເຂົ້າ'}</Label>
                        <Input id="detail" value={detail} onChange={(e) => setDetail(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>ຍົກເລີກ</Button>
                    <Button onClick={handleAdjust}>ບັນທຶກ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ApplianceStockPage() {
    const [stockItems, setStockItems] = useState<ApplianceStockItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    useEffect(() => {
        const unsubscribeItems = listenToApplianceStockItems(setStockItems);
        return () => {
            unsubscribeItems();
        }
    }, []);

    const handleFieldChange = (id: string, field: keyof ApplianceStockItem, value: string | number) => {
        updateApplianceStockItem(id, { [field]: value });
    };
    
    const filteredStockItems = useMemo(() => {
        return stockItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [stockItems, searchQuery]);

    const totalStockValue = useMemo(() => {
        return stockItems.reduce((acc, item) => acc + (item.costPrice * item.currentStock), 0);
    }, [stockItems]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 print:bg-white">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 print:hidden">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/appliances">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປໜ້າຫຼັກ</span>
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ຈັດການສະຕັອກ (ເຄື່ອງໃຊ້)</h1>
                </div>
                 <div className="ml-auto flex items-center gap-2">
                    <AddItemDialog onAddItem={addApplianceStockItem} />
                    <Button onClick={() => window.print()} variant="outline" size="sm">
                        <Printer className="mr-2 h-4 w-4" />
                        ພິມ
                    </Button>
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="grid gap-4 md:grid-cols-2">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">ມູນຄ່າສະຕັອກທັງໝົດ</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(totalStockValue)} KIP</div>
                            <p className="text-xs text-muted-foreground">ມູນຄ່າລວມຂອງສິນຄ້າທັງໝົດໃນຄັງ (ຕາມຕົ້ນທຶນ)</p>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>ລາຍການສິນຄ້າໃນຄັງ</CardTitle>
                                <CardDescription>ລາຍການເຄື່ອງໃຊ້ທັງໝົດໃນສະຕັອກ.</CardDescription>
                            </div>
                             <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                type="search"
                                placeholder="ຄົ້ນຫາ..."
                                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>ຊື່ສິນຄ້າ</TableHead>
                                    <TableHead className="text-right">ຕົ້ນทุน</TableHead>
                                    <TableHead className="text-right">ລາຄາຂາຍ</TableHead>
                                    <TableHead className="text-right">ຄົງເຫຼືອ</TableHead>
                                    <TableHead className="text-center w-[250px]">ຈັດການ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStockItems.length > 0 ? filteredStockItems.map(item => (
                                    <TableRow key={item.id} className={item.currentStock === 0 ? 'bg-red-50/50' : ''}>
                                        <TableCell className="font-mono">{item.sku}</TableCell>
                                        <TableCell className="font-medium">
                                          <Link href={`/appliances/stock/${item.id}`} className="hover:underline">
                                            {item.name}
                                          </Link>
                                        </TableCell>
                                        <TableCell className="text-right p-1">
                                            <Input
                                                type="number"
                                                defaultValue={item.costPrice}
                                                onBlur={(e) => handleFieldChange(item.id, 'costPrice', parseFloat(e.target.value) || 0)}
                                                className="h-8 w-28 text-right"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right p-1">
                                            <Input
                                                type="number"
                                                defaultValue={item.sellingPrice}
                                                onBlur={(e) => handleFieldChange(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                                                className="h-8 w-28 text-right"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right p-1">
                                             <Input
                                                type="number"
                                                defaultValue={item.currentStock}
                                                onBlur={(e) => handleFieldChange(item.id, 'currentStock', parseInt(e.target.value, 10) || 0)}
                                                className="h-8 w-20 text-right font-bold"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center space-x-1">
                                            <StockAdjustmentDialog item={item} onAdjust={updateApplianceStockQuantity} type="stock-in" />
                                            <StockAdjustmentDialog item={item} onAdjust={updateApplianceStockQuantity} type="sale" />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the item and its logs.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteApplianceStockItem(item.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">ບໍ່ມີສິນຄ້າ</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

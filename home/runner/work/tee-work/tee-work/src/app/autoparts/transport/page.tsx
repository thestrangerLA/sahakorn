

"use client"

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, ArrowLeft, Truck, PlusCircle, Calendar as CalendarIcon, ChevronDown, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { addMultipleAutoPartsTransportEntries, listenToAutoPartsTransportEntries, updateAutoPartsTransportEntry, deleteAutoPartsTransportEntry } from '@/services/autoPartsTransportService';
import type { TransportEntry, StockItem } from '@/lib/types';
import { listenToAutoPartsStockItems } from '@/services/autoPartsStockService';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, isWithinInterval, startOfMonth, endOfMonth, getMonth, setMonth, getYear, isSameDay } from 'date-fns';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const AddEntriesDialog = ({ onAddMultipleEntries, stockItems, lastOrderNumber }: { 
    onAddMultipleEntries: (entries: Omit<TransportEntry, 'id'|'createdAt'|'date'|'type'|'sender'|'order'>[], date: Date, company: 'ANS' | 'HAL' | 'MX' | 'NH', order: number, sender: 'Tee' | 'YU') => Promise<void>;
    stockItems: StockItem[];
    lastOrderNumber: number;
}) => {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
    const [company, setCompany] = useState<'ANS' | 'HAL' | 'MX' | 'NH'>('ANS');
    const [order, setOrder] = useState<number>(lastOrderNumber + 1);
    const [sender, setSender] = useState<'Tee' | 'YU'>('Tee');
    const [entries, setEntries] = useState<Omit<TransportEntry, 'id'|'createdAt'|'date'|'type'|'order'|'sender'>[]>([]);

    useEffect(() => {
        setOrder(lastOrderNumber + 1);
    }, [lastOrderNumber, open]);


    const handleAddItem = () => {
        setEntries(prev => [...prev, { detail: '', cost: 0, quantity: 1, amount: 0, finished: false }]);
    };

    const handleItemChange = (index: number, field: keyof Omit<TransportEntry, 'id'|'createdAt'|'date'|'type'|'order'|'sender'>, value: any) => {
        setEntries(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const handleItemSelect = (index: number, selectedItem: StockItem | null) => {
        if(selectedItem) {
            handleItemChange(index, 'detail', selectedItem.name);
            handleItemChange(index, 'cost', selectedItem.costPrice);
        }
    }

    const handleRemoveItem = (index: number) => {
        setEntries(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!entryDate || entries.length === 0 || !order) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາເລືອກວັນທີ, ໃສ່ລຳດັບ ແລະ ເພີ່ມລາຍການຢ່າງໜ້ອຍໜຶ່ງລາຍການ", variant: "destructive" });
            return;
        }

        try {
            await onAddMultipleEntries(entries, entryDate, company, order, sender);
            toast({ title: "ເພີ່ມລາຍການຂົນສົ່ງສຳເລັດ" });
            setOpen(false);
            setEntries([]);
            setEntryDate(new Date());
        } catch (error) {
            console.error("Error adding multiple entries:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> ເພີ່ມລາຍການຂົນສົ່ງ</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>ເພີ່ມລາຍການຂົນສົ່ງໃໝ່</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-4 py-4">
                     <div className="grid gap-2">
                        <Label>ວັນທີ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {entryDate ? format(entryDate, "PPP") : <span>ເລືອກວັນທີ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={entryDate} onSelect={setEntryDate} initialFocus/></PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid gap-2">
                        <Label>ບໍລິສັດຂົນສົ່ງ</Label>
                        <Select value={company} onValueChange={(v) => setCompany(v as 'ANS' | 'HAL' | 'MX' | 'NH')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ANS">ANS</SelectItem>
                                <SelectItem value="HAL">HAL</SelectItem>
                                <SelectItem value="MX">MX</SelectItem>
                                <SelectItem value="NH">NH</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid gap-2">
                        <Label>ລຳດັບ</Label>
                        <Input type="number" value={order} onChange={e => setOrder(Number(e.target.value))} />
                    </div>
                    <div className="grid gap-2">
                        <Label>ຄົນຝາກ</Label>
                        <Select value={sender} onValueChange={(v) => setSender(v as 'Tee' | 'YU')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Tee">Tee</SelectItem>
                                <SelectItem value="YU">YU</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[35%]">ລາຍລະອຽດ</TableHead>
                                <TableHead className="w-[100px] text-right">ຕົ້ນທຶນ</TableHead>
                                <TableHead className="w-[80px] text-right">ຈຳນວນ</TableHead>
                                <TableHead className="w-[150px] text-right">ຈຳນວນເງິນ</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((entry, index) => (
                                <TableRow key={index}>
                                    <TableCell className="p-1">
                                        <SearchableSelect items={stockItems} value={entry.detail || ''} onValueChange={(item) => handleItemSelect(index, item)} />
                                    </TableCell>
                                    <TableCell className="p-1"><Input type="number" value={entry.cost || ''} onChange={(e) => handleItemChange(index, 'cost', Number(e.target.value))} className="h-8 text-right" /></TableCell>
                                    <TableCell className="p-1"><Input type="number" value={entry.quantity || ''} onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))} className="h-8 text-right" /></TableCell>
                                    <TableCell className="p-1"><Input type="number" value={entry.amount || ''} onChange={(e) => handleItemChange(index, 'amount', Number(e.target.value))} className="h-8 text-right" /></TableCell>
                                    <TableCell className="p-1"><Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Button variant="outline" onClick={handleAddItem} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> ເພີ່ມອີກແຖວ</Button>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>ຍົກເລີກ</Button>
                    <Button onClick={handleSave}>ບັນທຶກ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SearchableSelect = ({ items, value, onValueChange }: { items: StockItem[], value: string, onValueChange: (selectedItem: StockItem | null) => void }) => {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-8"
                >
                    <span className="truncate">
                        {value
                            ? items.find((item) => item.name === value)?.name ?? value
                            : "ເລືອກສິນຄ້າ..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="ຄົ້ນຫາສິນຄ້າ..." />
                    <CommandEmpty>ບໍ່ພົບສິນຄ້າ.</CommandEmpty>
                    <CommandGroup>
                        {items.map((item) => (
                            <CommandItem
                                key={item.id}
                                value={item.name}
                                onSelect={(currentValue) => {
                                    const selectedItem = items.find(i => i.name.toLowerCase() === currentValue.toLowerCase());
                                    onValueChange(selectedItem || null);
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === item.name ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {item.name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


const TransportTable = ({ type, title, entries, onRowChange, onRowDelete, stockItems }: { 
    type: 'ANS' | 'HAL' | 'MX' | 'NH',
    title: string, 
    entries: TransportEntry[],
    onRowChange: (id: string, updatedFields: Partial<TransportEntry>) => void,
    onRowDelete: (id: string) => void,
    stockItems: StockItem[]
}) => {
    
    const totalAmount = useMemo(() => entries.reduce((sum, entry) => sum + (entry.amount || 0), 0), [entries]);
    const totalRemaining = useMemo(() => entries.filter(e => !e.finished).reduce((sum, entry) => sum + (entry.amount || 0), 0), [entries]);
    const totalEntries = useMemo(() => entries.length, [entries]);
    const unfinishedEntriesCount = useMemo(() => entries.filter(e => !e.finished).length, [entries]);

    const dailySummaries = useMemo(() => {
        const groupedByDay: Record<string, { date: Date; entries: TransportEntry[] }> = {};

        entries.forEach(entry => {
            const dayKey = format(entry.date, 'yyyy-MM-dd');
            if (!groupedByDay[dayKey]) {
                groupedByDay[dayKey] = { date: entry.date, entries: [] };
            }
            groupedByDay[dayKey].entries.push(entry);
        });

        return Object.values(groupedByDay).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [entries]);

     const handleDetailChange = (rowId: string, selectedItem: StockItem | null) => {
        if (selectedItem) {
            onRowChange(rowId, { detail: selectedItem.name, cost: selectedItem.costPrice });
        } else {
            onRowChange(rowId, { detail: '' });
        }
    };


    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-2">
                        <span>ລວມ: {formatCurrency(totalAmount)}</span>
                        <span className="text-red-600">ຄົງເຫຼືອ: {formatCurrency(totalRemaining)}</span>
                        {totalEntries > 0 && (
                             <span className="font-semibold">| ຄ້າງ {unfinishedEntriesCount}/{totalEntries} ລາຍການ</span>
                        )}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="overflow-x-auto print-all-content">
                    {dailySummaries.length > 0 ? (
                         <Accordion type="single" collapsible className="w-full">
                            {dailySummaries.map((summary, index) => {
                                 const ordersInDay = summary.entries.reduce((acc, entry) => {
                                    const orderKey = String(entry.order || 'N/A');
                                    if (!acc[orderKey]) acc[orderKey] = [];
                                    acc[orderKey].push(entry);
                                    return acc;
                                }, {} as Record<string, TransportEntry[]>);

                                return (
                                <AccordionItem value={`day-${index}`} key={index}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full pr-4">
                                            <div className="font-semibold">{`ວັນທີ ${format(summary.date, "d")}`}</div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-4 border-l-2">
                                        <Accordion type="single" collapsible className="w-full">
                                            {Object.entries(ordersInDay).map(([order, entries]) => {
                                                const orderTotals = entries.reduce((acc, entry) => {
                                                    const totalCost = (entry.cost || 0) * (entry.quantity || 1);
                                                    acc.profit += (entry.amount || 0) - totalCost;
                                                    if (!entry.finished) {
                                                        acc.remainingAmount += (entry.amount || 0);
                                                    }
                                                    return acc;
                                                }, { profit: 0, remainingAmount: 0 });
                                                const unfinishedCount = entries.filter(e => !e.finished).length;

                                                return (
                                                    <AccordionItem value={`order-${order}`} key={order}>
                                                        <AccordionTrigger className="py-2">
                                                            <div className="flex justify-between w-full items-center pr-4">
                                                                <div className="font-semibold flex items-center gap-2">
                                                                    <span>ລຳດັບ: {order}</span>
                                                                    <span className="font-medium text-purple-600 text-xs">({entries[0]?.sender})</span>
                                                                </div>
                                                                <div className="flex gap-4 items-center text-sm">
                                                                    <span className={`font-medium ${unfinishedCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                                        ຄ້າງ {unfinishedCount}/{entries.length}
                                                                    </span>
                                                                    {unfinishedCount > 0 && <span className="text-red-600">ເຫຼືອ: {formatCurrency(orderTotals.remainingAmount)}</span>}
                                                                    <span className={orderTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                        ກຳໄລ: {formatCurrency(orderTotals.profit)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="w-[35%]">ລາຍລະອຽດ</TableHead>
                                                                        <TableHead className="w-[120px] text-right">ຕົ້ນທຶນ</TableHead>
                                                                        <TableHead className="w-[100px] text-right">ຈຳນວນ</TableHead>
                                                                        <TableHead className="w-[120px] text-right">ຈຳນວນເງິນ</TableHead>
                                                                        <TableHead className="w-[120px] text-right">ກຳໄລ</TableHead>
                                                                        <TableHead className="w-[80px] text-center">ສຳເລັດ</TableHead>
                                                                        <TableHead className="w-[50px] text-center">ລົບ</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {entries.map((row) => {
                                                                        const totalCost = (row.cost || 0) * (row.quantity || 1);
                                                                        const profit = (row.amount || 0) - totalCost;
                                                                        return (
                                                                        <TableRow key={row.id}>
                                                                            <TableCell className="p-2">
                                                                                <SearchableSelect
                                                                                    items={stockItems}
                                                                                    value={row.detail || ''}
                                                                                    onValueChange={(selected) => handleDetailChange(row.id, selected)}
                                                                                />
                                                                            </TableCell>
                                                                            <TableCell className="p-2">
                                                                                <Input type="number" value={row.cost || ''} onChange={(e) => onRowChange(row.id, { cost: parseFloat(e.target.value) || 0 })} placeholder="ຕົ້ນທຶນ" className="h-8 text-right" />
                                                                            </TableCell>
                                                                            <TableCell className="p-2">
                                                                                <Input type="number" value={row.quantity || ''} onChange={(e) => onRowChange(row.id, { quantity: parseInt(e.target.value, 10) || 1 })} placeholder="ຈຳນວນ" className="h-8 text-right" />
                                                                            </TableCell>
                                                                            <TableCell className="p-2">
                                                                                <Input type="number" value={row.amount || ''} onChange={(e) => onRowChange(row.id, { amount: parseFloat(e.target.value) || 0 })} placeholder="ຈຳນວນເງິນ" className="h-8 text-right" />
                                                                            </TableCell>
                                                                            <TableCell className={`p-2 text-right font-medium ${profit >= 0 ? '' : 'text-red-600'}`}>
                                                                                {formatCurrency(profit)}
                                                                            </TableCell>
                                                                            <TableCell className="text-center p-2">
                                                                                <Checkbox checked={row.finished} onCheckedChange={(checked) => onRowChange(row.id, { finished: !!checked })} />
                                                                            </TableCell>
                                                                            <TableCell className="text-center p-2">
                                                                                <Button variant="ghost" size="icon" onClick={() => onRowDelete(row.id)}>
                                                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                                                </Button>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )})}
                                                                </TableBody>
                                                            </Table>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )
                                            })}
                                        </Accordion>
                                    </AccordionContent>
                                </AccordionItem>
                            )})}
                         </Accordion>
                    ) : (
                         <div className="text-center text-muted-foreground py-4">ບໍ່ມີລາຍການໃນເດືອນທີ່ເລືອກ</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


export default function AutoPartsTransportPage() {
    const { toast } = useToast();
    const [allEntries, setAllEntries] = useState<TransportEntry[]>([]);
    const [displayMonth, setDisplayMonth] = useState<Date>(new Date());
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    
    useEffect(() => {
        const unsubscribe = listenToAutoPartsTransportEntries(setAllEntries);
        const unsubscribeStock = listenToAutoPartsStockItems(setStockItems);
        return () => {
            unsubscribe();
            unsubscribeStock();
        }
    }, []);

    const filteredEntries = useMemo(() => {
        const start = startOfMonth(displayMonth);
        const end = endOfMonth(displayMonth);
        return allEntries.filter(entry => isWithinInterval(entry.date, { start, end }));
    }, [allEntries, displayMonth]);


    const ansEntries = useMemo(() => filteredEntries.filter(e => e.type === 'ANS'), [filteredEntries]);
    const halEntries = useMemo(() => filteredEntries.filter(e => e.type === 'HAL'), [filteredEntries]);
    const mxEntries = useMemo(() => filteredEntries.filter(e => e.type === 'MX'), [filteredEntries]);
    const nhEntries = useMemo(() => filteredEntries.filter(e => e.type === 'NH'), [filteredEntries]);

    const lastOrderNumber = useMemo(() => {
        const start = startOfMonth(displayMonth);
        const end = endOfMonth(displayMonth);
        const relevantEntries = allEntries.filter(entry => isWithinInterval(entry.date, { start, end }));
        if (relevantEntries.length === 0) return 0;
        return Math.max(...relevantEntries.map(e => e.order || 0));
    }, [allEntries, displayMonth]);


    const transportTotalAmount = useMemo(() => filteredEntries.reduce((total, row) => total + (row.amount || 0), 0), [filteredEntries]);
    const transportTotalCost = useMemo(() => filteredEntries.reduce((total, row) => total + ((row.cost || 0) * (row.quantity || 1)), 0), [filteredEntries]);
    const transportProfit = useMemo(() => transportTotalAmount - transportTotalCost, [transportTotalAmount, transportTotalCost]);
    const transportRemaining = useMemo(() => filteredEntries.filter(e => !e.finished).reduce((total, row) => total + (row.amount || 0), 0), [filteredEntries]);
    const transportRemainingCost = useMemo(() => {
        return filteredEntries
            .filter(e => !e.finished)
            .reduce((total, row) => total + ((row.cost || 0) * (row.quantity || 1)), 0);
    }, [filteredEntries]);

    const transportRemainingProfit = useMemo(() => transportRemaining - transportRemainingCost, [transportRemaining, transportRemainingCost]);

    const handleTransportRowChange = async (id: string, updatedFields: Partial<TransportEntry>) => {
        try {
            await updateAutoPartsTransportEntry(id, updatedFields);
        } catch (error) {
            console.error("Error updating row: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: "ບໍ່ສາມາດອັບເດດຂໍ້ມູນໄດ້", variant: "destructive" });
        }
    };

    const handleTransportRowDelete = async (id: string) => {
        if (!window.confirm("ເຈົ້າແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບແຖວນີ້?")) return;
        try {
            await deleteAutoPartsTransportEntry(id);
            toast({ title: "ລຶບແຖວສຳເລັດ" });
        } catch (error) {
            console.error("Error deleting row: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: "ບໍ່ສາມາດລຶບແຖວໄດ້", variant: "destructive" });
        }
    };

    const MonthYearSelector = () => {
        const years = Array.from({ length: 3 }, (_, i) => getYear(new Date()) - 1 + i);
        const months = Array.from({ length: 12 }, (_, i) => setMonth(new Date(), i));

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                        {format(displayMonth, "LLLL yyyy")}
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {years.map(year => (
                         <DropdownMenuSub key={year}>
                            <DropdownMenuSubTrigger>
                                <span>{year + 543}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    {months.map(month => (
                                        <DropdownMenuItem 
                                            key={getMonth(month)} 
                                            onClick={() => {
                                                const newDate = new Date(year, getMonth(month), 1);
                                                setDisplayMonth(newDate);
                                            }}
                                        >
                                            {format(month, "LLLL")}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                             </DropdownMenuPortal>
                        </DropdownMenuSub>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 print:bg-white">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 print:hidden">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/autoparts">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປໜ້າຫຼັກ</span>
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Truck className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ບັນຊີຂົນສົ່ງ (ອາໄຫຼລົດ)</h1>
                </div>
                 <div className="ml-auto flex items-center gap-2">
                    <MonthYearSelector />
                    <AddEntriesDialog onAddMultipleEntries={addMultipleAutoPartsTransportEntries} stockItems={stockItems} lastOrderNumber={lastOrderNumber} />
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:grid md:grid-cols-3 md:gap-8">
                <div className="md:col-span-2 flex flex-col gap-4">
                     <Accordion type="single" collapsible defaultValue="item-ans" className="w-full">
                        <AccordionItem value="item-ans">
                            <AccordionTrigger className="text-lg font-bold bg-blue-50 hover:bg-blue-100 px-4 rounded-md">ANS</AccordionTrigger>
                            <AccordionContent className="p-1">
                                 <TransportTable 
                                    type="ANS"
                                    title="ລາຍການ ANS"
                                    entries={ansEntries}
                                    onRowChange={handleTransportRowChange}
                                    onRowDelete={handleTransportRowDelete}
                                    stockItems={stockItems}
                                />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-hal">
                             <AccordionTrigger className="text-lg font-bold bg-green-50 hover:bg-green-100 px-4 rounded-md">HAL</AccordionTrigger>
                            <AccordionContent className="p-1">
                                <TransportTable 
                                    type="HAL"
                                    title="ລາຍການ HAL"
                                    entries={halEntries}
                                    onRowChange={handleTransportRowChange}
                                    onRowDelete={handleTransportRowDelete}
                                    stockItems={stockItems}
                                />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-mx">
                             <AccordionTrigger className="text-lg font-bold bg-orange-50 hover:bg-orange-100 px-4 rounded-md">MX</AccordionTrigger>
                            <AccordionContent className="p-1">
                                <TransportTable 
                                    type="MX"
                                    title="ລາຍການ MX"
                                    entries={mxEntries}
                                    onRowChange={handleTransportRowChange}
                                    onRowDelete={handleTransportRowDelete}
                                    stockItems={stockItems}
                                />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-nh">
                             <AccordionTrigger className="text-lg font-bold bg-purple-50 hover:bg-purple-100 px-4 rounded-md">NH</AccordionTrigger>
                            <AccordionContent className="p-1">
                                <TransportTable 
                                    type="NH"
                                    title="ລາຍການ NH"
                                    entries={nhEntries}
                                    onRowChange={handleTransportRowChange}
                                    onRowDelete={handleTransportRowDelete}
                                    stockItems={stockItems}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <div className="md:col-span-1 mt-4 md:mt-0 flex flex-col gap-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>ສະຫຼຸບຍອດລວມ (ເດືອນທີ່ເລືອກ)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4">
                             <div className="flex justify-between items-center p-4 bg-muted rounded-md">
                                <span className="font-semibold text-lg">ລວມຈຳນວນເງິນ</span>
                                <span className="font-bold text-lg text-blue-600">{formatCurrency(transportTotalAmount)}</span>
                            </div>
                             <div className="flex justify-between items-center p-4 bg-muted rounded-md">
                                <span className="font-semibold text-lg">ລວມຕົ້ນທຶນ</span>
                                <span className="font-bold text-lg text-orange-600">{formatCurrency(transportTotalCost)}</span>
                            </div>
                             <div className="flex justify-between items-center p-4 bg-green-100/50 border border-green-200 rounded-md">
                                <span className="font-semibold text-lg text-green-800">ກຳໄລທັງໝົດ</span>
                                <span className={`font-bold text-lg ${transportProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(transportProfit)}</span>
                            </div>
                             <div className="flex justify-between items-center p-4 bg-muted rounded-md">
                                <span className="font-semibold text-lg">ຍອດຂາຍຄົງເຫຼືອ</span>
                                <span className="font-bold text-lg text-red-600">{formatCurrency(transportRemaining)}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-red-100/50 border border-red-200 rounded-md">
                                <span className="font-semibold text-lg text-red-800">ຕົ້ນທຶນຄົງເຫຼືອ</span>
                                <span className="font-bold text-lg text-red-700">{formatCurrency(transportRemainingCost)}</span>
                            </div>
                             <div className="flex justify-between items-center p-4 bg-yellow-100/50 border border-yellow-200 rounded-md">
                                <span className="font-semibold text-lg text-yellow-800">ກຳໄລຄົງຄ້າງ</span>
                                <span className={`font-bold text-lg ${transportRemainingProfit >= 0 ? 'text-yellow-700' : 'text-red-700'}`}>{formatCurrency(transportRemainingProfit)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}


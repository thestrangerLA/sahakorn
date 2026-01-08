
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, PlusCircle } from "lucide-react";
import { format, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AddDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDeposit: (amount: number, date: Date) => Promise<void>;
  memberName: string;
}

export function AddDepositDialog({ open, onOpenChange, onAddDeposit, memberName }: AddDepositDialogProps) {
    const { toast } = useToast();
    const [depositDate, setDepositDate] = useState<Date | undefined>(new Date());
    const [amount, setAmount] = useState(0);

    const handleSubmit = async () => {
        if (!depositDate || amount <= 0) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາເລືອກວັນທີ ແລະ ປ້ອນຈຳນວນເງິນ", variant: "destructive" });
            return;
        }

        try {
            await onAddDeposit(amount, startOfDay(depositDate));
            toast({ title: "ບັນທຶກເງິນຝາກສຳເລັດ" });
            onOpenChange(false);
            setDepositDate(new Date());
            setAmount(0);
        } catch (error) {
            console.error("Error adding deposit:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ເພີ່ມເງິນຝາກ: {memberName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>ວັນທີຝາກ</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {depositDate ? format(depositDate, "PPP") : <span>ເລືອກວັນທີ</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={depositDate} onSelect={setDepositDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="grid gap-2">
                        <Label>ຈຳນວນເງິນຝາກ</Label>
                        <Input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ຍົກເລີກ</Button>
                    <Button onClick={handleSubmit}>ບັນທຶກ</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

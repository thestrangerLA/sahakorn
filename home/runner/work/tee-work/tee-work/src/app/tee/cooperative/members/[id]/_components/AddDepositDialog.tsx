
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
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { CooperativeDeposit } from '@/lib/types';

interface AddDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDeposit: (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'memberName' | 'memberId'>) => Promise<void>;
  memberName: string;
}

export function AddDepositDialog({ open, onOpenChange, onAddDeposit, memberName }: AddDepositDialogProps) {
    const { toast } = useToast();
    const [depositDate, setDepositDate] = useState<Date | undefined>(new Date());
    const [kip, setKip] = useState(0);
    const [thb, setThb] = useState(0);
    const [usd, setUsd] = useState(0);

    const handleSubmit = async () => {
        if (!depositDate) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ", description: "ກະລຸນາເລືອກວັນທີ", variant: "destructive" });
            return;
        }

        try {
            await onAddDeposit({
                date: startOfDay(depositDate),
                kip,
                thb,
                usd,
            });
            toast({ title: "ບັນທຶກເງິນຝາກສຳເລັດ" });
            onOpenChange(false);
            setDepositDate(new Date());
            setKip(0);
            setThb(0);
            setUsd(0);
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
                        <Label>ຈຳນວນເງິນ (KIP)</Label>
                        <Input type="number" value={kip || ''} onChange={e => setKip(Number(e.target.value))} />
                    </div>
                     <div className="grid gap-2">
                        <Label>ຈຳນວນເງິນ (THB)</Label>
                        <Input type="number" value={thb || ''} onChange={e => setThb(Number(e.target.value))} />
                    </div>
                     <div className="grid gap-2">
                        <Label>ຈຳນວນເງິນ (USD)</Label>
                        <Input type="number" value={usd || ''} onChange={e => setUsd(Number(e.target.value))} />
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

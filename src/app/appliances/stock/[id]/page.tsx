
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getApplianceStockItem, listenToApplianceStockLogs, updateApplianceStockItem, deleteApplianceStockLog, updateApplianceStockLog } from '@/services/applianceStockService';
import type { ApplianceStockItem, ApplianceStockLog } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { ArrowLeft, Package, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';

export default function ApplianceStockDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<ApplianceStockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [logs, setLogs] = useState<ApplianceStockLog[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ApplianceStockItem>>({});
  const [editingLog, setEditingLog] = useState<ApplianceStockLog | null>(null);

  useEffect(() => {
    if (id && id !== 'default') {
      setLoading(true);
      getApplianceStockItem(id).then(itemData => {
        if(itemData) {
          setItem(itemData);
          setEditData(itemData);
        }
        setLoading(false);
      }).catch(err => {
        console.error("Failed to fetch stock item:", err);
        setLoading(false);
      });
    } else {
        setLoading(false);
    }
  }, [id]);

  useEffect(() => {
      if (!id || !item) return;
      const unsubscribeLogs = listenToApplianceStockLogs(id, setLogs);
      return () => unsubscribeLogs();
  }, [id, item]);

  const handleSave = async () => {
      if (!id) return;
      try {
          await updateApplianceStockItem(id, editData);
          toast({ title: "ອັບເດດສຳເລັດ" });
          setIsEditing(false);
          setItem(prev => prev ? { ...prev, ...editData } : null);
      } catch (error) {
          console.error("Failed to save item:", error);
          toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
      }
  };

  const handleDeleteLog = async (logId: string, itemId: string) => {
      if (!window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບປະຫວັດລາຍການນີ້? ການກະທຳນີ້ຈະອັບເດດຍອດສະຕັອກຄືນໃໝ່.")) {
          return;
      }
      try {
          await deleteApplianceStockLog(logId, itemId);
          toast({ title: "ລົບປະຫວັດສຳເລັດ" });
      } catch (error: any) {
          toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: error.message, variant: "destructive" });
      }
  };

  const handleUpdateLog = async () => {
      if (!editingLog) return;
      try {
          await updateApplianceStockLog(editingLog.id, editingLog.itemId, {
              change: editingLog.change,
              detail: editingLog.detail,
          });
          toast({ title: "ອັບເດດປະຫວັດສຳເລັດ" });
          setEditingLog(null);
      } catch (error: any) {
           toast({ title: "ເກີດຂໍ້ຜິດພາດ", description: error.message, variant: "destructive" });
      }
  };

  if (loading) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 sm:px-6 md:gap-8">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
       </div>
    );
  }
  
  if (!item) {
    return (
      <div className="flex justify-center items-center h-screen">
        <h1>Stock Item not found</h1>
      </div>
    );
  }

  return (
       <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/appliances/stock">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປໜ້າສະຕັອກ</span>
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">{item.name} ({item.sku})</h1>
                </div>
                <div className="ml-auto">
                    {isEditing ? (
                        <Button onClick={handleSave} size="sm">ບັນທຶກ</Button>
                    ) : (
                        <Button onClick={() => setIsEditing(true)} size="sm" variant="outline"><Edit className="mr-2 h-4 w-4" />ແກ້ໄຂ</Button>
                    )}
                </div>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>ລາຍລະອຽດສິນຄ້າ (ເຄື່ອງໃຊ້)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <div className="grid gap-2">
                            <Label>SKU</Label>
                            <Input value={editData.sku || ''} onChange={(e) => setEditData({...editData, sku: e.target.value})} disabled={!isEditing} />
                        </div>
                        <div className="grid gap-2">
                            <Label>ຊື່ສິນຄ້າ</Label>
                            <Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} disabled={!isEditing} />
                        </div>
                        <div className="grid gap-2">
                            <Label>ຕົ້ນทุน (KIP)</Label>
                            <Input type="number" value={editData.costPrice || ''} onChange={(e) => setEditData({...editData, costPrice: parseFloat(e.target.value) || 0})} disabled={!isEditing} />
                        </div>
                         <div className="grid gap-2">
                            <Label>ລາຄາຂາຍ (KIP)</Label>
                            <Input type="number" value={editData.sellingPrice || ''} onChange={(e) => setEditData({...editData, sellingPrice: parseFloat(e.target.value) || 0})} disabled={!isEditing} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>ປະຫວັດການເຄື່ອນໄຫວສະຕັອກ</CardTitle>
                        <CardDescription>ສະແດງທຸກການນຳເຂົ້າ ແລະ ການຂາຍຂອງສິນค้านี้</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ປະເພດ</TableHead>
                                    <TableHead>ລາຍລະອຽດ</TableHead>
                                    <TableHead className="text-right">ຈຳນວນປ່ຽນແປງ</TableHead>
                                    <TableHead className="text-right">ຈຳນວນຄົງເຫຼືອ</TableHead>
                                    <TableHead className="text-center">ການດຳເນີນການ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length > 0 ? logs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(log.createdAt, 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell>
                                            <Badge variant={log.type === 'sale' ? 'destructive' : 'secondary'}>
                                                {log.type === 'sale' ? 'ຂາຍອອກ' : 'ນຳເຂົ້າ'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{log.detail}</TableCell>
                                        <TableCell className={`text-right font-medium ${log.change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {log.change}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{log.newStock}</TableCell>
                                        <TableCell className="text-center">
                                             <Button variant="ghost" size="icon" onClick={() => setEditingLog(log)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteLog(log.id, log.itemId)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">ບໍ່ມີປະຫວັດການເຄື່ອນໄຫວ</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>

            {editingLog && (
                <Dialog open={!!editingLog} onOpenChange={(isOpen) => !isOpen && setEditingLog(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>ແກ້ໄຂປະຫວັດ</DialogTitle>
                            <DialogDescription>
                                ລະວັງ: ການປ່ຽນຈຳນວນຈະສົ່ງຜົນກະທົບຕໍ່ຍອດສະຕັອກທັງໝົດ.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="log-quantity">ຈຳນວນ</Label>
                                <Input 
                                    id="log-quantity" 
                                    type="number" 
                                    value={Math.abs(editingLog.change)} 
                                    onChange={(e) => {
                                        const newAbsValue = Math.abs(Number(e.target.value)) || 0;
                                        setEditingLog({...editingLog, change: newAbsValue});
                                    }}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="log-detail">ລາຍລະອຽດ</Label>
                                <Input 
                                    id="log-detail" 
                                    value={editingLog.detail} 
                                    onChange={(e) => setEditingLog({...editingLog, detail: e.target.value})} 
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingLog(null)}>ຍົກເລີກ</Button>
                            <Button onClick={handleUpdateLog}>ບັນທຶກ</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
  );
}

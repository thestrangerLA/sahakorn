
"use client"

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, ArrowLeft } from "lucide-react";
import { listenToTourPrograms, deleteTourProgram } from '@/services/tourProgramService';
import type { TourProgram } from '@/lib/types';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useClientRouter } from '@/hooks/useClientRouter';


export default function TourProgramsPage() {
    const [programs, setPrograms] = useState<TourProgram[]>([]);
    const { toast } = useToast();
    const router = useClientRouter();

    useEffect(() => {
        const unsubscribe = listenToTourPrograms(setPrograms);
        return () => unsubscribe();
    }, []);

    const sortedPrograms = useMemo(() => {
        return [...programs].sort((a, b) => {
            const tourCodeA = a.tourCode || '';
            const tourCodeB = b.tourCode || '';
            return tourCodeA.localeCompare(tourCodeB);
        });
    }, [programs]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click event
        if (window.confirm("Are you sure you want to delete this tour program and all its data?")) {
            try {
                await deleteTourProgram(id);
                toast({ title: "Program deleted successfully" });
            } catch (error) {
                console.error("Error deleting program: ", error);
                toast({ title: "Failed to delete program", variant: "destructive" });
            }
        }
    };
    
    const navigateToDetail = (id: string) => {
        router.push(`/tour-programs/${id}`);
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tour">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປໜ້າຫຼັກ</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold">ໂປຣແກຣມທົວທັງໝົດ</h1>
                <div className="ml-auto">
                    <Button asChild size="sm">
                        <Link href="/tour-programs/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            ສ້າງໂປຣແກຣມໃໝ່
                        </Link>
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0">
                <Card>
                    <CardHeader>
                        <CardTitle>ລາຍການໂປຣແກຣມທົວ</CardTitle>
                        <CardDescription>
                           ລາຍການໂປຣແກຣມທົວທັງໝົດທີ່ມີໃນລະບົບ
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>Tour Code</TableHead>
                                    <TableHead>ຊື່ໂປຣແກຣມ</TableHead>
                                    <TableHead>ຈຳນວນຄົນ</TableHead>
                                    <TableHead>ປາຍທາງ</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedPrograms.length > 0 ? (
                                    sortedPrograms.map(program => (
                                        <TableRow key={program.id} className="cursor-pointer" onClick={() => navigateToDetail(program.id)}>
                                            <TableCell>{program.date ? format(program.date, 'dd/MM/yyyy') : '-'}</TableCell>
                                            <TableCell className="font-medium">{program.tourCode}</TableCell>
                                            <TableCell>{program.programName}</TableCell>
                                            <TableCell>{program.pax}</TableCell>
                                            <TableCell>{program.destination}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Toggle menu</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => navigateToDetail(program.id)}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={(e) => handleDelete(e, program.id)} className="text-red-500">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No tour programs found.
                                        </TableCell>
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

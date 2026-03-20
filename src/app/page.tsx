"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase } from "lucide-react"
import Link from 'next/link'

const BusinessCard = ({ title, icon, href, children }: { title: string, icon: React.ReactNode, href: string, children: React.ReactNode }) => (
    <Link href={href}>
        <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-bold font-headline">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent className="flex-grow">
                {children}
            </CardContent>
        </Card>
    </Link>
);


export default function Home() {

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight font-headline">My Business Hub</h1>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl">
            <Link href="/tee">
                <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-2xl font-bold font-headline">Tee</CardTitle>
                    <Briefcase className="h-8 w-8 text-primary" />
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">ຈັດການຂໍ້ມູນທຸລະກິດຂອງ Tee</p>
                </CardContent>
                </Card>
            </Link>
        </div>
      </main>
    </div>
  )
}

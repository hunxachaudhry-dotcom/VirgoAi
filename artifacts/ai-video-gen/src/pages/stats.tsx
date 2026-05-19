import React from "react";
import { useGetVideoStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Video, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function StatsPage() {
  const { data: stats, isLoading } = useGetVideoStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { title: "Total Generated", value: stats.total, icon: Video, color: "text-blue-500" },
    { title: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-500" },
    { title: "Processing", value: stats.processing, icon: Loader2, color: "text-purple-500", animate: true },
    { title: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-500" },
    { title: "Failed", value: stats.failed, icon: AlertCircle, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Studio Stats</h1>
        <p className="text-muted-foreground mt-2">Overview of generation metrics and performance.</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color} ${stat.animate ? 'animate-spin' : ''}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase()}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
}

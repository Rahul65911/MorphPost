import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    parseISO
} from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { CalendarEvent } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, RefreshCw } from "lucide-react";

import { ReschedulePopover } from "@/components/publishing/ReschedulePopover";

export default function Calendar() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Helper for safe date parsing
    const safeParseISO = (dateString: string | undefined | null): Date | null => {
        if (!dateString) return null;
        try {
            const date = parseISO(dateString);
            return isNaN(date.getTime()) ? null : date;
        } catch (e) {
            return null;
        }
    };

    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [jobToDelete, setJobToDelete] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            try {
                // Fetch reasonably wide window to avoid frequent refetches, or just current month
                // For simplicity, fetching all (or backend could optimize)
                const data = await api.getCalendarEvents();
                setEvents(data);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load calendar events",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, [toast]);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const resetToToday = () => {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(now);
    };

    const handleUpdateJob = async (jobId: string, status: 'cancelled') => {
        try {
            await api.updatePublishingJob(jobId, { status });
            toast({
                title: "Success",
                description: "Post updated successfully",
            });
            refresh();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update post", variant: "destructive" });
        }
    };

    const handleReschedule = async (jobId: string, newDate: Date) => {
        try {
            await api.updatePublishingJob(jobId, { publish_at: newDate.toISOString() });
            toast({
                title: "Success",
                description: `Rescheduled for ${format(newDate, "PP p")}`,
            });
            refresh();
        } catch (error) {
            toast({ title: "Error", description: "Failed to reschedule", variant: "destructive" });
        }
    }

    const handleDeleteJob = (jobId: string) => {
        setJobToDelete(jobId);
    };

    const confirmDeleteJob = async () => {
        if (!jobToDelete) return;

        try {
            await api.deletePublishingJob(jobToDelete);
            toast({ title: "Success", description: "Post deleted successfully" });
            refresh();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
        } finally {
            setJobToDelete(null);
        }
    };

    const refresh = async () => {
        const data = await api.getCalendarEvents();
        setEvents(data);
    };

    // Calendar Grid Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Filter events for selected day (Safely)
    const selectedDayEvents = selectedDate
        ? events.filter(e => {
            const date = safeParseISO(e.publish_at);
            return date && isSameDay(date, selectedDate);
        })
        : [];

    return (
        <AppLayout>
            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Content Calendar</h1>
                        <p className="text-muted-foreground mt-1">
                            Visualize your publishing schedule
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={resetToToday}>
                            Today
                        </Button>
                        <div className="flex items-center rounded-md border bg-card">
                            <Button variant="ghost" size="icon" onClick={prevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="w-40 text-center font-medium">
                                {format(currentDate, "MMMM yyyy")}
                            </div>
                            <Button variant="ghost" size="icon" onClick={nextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Grid */}
                    <Card className="lg:col-span-2 p-6">
                        <div className="grid grid-cols-7 mb-4">
                            {weekDays.map(day => (
                                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 auto-rows-[100px]">
                            {calendarDays.map((day, idx) => {
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                // Safe filtering for grid
                                const dayEvents = events.filter(e => {
                                    const date = safeParseISO(e.publish_at);
                                    return date && isSameDay(date, day);
                                });
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={`
                      relative flex flex-col items-start justify-start p-2 rounded-lg cursor-pointer transition-colors border
                      ${isCurrentMonth ? "bg-card text-foreground" : "bg-muted/20 text-muted-foreground border-transparent"}
                      ${isSelected ? "ring-2 ring-primary border-primary" : "border-border/50 hover:border-primary/50"}
                      ${isToday ? "bg-primary/5 font-semibold" : ""}
                    `}
                                    >
                                        <span className={`text-sm ${isToday ? "text-primary" : ""}`}>
                                            {format(day, "d")}
                                        </span>

                                        {/* Event Dots/Bars */}
                                        <div className="mt-auto w-full space-y-1">
                                            {dayEvents.slice(0, 3).map(event => (
                                                <div
                                                    key={event.id}
                                                    className={`
                            text-[10px] px-1.5 py-0.5 rounded-sm truncate w-full
                            ${event.status === 'published' ? 'bg-green-500/10 text-green-700' : 'bg-blue-500/10 text-blue-700'}
                          `}
                                                >
                                                    {event.platform}
                                                </div>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className="text-[10px] text-muted-foreground px-1">
                                                    +{dayEvents.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Side Panel: Selected Day Details */}
                    <div className="space-y-6">
                        <Card className="p-6 h-full min-h-[500px] flex flex-col">
                            <h3 className="font-semibold text-lg flex items-center gap-2 mb-6">
                                <CalendarIcon className="h-5 w-5 text-primary" />
                                {selectedDate ? format(selectedDate, "EEEE, MMMM do") : "Select a date"}
                            </h3>

                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : selectedDayEvents.length > 0 ? (
                                <div className="space-y-4 flex-1 overflow-y-auto">
                                    {selectedDayEvents.map(event => {
                                        const eventDate = safeParseISO(event.publish_at);
                                        if (!eventDate) return null; // Skip invalid

                                        return (
                                            <div
                                                key={event.id}
                                                className="group rounded-xl border border-border/50 bg-secondary/30 p-4 hover:border-primary/50 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/review/${event.workflow_id}`)}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <Badge variant="outline" className="capitalize">
                                                        {event.platform}
                                                    </Badge>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1
                          ${event.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}
                        `}>
                                                        {event.status === 'published' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                        {event.status}
                                                    </span>
                                                </div>

                                                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                                    {event.title || "Untitled Post"}
                                                </h4>

                                                <div className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                                                    <Clock className="h-3 w-3" />
                                                    {format(eventDate, "h:mm a")}
                                                </div>

                                                {(event.media_urls || []).length > 0 && (
                                                    <div className="flex gap-2 mt-3 overflow-hidden">
                                                        {(event.media_urls || []).slice(0, 3).map((url, i) => (
                                                            <img key={i} src={url} alt="media" className="h-10 w-10 rounded-md object-cover bg-muted" />
                                                        ))}
                                                    </div>
                                                )}

                                                {event.metrics && Object.keys(event.metrics).length > 0 && (
                                                    <div className="flex gap-4 mt-3 pt-3 border-t border-border/50">
                                                        {Object.entries(event.metrics).map(([key, value]) => (
                                                            <div key={key} className="flex flex-col">
                                                                <span className="text-[10px] uppercase text-muted-foreground font-semibold">{key}</span>
                                                                <span className="text-sm font-medium">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {(event.status === 'pending' || event.status === 'cancelled') && (
                                                    <div className="mt-4 pt-3 border-t border-border/50 flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteJob(event.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" />
                                                            Delete
                                                        </Button>

                                                        {event.status === 'pending' ? (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-8 text-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUpdateJob(event.id, 'cancelled');
                                                                }}
                                                            >
                                                                Cancel Schedule
                                                            </Button>
                                                        ) : (
                                                            <ReschedulePopover
                                                                initialDate={eventDate}
                                                                onConfirm={(newDate) => handleReschedule(event.id, newDate)}
                                                                trigger={
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8 text-xs"
                                                                    >
                                                                        <RefreshCw className="h-3 w-3 mr-1" />
                                                                        Reschedule
                                                                    </Button>
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center">
                                    <p>No events scheduled for this day.</p>
                                    <Button variant="link" onClick={() => navigate("/create")}>
                                        Schedule a post
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>

            <AlertDialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the scheduled post from your calendar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

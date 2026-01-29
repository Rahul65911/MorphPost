import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface ReschedulePopoverProps {
    initialDate: Date;
    onConfirm: (date: Date) => void;
    trigger: React.ReactNode;
}

export function ReschedulePopover({
    initialDate,
    onConfirm,
    trigger,
}: ReschedulePopoverProps) {
    const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());
    const safeDate = isValidDate(initialDate) ? initialDate : new Date();

    const [date, setDate] = useState<Date | undefined>(safeDate);
    const [time, setTime] = useState(
        isValidDate(initialDate) ? format(initialDate, "HH:mm") : "09:00"
    );
    const [isOpen, setIsOpen] = useState(false);

    const handleConfirm = () => {
        if (!date) return;
        const [hours, minutes] = time.split(":").map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes);
        onConfirm(newDate);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                {trigger}
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0"
                align="end"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 space-y-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Reschedule</h4>
                        <p className="text-sm text-muted-foreground">
                            Pick a new date and time
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                disabled={(d) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return d < today;
                                }}
                                className="rounded-md border shadow-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-medium">Time</span>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <Button
                            onClick={handleConfirm}
                            disabled={!date}
                            size="sm"
                            className="w-full"
                        >
                            Confirm Reschedule
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

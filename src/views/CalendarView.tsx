

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon, { ICONS } from '../components/Icon';
import Button from '../components/Button';

interface CalendarEvent {
    date?: string; // For fixed YYYY-MM-DD
    gregorianDate?: string; // For recurring MM-DD
    jalaliDate?: string; // For recurring Jalali MM-DD
    title_en: string;
    title_fa: string;
}

const CalendarView = () => {
    const { t, i18n } = useTranslation(['common', 'calendar']);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const isJalali = i18n.language === 'fa';

    useEffect(() => {
        fetch('/data/events.json')
            .then(res => {
                if (!res.ok) {
                    throw new Error('Failed to fetch events');
                }
                return res.json();
            })
            .then(data => setEvents(data.events || []))
            .catch(err => console.error("Failed to load calendar events:", err));
    }, []);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleGoToToday = () => {
        setCurrentDate(new Date());
    };

    const calendarLocale = isJalali ? 'fa-IR-u-ca-persian' : i18n.language;

    const daysOfWeek = useMemo(() => {
        const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'long' });
        // Start from a known Saturday for Jalali calendars, or a known Sunday for others
        const startDate = isJalali ? new Date(2024, 7, 3) : new Date(2024, 7, 4);
        return [...Array(7).keys()].map(i => {
            const day = new Date(startDate);
            day.setDate(day.getDate() + i);
            return formatter.format(day);
        });
    }, [i18n.language, isJalali]);

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();

        // 0 = Sunday, 1 = Monday, etc.
        let startDayOfWeek = firstDayOfMonth.getDay();
        // Adjust for locales where the week starts on Saturday (e.g., fa-IR)
        if (isJalali) {
            startDayOfWeek = (startDayOfWeek + 1) % 7;
        }

        const grid = [];
        const prevMonthLastDay = new Date(year, month, 0);

        // Days from previous month
        for (let i = startDayOfWeek; i > 0; i--) {
            const dayDate = new Date(prevMonthLastDay);
            dayDate.setDate(prevMonthLastDay.getDate() - i + 1);
            grid.push({ date: dayDate, isCurrentMonth: false });
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        // Days from next month
        const nextMonthDays = 42 - grid.length; // Fill up to 6 rows
        for (let i = 1; i <= nextMonthDays; i++) {
            grid.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return grid;
    }, [currentDate, isJalali]);

    const today = new Date();
    const dayFormatter = useMemo(() => new Intl.DateTimeFormat(calendarLocale, { day: 'numeric' }), [calendarLocale]);
    const monthYearFormatter = useMemo(() => new Intl.DateTimeFormat(calendarLocale, { month: 'long', year: 'numeric' }), [calendarLocale]);
    const jalaliDateFormatter = useMemo(() => new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: '2-digit', day: '2-digit', numberingSystem: 'latn' }), []);

    const isRTL = i18n.dir() === 'rtl';

    const NextButton = (
        <Button onClick={handleNextMonth} className="btn-secondary">
             {isRTL ? (
                <>
                    <span className="btn-text">{t('nextMonth', { ns: 'calendar' })}</span>
                    <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                </>
            ) : (
                <>
                    <span className="btn-text">{t('nextMonth', { ns: 'calendar' })}</span>
                    <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                </>
            )}
        </Button>
    );

    const PrevButton = (
        <Button onClick={handlePrevMonth} className="btn-secondary">
            {isRTL ? (
                <>
                    <Icon>{ICONS.CHEVRON_RIGHT}</Icon>
                    <span className="btn-text">{t('prevMonth', { ns: 'calendar' })}</span>
                </>
            ) : (
                <>
                    <Icon>{ICONS.CHEVRON_LEFT}</Icon>
                    <span className="btn-text">{t('prevMonth', { ns: 'calendar' })}</span>
                </>
            )}
        </Button>
    );




    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <div className="calendar-nav">
                    {isRTL ? PrevButton : NextButton}
                    <h2>{monthYearFormatter.format(currentDate)}</h2>
                    {isRTL ? NextButton : PrevButton}
                </div>
                <Button onClick={handleGoToToday} className="btn-secondary">{t('today', { ns: 'calendar' })}</Button>
            </div>

            <div className="calendar-grid-wrapper">
                <div className="calendar-grid">
                    {daysOfWeek.map(day => (
                        <div key={day} className="calendar-day-header">{day}</div>
                    ))}
                    {calendarGrid.map((item, index) => {
                        const dayNumber = dayFormatter.format(item.date);
                        const isToday = item.isCurrentMonth &&
                                       item.date.getDate() === today.getDate() &&
                                       item.date.getMonth() === today.getMonth() &&
                                       item.date.getFullYear() === today.getFullYear();
                        
                        const dayClasses = `calendar-day ${!item.isCurrentMonth ? 'is-other-month' : ''} ${isToday ? 'is-today' : ''}`;

                        const gregorianDateString = item.date.toISOString().slice(0, 10);
                        const gregorianRecurringString = gregorianDateString.slice(5); // "MM-DD"
                        
                        const [jalaliMonth, jalaliDay] = jalaliDateFormatter.formatToParts(item.date).filter(p => p.type !== 'literal').map(p => p.value);
                        const jalaliDateString = `${jalaliMonth}-${jalaliDay}`;

                        const dayEvents = events.filter(event => 
                            (event.date && event.date === gregorianDateString) ||
                            (event.gregorianDate && event.gregorianDate === gregorianRecurringString) ||
                            (event.jalaliDate && event.jalaliDate === jalaliDateString)
                        );

                        return (
                            <div key={index} className={dayClasses}>
                                <span className="day-number">{dayNumber}</span>
                                <div className="day-events">
                                    {dayEvents.map((event, eventIndex) => (
                                        <div key={eventIndex} className="event-badge">
                                            {isJalali ? event.title_fa : event.title_en}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;

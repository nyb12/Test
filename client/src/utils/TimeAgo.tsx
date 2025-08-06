import React, { useEffect, useState } from 'react';

interface TimeAgoProps {
  timestamp: Date | string | number;
  locale?: string;
}

function parseTimestamp(raw: Date | string | number): Date {
  if (raw instanceof Date) return raw;

  if (typeof raw === 'string') {
    const now = new Date();

    // Match 24-hour format: "14:30"
    const match24 = raw.match(/^(\d{2}):(\d{2})$/);
    if (match24) {
      const [, hh, mm] = match24;
      now.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
      return now;
    }

    // Match 12-hour format with or without space: "3:45PM", "3:45 pm"
    const match12 = raw.match(/^(\d{1,2}):(\d{2})\s?(AM|PM|am|pm)$/);
    if (match12) {
      let [, hh, mm, period] = match12;
      let hour = parseInt(hh, 10);
      const minute = parseInt(mm, 10);

      period = period.toLowerCase();
      if (period === 'pm' && hour < 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;

      now.setHours(hour, minute, 0, 0);
      return now;
    }

    return new Date(raw); // fallback for ISO strings etc.
  }

  return new Date(raw); // numeric timestamp
}

export default function TimeAgo({ timestamp, locale }: TimeAgoProps) {
  const [formattedTime, setFormattedTime] = useState('');
  const [titleTime, setTitleTime] = useState('');

  useEffect(() => {
    const date = parseTimestamp(timestamp);

    const update = () => {
      setFormattedTime(
        date.toLocaleTimeString(locale, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      );
      setTitleTime(date.toLocaleString(locale));
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timestamp, locale]);

  return <span title={titleTime}>{formattedTime}</span>;
}

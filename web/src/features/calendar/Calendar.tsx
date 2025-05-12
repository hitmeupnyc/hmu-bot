import React, { useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import type { Event } from "./event.d";

type Props = {
  events: Event[];
  switchView: ()=>void;
  isMobile: boolean;
}
export const Calendar = ({ events, switchView, isMobile }: Props) => {
  const calendarRef = useRef<FullCalendar>(null);

  const renderedEvents: FullCalendar["props"]["events"] = useMemo(() => {
    return events.map((e) => {
      return {
        id: e.id,
        date: e.hide_end_date ? undefined : e.start.utc,
        title: e.name.text,
        extendedProps: {
          description: e.description.text,
          image: e.logo.url
        },
        url: e.url,
      };
    }) as FullCalendar["props"]["events"];
  }, [events]);

  return (
    <FullCalendar
      viewClassNames="calendar"
      ref={calendarRef}
      plugins={[dayGridPlugin]}
      initialView="dayGridMonth"
      events={renderedEvents}
      customButtons={{
        switchView: {
          text: 'View as list',
          click: switchView
        }
      }}
      headerToolbar={{
        left: 'title',
        center: '',
        right: !isMobile? 'switchView prev,next' : 'today prev,next'
      }}
      eventContent={(eventInfo) => {
        const {description, image} = eventInfo.event.extendedProps as Record<string,string>;
        const [tag, name] = eventInfo.event.title.split(": ");
        return (
          <div
            className="max-w-full text-lg hint--top hint--large bg-purple-400 text-gray-900 p-1"
            aria-label={description}
          >
            <div className="overflow-hidden">
              <p className="text-wrap">
                {eventInfo.timeText}
                {name ? ` • ${tag}` : undefined }
              </p>
              <h3 className="font-semibold text-wrap">{name? name : eventInfo.event.title}</h3>
              
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="pointer-events-none"
                alt={description}
                src={image}
              />
            </div>
          </div>
        );
      }}
    />
  );
};

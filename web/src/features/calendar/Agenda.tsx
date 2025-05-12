import React, { useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import listPlugin from "@fullcalendar/list";
import type { Event } from "./event.d";

type Props = {
  events: Event[];
  switchView: ()=>void;
  isMobile: boolean;
}
export const Agenda = ({ events, switchView, isMobile }: Props) => {
  const calendarRef = useRef<FullCalendar>(null);

  const renderedEvents: FullCalendar["props"]["events"] = useMemo(() => {
    return events.map((e) => {
      return {
        id: e.id,
        date: e.hide_end_date ? undefined : e.start.utc,
        title: `${e.name.text}|||${e.description.text}|||${e.logo.url}`,
        url: e.url,
      };
    }) as FullCalendar["props"]["events"];
  }, [events]);

  return (
    <FullCalendar
      viewClassNames="agenda"
      slotLaneClassNames="agenda"
      ref={calendarRef}
      plugins={[listPlugin]}
      initialView="listMonth"
      eventDisplay="block"
      customButtons={{
        switchView: {
          text: 'View as calendar',
          click: switchView
        }
      }}
      headerToolbar={{
        left: 'title',
        center: '',
        right: !isMobile? 'switchView prev,next' : 'today prev,next'
      }}
      events={renderedEvents}
      eventContent={(eventInfo) => {
        const [title, description, image] = eventInfo.event.title.split("|||");
        return (
          <a href={eventInfo.event.url}>
            <div className="max-w-full text-lg bg-purple-400 text-gray-900 p-1">
              <h3 className="font-semibold">{title}</h3>
              <p>{description}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="pointer-events-none"
                alt={description}
                src={image}
              />
            </div>
          </a>
        );
      }}
    />
  );
};

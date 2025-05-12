import React, { useEffect, useState } from "react";
import type { InferGetStaticPropsType, GetStaticProps } from "next";
import { Calendar } from "@/features/calendar/Calendar";
import { Event } from "@/features/calendar/event";
import { useWindowSize } from "@uidotdev/usehooks";
import { Agenda } from "@/features/calendar/Agenda";

async function getEvents() {
  const res = await fetch(
    "https://www.eventbrite.com/org/69189357793/showmore/?page_size=1000&type=future&page=1",
  );
  return (
    (await res.json()) as {
      data: { events: Event[] };
      success: boolean;
    }
  ).data.events;
}

export const getStaticProps = (async () => {
  return { props: { events: await getEvents() } };
}) satisfies GetStaticProps<{ events: Event[] }>;

const EventCalendarPage = ({
  events,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const [viewType, setViewType] = useState<'calendar' | 'agenda'>('calendar');
  const [isMobile, setMobile] = useState(false);
  const {width} = useWindowSize();

  useEffect(()=>{
    if (width && width < 700) {
      setMobile(true);
    } else {
      setMobile(false);
    }
  }, [width]);

  return (
    <div>
      {(!isMobile && viewType === 'calendar') && <Calendar events={events} isMobile={isMobile} switchView={()=>setViewType('agenda')}/>}
      {(isMobile || viewType === 'agenda') && <Agenda events={events} isMobile={isMobile} switchView={()=>setViewType('calendar')}/>}
    </div>
  );
};

export default EventCalendarPage;

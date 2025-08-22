/**
 * Get a single event by ID
 * GET /api/events/:id
 */
export const getEvent = Effect.gen(function* () {
  const id = yield* ParsedParams<{ id: number }>();
  const eventService = yield* EventService;
  return yield* eventService.getEventById(id);

  return createSuccessResponse(event);
});

/**
 * Get event with all related data (marketing, volunteers, attendance)
 * GET /api/events/:id/details
 */
export const getEventDetails = Effect.gen(function* () {
  const id = yield* extractId(req);
  const eventService = yield* EventService;
  return yield* eventService.getEventWithDetails(id);

  return createSuccessResponse(eventDetails);
});

/**
 * Create a new event
 * POST /api/events
 */
export const createEvent = Effect.gen(function* () {
  const eventData = req.body as CreateEvent;
  // Ensure flags has a default value (bitfield for active state)
  const eventWithFlags = { ...eventData, flags: eventData.flags ?? 1 };
  const eventService = yield* EventService;
  return yield* eventService.createEvent(eventWithFlags);

  res.status(201);
  return createSuccessResponse(event, 'Event created successfully');
});

/**
 * Update an existing event
 * PUT /api/events/:id
 */
export const updateEvent = Effect.gen(function* () {
  const id = yield* extractId(req);
  const eventData = req.body as Partial<UpdateEvent>;

  const updatePayload = { ...eventData, id };
  const eventService = yield* EventService;
  return yield* eventService.updateEvent(updatePayload);

  return createSuccessResponse(event, 'Event updated successfully');
});

// =====================================
// Event Marketing Operations
// =====================================

/**
 * Get marketing data for an event
 * GET /api/events/:id/marketing
 */
export const getEventMarketing = Effect.gen(function* () {
  const id = yield* extractId(req);
  const eventService = yield* EventService;
  return yield* eventService.getEventMarketing(id);

  return createSuccessResponse(marketing);
});

/**
 * Create marketing data for an event
 * POST /api/events/:id/marketing
 */
export const createEventMarketing = Effect.gen(function* () {
  const eventId = yield* extractId(req);
  const bodyData = req.body as CreateEventMarketing;

  const eventService = yield* EventService;
  return yield* eventService.createEventMarketing(bodyData);

  res.status(201);
  return createSuccessResponse(
    marketing,
    'Event marketing created successfully'
  );
});

// =====================================
// Event Volunteer Operations
// =====================================

/**
 * Get volunteers for an event
 * GET /api/events/:id/volunteers
 */
export const getEventVolunteers = Effect.gen(function* () {
  const id = yield* extractId(req);
  const eventService = yield* EventService;
  return yield* eventService.getEventVolunteers(id);

  return createSuccessResponse(volunteers);
});

/**
 * Add a volunteer to an event
 * POST /api/events/:id/volunteers
 */
export const createVolunteer = Effect.gen(function* () {
  const eventId = yield* extractId(req);
  const bodyData = req.body as CreateVolunteer;

  const eventService = yield* EventService;
  return yield* eventService.createVolunteer(bodyData);

  res.status(201);
  return createSuccessResponse(volunteer, 'Volunteer added successfully');
});

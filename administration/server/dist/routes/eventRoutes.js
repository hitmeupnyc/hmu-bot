"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRoutes = void 0;
const express_1 = require("express");
const EventService_1 = require("../services/EventService");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.eventRoutes = router;
const eventService = new EventService_1.EventService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const upcoming = req.query.upcoming === 'true';
    const result = await eventService.getEvents({ page, limit, upcoming });
    res.json({
        success: true,
        data: result.events,
        pagination: result.pagination
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const event = await eventService.getEventById(id);
    res.json({
        success: true,
        data: event
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const eventData = req.body;
    const event = await eventService.createEvent(eventData);
    res.status(201).json({
        success: true,
        data: event,
        message: 'Event created successfully'
    });
}));
router.get('/:id/attendance', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const attendance = await eventService.getEventAttendance(id);
    res.json({
        success: true,
        data: attendance
    });
}));
router.post('/:id/checkin', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const eventId = parseInt(req.params.id);
    const { member_id } = req.body;
    const attendance = await eventService.checkInMember(eventId, member_id);
    res.json({
        success: true,
        data: attendance,
        message: 'Member checked in successfully'
    });
}));
//# sourceMappingURL=eventRoutes.js.map
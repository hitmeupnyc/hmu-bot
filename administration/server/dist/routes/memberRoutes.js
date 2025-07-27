"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberRoutes = void 0;
const express_1 = require("express");
const MemberService_1 = require("../services/MemberService");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
exports.memberRoutes = router;
const memberService = new MemberService_1.MemberService();
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const result = await memberService.getMembers({ page, limit, search });
    res.json({
        success: true,
        data: result.members,
        pagination: result.pagination
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const member = await memberService.getMemberById(id);
    res.json({
        success: true,
        data: member
    });
}));
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const memberData = req.body;
    const member = await memberService.createMember(memberData);
    res.status(201).json({
        success: true,
        data: member,
        message: 'Member created successfully'
    });
}));
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const updateData = { ...req.body, id };
    const member = await memberService.updateMember(updateData);
    res.json({
        success: true,
        data: member,
        message: 'Member updated successfully'
    });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    await memberService.deleteMember(id);
    res.json({
        success: true,
        message: 'Member deleted successfully'
    });
}));
router.get('/:id/memberships', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const memberships = await memberService.getMemberMemberships(id);
    res.json({
        success: true,
        data: memberships
    });
}));
router.get('/:id/events', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const id = parseInt(req.params.id);
    const events = await memberService.getMemberEvents(id);
    res.json({
        success: true,
        data: events
    });
}));
//# sourceMappingURL=memberRoutes.js.map
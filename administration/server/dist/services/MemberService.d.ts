import { Member, CreateMemberRequest, UpdateMemberRequest, MemberMembership } from '../types';
export declare class MemberService {
    private db;
    getMembers(options: {
        page: number;
        limit: number;
        search?: string;
    }): Promise<{
        members: Member[];
        pagination: any;
    }>;
    getMemberById(id: number): Promise<Member>;
    createMember(data: CreateMemberRequest): Promise<Member>;
    updateMember(data: UpdateMemberRequest): Promise<Member>;
    deleteMember(id: number): Promise<void>;
    getMemberMemberships(memberId: number): Promise<MemberMembership[]>;
    getMemberEvents(memberId: number): Promise<any[]>;
    private buildMemberFlags;
}
//# sourceMappingURL=MemberService.d.ts.map
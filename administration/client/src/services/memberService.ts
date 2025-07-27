import { 
  Member, 
  CreateMemberRequest, 
  UpdateMemberRequest, 
  ApiResponse, 
  PaginatedResponse 
} from '../types';

const API_BASE = '/api/members';

export class MemberService {
  static async getMembers(options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<PaginatedResponse<Member>> {
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.search) params.append('search', options.search);

    const response = await fetch(`${API_BASE}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch members: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async getMemberById(id: number): Promise<ApiResponse<Member>> {
    const response = await fetch(`${API_BASE}/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch member: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async createMember(memberData: CreateMemberRequest): Promise<ApiResponse<Member>> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create member: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async updateMember(memberData: UpdateMemberRequest): Promise<ApiResponse<Member>> {
    const response = await fetch(`${API_BASE}/${memberData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update member: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async deleteMember(id: number): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete member: ${response.statusText}`);
    }
    
    return response.json();
  }
}
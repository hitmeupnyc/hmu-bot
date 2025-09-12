// Client-side SDK implementation
// TODO: This should be generated from the server API definitions
export const sdk = {
  members: {
    list: async (params: any) => {
      const response = await fetch(`http://localhost:3000/api/members?${new URLSearchParams(params)}`);
      return response.json();
    },
    read: async ({ path }: { path: { id: number } }) => {
      const response = await fetch(`http://localhost:3000/api/members/${path.id}`);
      return response.json();
    },
    create: async ({ payload }: { payload: any }) => {
      const response = await fetch('http://localhost:3000/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    update: async ({ path, payload }: { path: { id: number }; payload: any }) => {
      const response = await fetch(`http://localhost:3000/api/members/${path.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    delete: async ({ path }: { path: { id: number } }) => {
      const response = await fetch(`http://localhost:3000/api/members/${path.id}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    listFlags: async ({ path }: { path: { id: string } }) => {
      const response = await fetch(`http://localhost:3000/api/members/${path.id}/flags`);
      return response.json();
    },
    grantFlag: async ({ path, payload }: { path: { id: string }; payload: any }) => {
      const response = await fetch(`http://localhost:3000/api/members/${path.id}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    revokeFlag: async ({ path, payload }: { path: { id: string; flagId: string }; payload: any }) => {
      const response = await fetch(`http://localhost:3000/api/members/${path.id}/flags/${path.flagId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    flagMembers: async ({ path }: { path: { flagId: string } }) => {
      const response = await fetch(`http://localhost:3000/api/flags/${path.flagId}/members`);
      return response.json();
    },
  },
  events: {
    list: async (params: any) => {
      const response = await fetch(`http://localhost:3000/api/events?${new URLSearchParams(params)}`);
      return response.json();
    },
    read: async ({ path }: { path: { id: number } }) => {
      const response = await fetch(`http://localhost:3000/api/events/${path.id}`);
      return response.json();
    },
    create: async ({ payload }: { payload: any }) => {
      const response = await fetch('http://localhost:3000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    update: async ({ path, payload }: { path: { id: number }; payload: any }) => {
      const response = await fetch(`http://localhost:3000/api/events/${path.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    delete: async ({ path }: { path: { id: number } }) => {
      const response = await fetch(`http://localhost:3000/api/events/${path.id}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    flags: async ({ path }: { path: { id: string } }) => {
      const response = await fetch(`http://localhost:3000/api/events/${path.id}/flags`);
      return response.json();
    },
    grantFlag: async ({ path, payload }: { path: { id: string }; payload: any }) => {
      const response = await fetch(`http://localhost:3000/api/events/${path.id}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
    revokeFlag: async ({ path, payload }: { path: { id: string; flagId: string }; payload: any }) => {
      const response = await fetch(`http://localhost:3000/api/events/${path.id}/flags/${path.flagId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
  },
  flags: {
    list: async (params: any) => {
      const response = await fetch(`http://localhost:3000/api/flags?${new URLSearchParams(params)}`);
      return response.json();
    },
    bulk: async ({ payload }: { payload: any }) => {
      const response = await fetch('http://localhost:3000/api/flags/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return response.json();
    },
  },
  audit: {
    list: async (params: any) => {
      const response = await fetch(`http://localhost:3000/api/audit?${new URLSearchParams(params)}`);
      return response.json();
    },
  },
};
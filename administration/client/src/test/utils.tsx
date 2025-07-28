import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'

// Mock data factories
export const createMockMember = (overrides = {}) => ({
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  preferredName: 'Johnny',
  email: 'john.doe@example.com',
  pronouns: 'he/him',
  status: 'active',
  membershipType: 'standard',
  joinDate: '2024-01-01',
  sponsorNotes: '',
  isActive: true,
  isProfessionalAffiliate: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockEvent = (overrides = {}) => ({
  id: '1',
  title: 'Test Event',
  description: 'A test event',
  startTime: '2024-06-01T19:00:00Z',
  endTime: '2024-06-01T22:00:00Z',
  location: 'Test Venue',
  maxAttendees: 50,
  currentAttendees: 10,
  status: 'published',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

// API response wrappers
export const createApiResponse = <T,>(data: T) => ({
  success: true,
  data,
  pagination: {
    page: 1,
    limit: 20,
    total: Array.isArray(data) ? data.length : 1,
    totalPages: 1,
  },
})

export const createApiError = (message: string, status = 400) => ({
  success: false,
  error: message,
  status,
})
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import Admin from './Admin'
import { AuthContext, type AuthContextType } from '../contexts/useAuth'

function renderWithAuth(contextValue: AuthContextType, initialPath = '/admin') {
  return render(
    <AuthContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Admin />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

const baseContext: AuthContextType = {
  token: 'token',
  user: { user_id: 1, username: 'viewer', role: 'viewer', email: 'viewer@test.dev' },
  login: () => undefined,
  logout: () => undefined,
  isLoading: false,
}

describe('Admin page access control', () => {
  it('shows access required message for viewer role', () => {
    renderWithAuth(baseContext)
    expect(screen.getByText('Admin access required')).toBeInTheDocument()
  })
})

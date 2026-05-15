import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PortalLandingPage } from './PortalLandingPage';

describe('PortalLandingPage', () => {
  it('renders client portal copy and sign-in', () => {
    render(
      <MemoryRouter>
        <PortalLandingPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /client portal/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in to foro/i })).toHaveAttribute('href', '/login');
  });
});

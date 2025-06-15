import { render, screen } from '@testing-library/react'
import Home from '../pages/index'

describe('Home', () => {
  it('renders the Homix heading', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', {
      name: /homix/i,
    })

    expect(heading).toBeInTheDocument()
  })
})
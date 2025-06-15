import { render, screen } from '@testing-library/react'
import Home from '../pages/index'

describe('Home', () => {
  it('renders the main heading', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', {
      name: /home automation, beautifully mixed/i,
    })

    expect(heading).toBeInTheDocument()
  })
})
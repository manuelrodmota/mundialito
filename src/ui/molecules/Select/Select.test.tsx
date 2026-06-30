import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, type SelectOption } from './index'

const OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All nations' },
  { value: 'AR', label: 'Argentina' },
  { value: 'BR', label: 'Brazil' },
]

describe('Select', () => {
  it('shows the selected label on the trigger', () => {
    render(<Select value="AR" options={OPTIONS} onChange={() => {}} ariaLabel="Nation" />)
    expect(screen.getByRole('button', { name: /Nation/i })).toHaveTextContent('Argentina')
  })

  it('opens the listbox and selects an option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select value="all" options={OPTIONS} onChange={onChange} ariaLabel="Nation" />)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Nation/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.click(screen.getByRole('option', { name: 'Brazil' }))
    expect(onChange).toHaveBeenCalledWith('BR')
    // closes after choosing
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('marks the current value as selected', async () => {
    const user = userEvent.setup()
    render(<Select value="BR" options={OPTIONS} onChange={() => {}} ariaLabel="Nation" />)
    await user.click(screen.getByRole('button', { name: /Nation/i }))
    expect(screen.getByRole('option', { name: 'Brazil' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Argentina' })).toHaveAttribute('aria-selected', 'false')
  })

  it('closes on Escape without changing the value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select value="all" options={OPTIONS} onChange={onChange} ariaLabel="Nation" />)
    await user.click(screen.getByRole('button', { name: /Nation/i }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('navigates with arrow keys and selects with Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select value="all" options={OPTIONS} onChange={onChange} ariaLabel="Nation" />)
    const trigger = screen.getByRole('button', { name: /Nation/i })
    trigger.focus()
    await user.keyboard('{ArrowDown}') // open
    await user.keyboard('{ArrowDown}') // move to Argentina (index 1)
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('AR')
  })
})

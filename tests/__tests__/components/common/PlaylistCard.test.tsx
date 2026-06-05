import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlaylistCard } from '@/components/common/PlaylistCard'
import { mockPlaylist } from '@/tests/helpers/mock-data'

describe('PlaylistCard', () => {
  test('renders playlist name', () => {
    render(<PlaylistCard id={mockPlaylist.id} name={mockPlaylist.name} coverUrl={mockPlaylist.coverImgUrl} />)
    expect(screen.getByText(mockPlaylist.name)).toBeInTheDocument()
  })

  test('renders play count when provided', () => {
    render(<PlaylistCard id={mockPlaylist.id} name={mockPlaylist.name} coverUrl={mockPlaylist.coverImgUrl} playCount={1234567} />)
    expect(screen.getByText('123万')).toBeInTheDocument()
  })

  test('renders without play count when zero', () => {
    const { container } = render(<PlaylistCard id={1} name="Test" coverUrl="https://example.com/img.jpg" playCount={0} />)
    expect(container.textContent).not.toContain('0')
  })

  test('renders link with correct href', () => {
    render(<PlaylistCard id={42} name="Test" coverUrl="https://example.com/img.jpg" />)
    // Use getAllByRole since there may be nested links (e.g. the play button overlay)
    const links = screen.getAllByRole('link')
    const playlistLink = links.find(l => l.getAttribute('href') === '/playlist/42')
    expect(playlistLink).toBeTruthy()
  })

  test('applies custom className', () => {
    const { container } = render(<PlaylistCard id={1} name="Test" coverUrl="https://example.com/img.jpg" className="my-class" />)
    expect(container.firstChild).toHaveClass('my-class')
  })

  test('keeps hover overlay free of backdrop filters', () => {
    const { container } = render(<PlaylistCard id={1} name="Test" coverUrl="https://example.com/img.jpg" />)
    expect(container.querySelector('[class*="backdrop-blur-[2px]"]')).toBeNull()
  })
})

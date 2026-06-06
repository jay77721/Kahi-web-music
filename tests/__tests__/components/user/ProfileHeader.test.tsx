'use client'

import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ProfileHeader } from '@/components/user/ProfileHeader'
import type { UserProfile } from '@/types/user'

const PROFILE_HEADER_SOURCE = 'components/user/ProfileHeader.tsx'

const FAKE_PROFILE: UserProfile = {
  userId: 1001,
  nickname: 'Kahi Tester',
  avatarUrl: 'https://example.com/avatar.jpg',
  signature: 'Living for music',
  level: 9,
  vipType: 2,
  follows: 12,
  followeds: 345,
  listenSongs: 9876,
}

describe('ProfileHeader', () => {
  afterEach(() => {
    cleanup()
  })

  test('renders the profile summary as a plain section with CSS animation', () => {
    const { container } = render(
      <ProfileHeader user={FAKE_PROFILE} className="custom-profile-class" />
    )

    const header = screen.getByTestId('profile-header')
    expect(header.tagName).toBe('SECTION')
    expect(header).toHaveClass('profile-stat-card')
    expect(header).toHaveClass('glass-subtle')
    expect(header).toHaveClass('animate-slide-up')
    expect(header).toHaveClass('custom-profile-class')
    expect(header).not.toHaveAttribute('data-framer-motion')

    expect(screen.getByText('Kahi Tester')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Kahi Tester/ })).toHaveAttribute(
      'src',
      expect.stringContaining('param=240y240')
    )
    expect(screen.getByTestId('profile-signature')).toHaveTextContent('Living for music')
    expect(screen.getByTestId('profile-stat-follows')).toHaveTextContent('12')
    expect(screen.getByTestId('profile-stat-followeds')).toHaveTextContent('345')
    expect(screen.getByTestId('profile-stat-listens')).toHaveTextContent('9876')
    expect(container.querySelector('[data-framer-motion]')).toBeNull()
  })

  test('does not import framer-motion', () => {
    const source = readFileSync(PROFILE_HEADER_SOURCE, 'utf8')

    expect(source).not.toMatch(/from ['"]framer-motion['"]/)
    expect(source).not.toContain('motion.')
    expect(source).not.toContain('<motion.')
  })
})

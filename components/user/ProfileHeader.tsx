'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Crown, Music2, UserCheck, Users } from 'lucide-react'
import { imageUrl, formatCount } from '@/lib/format'
import type { UserProfile } from '@/types/user'

export interface ProfileHeaderProps {
  user: UserProfile
  className?: string
}

interface Stat {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  testId: string
}

function buildStats(user: UserProfile): Stat[] {
  return [
    { icon: Users, label: '关注', value: user.follows ?? 0, testId: 'profile-stat-follows' },
    { icon: UserCheck, label: '粉丝', value: user.followeds ?? 0, testId: 'profile-stat-followeds' },
    { icon: Music2, label: '听歌', value: user.listenSongs ?? 0, testId: 'profile-stat-listens' },
  ]
}

const VIP_LABEL: Record<number, string> = {
  0: '普通用户',
  1: '普通 VIP',
  2: '豪华 VIP',
  11: '音乐包',
}

export const ProfileHeader = memo(function ProfileHeader({
  user,
  className,
}: ProfileHeaderProps) {
  const stats = buildStats(user)
  const vipLabel = VIP_LABEL[user.vipType ?? 0] ?? '普通用户'
  const isVip = (user.vipType ?? 0) > 0

  return (
    <section
      data-testid="profile-header"
      className={`profile-stat-card glass-subtle rounded-2xl p-5 md:p-7 animate-slide-up ${className ?? ''}`}
      aria-label={`${user.nickname} 的个人主页`}
    >
      <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-7">
        <Image
          src={imageUrl(user.avatarUrl, 240)}
          alt={`${user.nickname} 的头像`}
          width={120}
          height={120}
          priority
          className="w-30 h-30 rounded-full object-cover border-2 border-white/10 shadow-[var(--shadow-lg)] flex-shrink-0 mx-auto md:mx-0"
        />

        <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] truncate">
              {user.nickname}
            </h1>
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                isVip
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border-accent)]'
                  : 'bg-white/5 text-[var(--text-tertiary)] border-white/10'
              }`}
              aria-label={`会员等级：${vipLabel}`}
            >
              {isVip && <Crown className="w-3 h-3" aria-hidden="true" />}
              {vipLabel}
            </span>
            {typeof user.level === 'number' && user.level > 0 && (
              <span
                className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-secondary)] border border-white/10"
                aria-label={`等级 ${user.level}`}
              >
                Lv.{user.level}
              </span>
            )}
          </div>

          {user.signature && (
            <p
              className="text-sm text-[var(--text-secondary)] line-clamp-2 max-w-2xl mx-auto md:mx-0"
              data-testid="profile-signature"
            >
              {user.signature}
            </p>
          )}

          <dl
            className="grid grid-cols-3 gap-3 pt-2"
            data-testid="profile-stats"
          >
            {stats.map(({ icon: Icon, label, value, testId }) => (
              <div
                key={label}
                data-testid={testId}
                className="profile-stat-card flex flex-col items-center md:items-start gap-1 rounded-xl px-3 py-2 bg-white/5 border border-white/5"
              >
                <dt className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                  <Icon className="w-3 h-3" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="text-base md:text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                  {formatCount(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
})

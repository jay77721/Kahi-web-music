'use client'

function focusMainContent() {
  const main = document.getElementById('main-content')
  if (!main) return

  if (!main.hasAttribute('tabindex')) {
    main.setAttribute('tabindex', '-1')
  }

  main.focus({ preventScroll: true })
}

export function SkipNav() {
  return (
    <a
      href="#main-content"
      className="skip-nav"
      onClick={focusMainContent}
    >
      跳到主内容
    </a>
  )
}

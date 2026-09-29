import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from '../router'
import { LogoMark } from '../components/icons'
import { login, register, requestPasswordReset, resendVerification, resetPassword, verifyEmail } from '../lib/auth-api'

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset' | 'reset-success'

function authMode(path: string): AuthMode {
  if (path === '/register') return 'register'
  if (path === '/verify-email') return 'verify'
  if (path === '/forgot-password') return 'forgot'
  if (path === '/reset-password') return 'reset'
  if (path === '/password-reset-success') return 'reset-success'
  return 'login'
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <a href="/" className={`inline-flex items-center gap-2.5 ${dark ? 'text-white' : 'text-[#102018]'}`}>
      <LogoMark className="h-9 w-9" />
      <span className="text-[12px] font-extrabold tracking-[0.12em]">LASU EVENTS</span>
    </a>
  )
}

function AuthInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-semibold text-[#303b35]">{label}</span>
      <div className="relative">
        <input
          required
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`h-12 w-full rounded-[10px] border border-[#dfe6e1] bg-white px-4 text-[13px] text-[#17231b] outline-none transition placeholder:text-[#a1aaa4] focus:border-[#08743d] focus:ring-4 focus:ring-[#08743d]/10 ${isPassword ? 'pr-12' : ''}`}
        />
        {isPassword ? (
          <button
            type="button"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[10px] text-[#77837b] transition hover:text-[#08743d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#08743d]/40"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {visible ? <><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></> : <><path d="M3 3l18 18" /><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.2 0 9.5 6 9.5 6a15 15 0 0 1-3 3.6M6.2 6.8C3.8 8.4 2.5 12 2.5 12s3.3 6 9.5 6c1.2 0 2.3-.3 3.3-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>}
            </svg>
          </button>
        ) : null}
      </div>
    </label>
  )
}

function SolidButton({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  return (
    <button
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#006b37] px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(0,107,55,.15)] transition hover:bg-[#00572d] disabled:cursor-wait disabled:opacity-60"
    >
      {children}
    </button>
  )
}

function FieldCheck({ children, valid }: { children: ReactNode; valid: boolean }) {
  return (
    <p className={`flex items-center gap-2 text-[11px] ${valid ? 'text-[#18804b]' : 'text-[#89948c]'}`}>
      <span className={`grid h-4 w-4 place-items-center rounded-full ${valid ? 'bg-[#e4f5ea]' : 'bg-[#f0f2f0]'}`}>
        {valid ? '✓' : '·'}
      </span>
      {children}
    </p>
  )
}

function AuthBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-60"
      style={{ backgroundImage: 'radial-gradient(circle, #32d17a 1px, transparent 1.5px)', backgroundSize: '12px 12px', maskImage: 'radial-gradient(ellipse at bottom, black, transparent 72%)' }}
    />
  )
}

export default function AuthPage() {
  const { pathname, navigate } = useRouter()
  const mode = authMode(pathname)
  const params = new URLSearchParams(window.location.search)
  const [email, setEmail] = useState(sessionStorage.getItem('lasu_signup_email') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resending, setResending] = useState(false)
  const [verification, setVerification] = useState<'waiting' | 'done' | 'failed'>(params.get('token') ? 'waiting' : 'failed')
  const token = params.get('token') || ''
  const canResendVerification = Boolean(localStorage.getItem('lasu_access_token'))

  async function handleResendVerification() {
    setError('')
    setNotice('')
    setResending(true)
    try {
      await resendVerification()
      setNotice('A new verification email has been sent.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not resend the verification email.')
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    if (mode !== 'verify' || !token) return
    let active = true
    verifyEmail(token)
      .then(() => { if (active) setVerification('done') })
      .catch((cause: unknown) => {
        if (active) {
          setVerification('failed')
          setError(cause instanceof Error ? cause.message : 'This verification link could not be used.')
        }
      })
    return () => { active = false }
  }, [mode, token])

  const passwordRules = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password)]

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'register' && !passwordRules.every(Boolean)) {
      setError('Use at least 8 characters, one uppercase letter, and one number.')
      return
    }
    if (mode === 'reset' && !passwordRules.every(Boolean)) {
      setError('Use at least 8 characters, one uppercase letter, and one number.')
      return
    }
    if (mode === 'reset' && password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    if ((mode === 'reset' || mode === 'verify') && !token) {
      setError('This link is missing its token. Open the latest email link and try again.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate('/profile')
      } else if (mode === 'register') {
        await register(email, password)
        sessionStorage.setItem('lasu_signup_email', email)
        navigate('/verify-email')
      } else if (mode === 'forgot') {
        await requestPasswordReset(email)
        setNotice(`If an account exists for ${email}, a reset link is on its way.`)
      } else if (mode === 'reset') {
        await resetPassword(token, password)
        navigate('/password-reset-success')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Set new password' : ''
  const subtitle = mode === 'login' ? 'Sign in to manage your events and tickets.' : mode === 'register' ? 'Get started in seconds.' : mode === 'forgot' ? 'Enter your email and we’ll send you a reset link.' : mode === 'reset' ? 'Choose a strong password to secure your account.' : ''

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_88%_5%,rgba(13,153,75,.08),transparent_24%),#fff] px-6 pb-8 pt-7 sm:px-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,500px)] lg:items-center lg:gap-[8vw] lg:px-[8vw] lg:py-8 xl:px-[10vw]">
      <div className="absolute right-0 top-0 h-52 w-52 opacity-50" style={{ backgroundImage: 'radial-gradient(circle, #4bd58a 1px, transparent 1.5px)', backgroundSize: '10px 10px', maskImage: 'radial-gradient(circle at top right, black, transparent 70%)' }} />
      <header className="relative z-10 lg:col-span-2"><Brand /></header>

      <aside className="relative z-10 hidden max-w-[620px] lg:block">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#08743d]">LASU Events</p>
        <h2 className="mt-6 max-w-[11ch] text-[64px] font-black leading-[0.95] tracking-[-0.06em] text-[#102219] xl:text-[76px]">Your campus. Your kind of night.</h2>
        <p className="mt-6 max-w-[42ch] text-[16px] leading-7 text-[#66736b]">Keep your tickets close, discover what’s happening, and make more of the moments in between.</p>
        <div className="mt-12 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_85%_15%,rgba(38,192,101,.35),transparent_24%),linear-gradient(135deg,#092619,#0b3924)] p-7 text-white shadow-[0_28px_70px_rgba(13,74,41,.16)]">
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ce8b5]">Made for campus life</span><span className="text-xl text-[#9ce8b5]">✳</span></div>
          <p className="mt-12 max-w-[18ch] text-[25px] font-bold leading-tight">The best plans start with one little “what’s on?”</p>
          <div className="mt-7 flex items-center gap-2 text-[11px] text-white/60"><span className="h-2 w-2 rounded-full bg-[#43d77e]" /> Events, tickets, and good company.</div>
        </div>
      </aside>

      {mode === 'verify' ? (
        <section className="relative z-10 m-auto w-full max-w-[390px] py-12 text-center lg:m-0 lg:max-w-none lg:rounded-[30px] lg:border lg:border-[#e8eee9] lg:bg-white lg:px-10 lg:py-12 lg:shadow-[0_28px_80px_rgba(21,63,37,.08)]">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] bg-[#eaf7ef] text-5xl text-[#08743d]">✉</div>
          <h1 className="mt-8 text-[28px] font-bold tracking-[-0.04em] text-[#111c16]">{verification === 'done' ? 'Email verified' : 'Verify your email'}</h1>
          <p className="mx-auto mt-3 max-w-[300px] text-[14px] leading-6 text-[#66716a]">
            {verification === 'done' ? 'Your account is ready. Sign in to find your next event.' : <>We sent a verification link to <strong className="font-semibold text-[#26352c]">{email || 'your email address'}</strong>. Open the link in your email to continue.</>}
          </p>
          {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-left text-[12px] text-red-700">{error}</p> : null}
          {notice ? <p role="status" className="mt-5 rounded-xl bg-[#eff8f2] px-4 py-3 text-left text-[12px] text-[#12673a]">{notice}</p> : null}
          {verification === 'done' ? <button onClick={() => navigate('/login')} className="mt-9 w-full rounded-[10px] bg-[#006b37] py-3.5 text-[13px] font-bold text-white">Go to log in →</button> : <button onClick={() => navigate('/login')} className="mt-9 text-[13px] font-semibold text-[#006b37]">Back to log in</button>}
          {!token && email ? <p className="mt-7 text-[12px] text-[#727d75]">Check your inbox and spam folder for the latest message.</p> : null}
          {canResendVerification && verification !== 'done' ? <button disabled={resending} onClick={handleResendVerification} className="mt-3 text-[12px] font-semibold text-[#006b37] disabled:opacity-50">{resending ? 'Sending…' : 'Resend email'}</button> : null}
        </section>
      ) : mode === 'reset-success' ? (
        <section className="relative z-10 m-auto w-full max-w-[390px] py-12 text-center lg:m-0 lg:max-w-none lg:rounded-[30px] lg:border lg:border-[#e8eee9] lg:bg-white lg:px-10 lg:py-12 lg:shadow-[0_28px_80px_rgba(21,63,37,.08)]">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#e8f7ee] text-5xl font-bold text-[#08743d]">✓</div>
          <h1 className="mt-8 text-[28px] font-bold tracking-[-0.04em] text-[#111c16]">Password reset!</h1>
          <p className="mt-3 text-[14px] leading-6 text-[#66716a]">Your password has been updated successfully.</p>
          <button onClick={() => navigate('/login')} className="mt-9 w-full rounded-[10px] bg-[#006b37] py-3.5 text-[13px] font-bold text-white">Continue →</button>
        </section>
      ) : (
        <section className="relative z-10 m-auto w-full max-w-[390px] py-10 lg:m-0 lg:max-w-none lg:rounded-[30px] lg:border lg:border-[#e8eee9] lg:bg-white lg:px-10 lg:py-10 lg:shadow-[0_28px_80px_rgba(21,63,37,.08)]">
          <h1 className="text-[30px] font-bold tracking-[-0.045em] text-[#111c16]">{title}</h1>
          <p className="mt-2 text-[14px] leading-6 text-[#69746d]">{subtitle}</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode !== 'reset' ? <AuthInput label="Email address" value={email} onChange={setEmail} placeholder="you@lasu.edu.ng" type="email" autoComplete="email" /> : null}
            {mode !== 'forgot' ? <AuthInput label={mode === 'reset' ? 'New password' : 'Password'} value={password} onChange={setPassword} placeholder={mode === 'reset' ? 'Create a password' : 'Enter your password'} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /> : null}
            {mode === 'reset' ? <AuthInput label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm your password" type="password" autoComplete="new-password" /> : null}

            {mode === 'login' ? <div className="-mt-1 flex justify-end"><a href="/forgot-password" className="text-[12px] font-semibold text-[#006b37]">Forgot password?</a></div> : null}
            {mode === 'register' || mode === 'reset' ? <div className="-mt-2 space-y-1.5"><FieldCheck valid={passwordRules[0]}>At least 8 characters</FieldCheck><FieldCheck valid={passwordRules[1]}>One uppercase letter</FieldCheck><FieldCheck valid={passwordRules[2]}>One number</FieldCheck></div> : null}
            {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">{error}</p> : null}
            {notice ? <p role="status" className="rounded-xl bg-[#eff8f2] px-4 py-3 text-[12px] leading-5 text-[#12673a]">{notice}</p> : null}

            <SolidButton disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in →' : mode === 'register' ? 'Create account →' : mode === 'forgot' ? 'Send reset link →' : 'Reset password →'}</SolidButton>
          </form>

          <p className="mt-7 text-center text-[12px] text-[#737e76]">
            {mode === 'login' ? <>Don’t have an account? <a href="/register" className="ml-1 font-bold text-[#006b37]">Create one</a></> : mode === 'register' ? <>Already have an account? <a href="/login" className="ml-1 font-bold text-[#006b37]">Log in</a></> : <a href="/login" className="font-semibold text-[#006b37]">Back to log in</a>}
          </p>
        </section>
      )}
      <AuthBackdrop />
    </div>
  )
}

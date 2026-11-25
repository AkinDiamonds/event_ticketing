import { useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from '../router'
import { CheckIcon, EyeIcon, EyeOffIcon, LogoMark, MailIcon } from '../components/icons'
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
      <span className="text-[12px] font-extrabold tracking-[0.12em]">Event Tickets</span>
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
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  autoComplete?: string
  maxLength?: number
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
          maxLength={maxLength}
          autoCapitalize={autoComplete === 'one-time-code' ? 'none' : undefined}
          spellCheck={autoComplete === 'one-time-code' ? false : undefined}
          className={`h-12 w-full rounded-[10px] border border-[#dfe6e1] bg-white px-4 text-base text-[#17231b] md:text-sm outline-none transition placeholder:text-[#a1aaa4] focus:border-[#08743d] focus:ring-4 focus:ring-[#08743d]/10 ${isPassword ? 'pr-12' : ''}`}
        />
        {isPassword ? (
          <button
            type="button"
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[10px] text-[#77837b] transition hover:text-[#08743d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#08743d]/40"
          >
            {visible ? <EyeOffIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
          </button>
        ) : null}
      </div>
    </label>
  )
}

function SolidButton({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  return (
    <button
      type="submit"
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
        {valid ? <CheckIcon className="size-3" /> : <span aria-hidden="true">·</span>}
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
  const requestedDestination = params.get('returnTo') || ''
  const returnTo = /^\/tickets\/[^/?#]+\/payment$/.test(requestedDestination) ? requestedDestination : ''
  const authHref = (path: string) => returnTo ? path + (path.includes('?') ? '&' : '?') + 'returnTo=' + encodeURIComponent(returnTo) : path
  const [email, setEmail] = useState(sessionStorage.getItem('lasu_signup_email') || '')
  const [verificationCode, setVerificationCode] = useState(() => mode === 'verify' ? params.get('token') ?? '' : '')
  const [resetCode, setResetCode] = useState(() => mode === 'reset' ? params.get('token') ?? '' : '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resending, setResending] = useState(false)
  const [verified, setVerified] = useState(false)
  const canResendVerification = Boolean(email
    && sessionStorage.getItem('lasu_signup_can_resend') === 'true'
    && localStorage.getItem('lasu_access_token')
    && localStorage.getItem('lasu_profile_email') === email)

  async function handleResendVerification() {
    setError('')
    setNotice('')
    setResending(true)
    try {
      await resendVerification()
      setVerificationCode('')
      setNotice('A new verification email has been sent. Use the code from the latest email.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not resend the verification email.')
    } finally {
      setResending(false)
    }
  }

  const passwordRules = [password.length >= 8, /[A-Z]/.test(password), /\d/.test(password)]

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || resending) return
    setError('')
    setNotice('')
    if (mode === 'register' && !passwordRules.every(Boolean)) {
      setError('Use at least 8 characters, one uppercase letter, and one number.')
      return
    }
    if (mode === 'reset' && !resetCode.trim()) {
      setError('Enter your reset code.')
      return
    }
    if (mode === 'reset' && (password.length < 8 || password.length > 72)) {
      setError('Use between 8 and 72 characters.')
      return
    }
    if (mode === 'reset' && password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }
    const token = verificationCode.replace(/\s+/g, '')
    if (mode === 'verify' && !token) {
      setError('Enter the verification code from your email.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        navigate(returnTo || '/profile')
      } else if (mode === 'register') {
        const submittedEmail = email.trim().toLowerCase()
        const { accessToken } = await register(submittedEmail, password)
        sessionStorage.setItem('lasu_signup_email', submittedEmail)
        sessionStorage.setItem('lasu_signup_can_resend', String(Boolean(accessToken)))
        navigate(authHref('/verify-email'))
      } else if (mode === 'verify') {
        await verifyEmail(token)
        setVerificationCode('')
        sessionStorage.removeItem('lasu_signup_can_resend')
        setVerified(true)
      } else if (mode === 'forgot') {
        await requestPasswordReset(email)
        navigate(authHref('/reset-password?sent=1'))
      } else if (mode === 'reset') {
        await resetPassword(resetCode.trim(), password)
        navigate(authHref('/password-reset-success'))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Set new password' : ''
  const subtitle = mode === 'login' ? 'Sign in to manage your events and tickets.' : mode === 'register' ? 'Use your email to create an account.' : mode === 'forgot' ? 'Enter your email to request a password reset.' : mode === 'reset' ? 'Enter your reset code and choose a new password.' : ''

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_88%_5%,rgba(13,153,75,.08),transparent_24%),#fff] px-6 pb-8 pt-7 sm:px-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,500px)] lg:items-center lg:gap-[8vw] lg:px-[8vw] lg:py-8 xl:px-[10vw]">
      <div className="absolute right-0 top-0 h-52 w-52 opacity-50" style={{ backgroundImage: 'radial-gradient(circle, #4bd58a 1px, transparent 1.5px)', backgroundSize: '10px 10px', maskImage: 'radial-gradient(circle at top right, black, transparent 70%)' }} />
      <header className="relative z-10 lg:col-span-2"><Brand /></header>

      <aside className="relative z-10 hidden max-w-[620px] lg:block">
        <h2 className="mt-6 max-w-[11ch] text-[64px] font-black leading-[0.95] tracking-[-0.06em] text-[#102219] xl:text-[76px]">Your next event starts here.</h2>
        <p className="mt-6 max-w-[42ch] text-[16px] leading-7 text-[#66736b]">Find events from universities, organizations, and your community.</p>
        <div className="mt-12 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_85%_15%,rgba(38,192,101,.35),transparent_24%),linear-gradient(135deg,#092619,#0b3924)] p-7 text-white shadow-[0_28px_70px_rgba(13,74,41,.16)]">
          <p className="mt-12 max-w-[18ch] text-[25px] font-bold leading-tight">Discover events and keep your tickets handy.</p>
          <div className="mt-7 flex items-center gap-2 text-[11px] text-white/60"><span className="h-2 w-2 rounded-full bg-[#43d77e]" /> Events, tickets, and good company.</div>
        </div>
      </aside>

      {mode === 'verify' ? (
        <section className="relative z-10 m-auto w-full max-w-[390px] py-12 text-center lg:m-0 lg:max-w-none lg:rounded-[30px] lg:border lg:border-[#e8eee9] lg:bg-white lg:px-10 lg:py-12 lg:shadow-[0_28px_80px_rgba(21,63,37,.08)]">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] bg-[#eaf7ef] text-[#08743d]"><MailIcon className="size-10" /></div>
          <h1 className="mt-8 text-[28px] font-bold tracking-[-0.04em] text-[#111c16]">{verified ? 'Email verified' : 'Verify your email'}</h1>
          {verified ? (
            <>
              <p role="status" className="mx-auto mt-3 max-w-[300px] text-sm leading-6 text-muted">Your account is ready. Log in to get started.</p>
              <a href={authHref('/login')} className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-forest text-sm font-bold text-white hover:bg-forest-dark">Go to log in</a>
            </>
          ) : (
            <>
              <p className="mx-auto mt-3 max-w-[320px] text-sm leading-6 break-words text-muted">
                {email ? <>Copy the verification code sent to <strong className="font-semibold text-ink">{email}</strong> and paste it below.</> : 'Copy the verification code from your email and paste it below.'}
              </p>
              <form onSubmit={submit} className="mt-6 space-y-4 text-left">
                <AuthInput label="Verification code" value={verificationCode} onChange={setVerificationCode} placeholder="Paste your verification code" autoComplete="one-time-code" />
                {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
                {notice ? <p role="status" className="rounded-xl bg-mint px-4 py-3 text-sm text-forest">{notice}</p> : null}
                <SolidButton disabled={busy || resending}>{busy ? 'Verifying…' : 'Verify email'}</SolidButton>
              </form>
              <p className="mt-5 text-xs leading-5 text-muted">Can’t find the email? Check your spam folder.</p>
              {canResendVerification ? (
                <button type="button" disabled={resending || busy} onClick={handleResendVerification} className="mt-2 text-sm font-semibold text-forest hover:underline disabled:opacity-50">{resending ? 'Sending…' : 'Resend verification email'}</button>
              ) : (
                <a href={authHref('/register')} className="mt-2 inline-block text-sm font-semibold text-forest hover:underline">Return to sign-up to request a new code</a>
              )}
              <a href={authHref('/login')} className="mt-5 block text-sm font-semibold text-muted hover:underline">Back to log in</a>
            </>
          )}
        </section>
      ) : mode === 'reset-success' ? (
        <section className="relative z-10 m-auto w-full max-w-[390px] py-12 text-center lg:m-0 lg:max-w-none lg:rounded-[30px] lg:border lg:border-[#e8eee9] lg:bg-white lg:px-10 lg:py-12 lg:shadow-[0_28px_80px_rgba(21,63,37,.08)]">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#e8f7ee] text-[#08743d]"><CheckIcon className="size-10" /></div>
          <h1 className="mt-8 text-[28px] font-bold tracking-[-0.04em] text-[#111c16]">Password reset!</h1>
          <p className="mt-3 text-[14px] leading-6 text-[#66716a]">Your password has been updated successfully.</p>
          <button onClick={() => navigate(authHref('/login'))} className="mt-9 w-full rounded-[10px] bg-[#006b37] py-3.5 text-[13px] font-bold text-white">Continue</button>
        </section>
      ) : (
        <section className="relative z-10 m-auto w-full max-w-[390px] py-10 lg:m-0 lg:max-w-none lg:rounded-[30px] lg:border lg:border-[#e8eee9] lg:bg-white lg:px-10 lg:py-10 lg:shadow-[0_28px_80px_rgba(21,63,37,.08)]">
          <h1 className="text-[30px] font-bold tracking-[-0.045em] text-[#111c16]">{title}</h1>
          <p className="mt-2 text-[14px] leading-6 text-[#69746d]">{subtitle}</p>

          {mode === 'reset' && params.get('sent') === '1' ? (
            <p role="status" className="mt-5 rounded-xl bg-mint px-4 py-3 text-sm leading-5 text-forest">If an account exists for that email, check your inbox for password reset instructions.</p>
          ) : null}
          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode !== 'reset' ? <AuthInput label="Email address" value={email} onChange={setEmail} placeholder="you@example.com" type="email" autoComplete="email" /> : null}
            {mode === 'reset' ? <AuthInput label="Reset code" value={resetCode} onChange={setResetCode} placeholder="Enter reset code" autoComplete="one-time-code" /> : null}
            {mode !== 'forgot' ? <AuthInput label={mode === 'reset' ? 'New password' : 'Password'} value={password} onChange={setPassword} maxLength={mode === 'reset' ? 72 : undefined} placeholder={mode === 'reset' ? 'Create a password' : 'Enter your password'} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /> : null}
            {mode === 'reset' ? <AuthInput label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} maxLength={72} placeholder="Confirm your password" type="password" autoComplete="new-password" /> : null}

            {mode === 'login' ? (
              <div className="-mt-1 flex flex-wrap justify-between gap-2 text-xs font-semibold text-forest">
                <a href={authHref('/verify-email')} className="hover:underline">Verify your email</a>
                <a href={authHref('/forgot-password')} className="hover:underline">Forgot password?</a>
              </div>
            ) : null}
            {mode === 'reset' ? <p className="-mt-2 text-xs text-muted">Use 8 to 72 characters.</p> : null}
            {mode === 'register' ? <div className="-mt-2 space-y-1.5"><FieldCheck valid={passwordRules[0]}>At least 8 characters</FieldCheck><FieldCheck valid={passwordRules[1]}>One uppercase letter</FieldCheck><FieldCheck valid={passwordRules[2]}>One number</FieldCheck></div> : null}
            {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">{error}</p> : null}
            {notice ? <p role="status" className="rounded-xl bg-[#eff8f2] px-4 py-3 text-[12px] leading-5 text-[#12673a]">{notice}</p> : null}

            <SolidButton disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset instructions' : 'Reset password'}</SolidButton>
          </form>

          {mode === 'forgot' || mode === 'reset' ? (
            <p className="mt-5 text-center text-sm">
              <a className="font-semibold text-forest hover:underline" href={authHref(mode === 'forgot' ? '/reset-password' : '/forgot-password')}>{mode === 'forgot' ? 'I already have a reset code' : 'Request a new reset code'}</a>
            </p>
          ) : null}
          <p className="mt-7 text-center text-[12px] text-[#737e76]">
            {mode === 'login' ? <>Don’t have an account? <a href={authHref('/register')} className="ml-1 font-bold text-[#006b37]">Create one</a></> : mode === 'register' ? <>Already have an account? <a href={authHref('/login')} className="ml-1 font-bold text-[#006b37]">Log in</a></> : <a href={authHref('/login')} className="font-semibold text-[#006b37]">Back to log in</a>}
          </p>
        </section>
      )}
      <AuthBackdrop />
    </div>
  )
}

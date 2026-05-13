import { useState, useRef, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { authAPI } from '@/api/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordInput } from '@/components/password-input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const COUNTDOWN_SECONDS = 60

export default function SignUpPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { register } = useAuth()

  const formSchema = z
    .object({
      name: z.string().min(1, t('signUp.nameRequired')),
      email: z.string().email(t('signUp.emailInvalid')),
      password: z
        .string()
        .min(1, t('signUp.passwordRequired'))
        .min(7, t('signUp.passwordMin')),
      confirmPassword: z.string().min(1, t('signUp.confirmRequired')),
      verificationCode: z.string().length(6, t('signUp.codeInvalid')).optional(),
      agreeTerms: z.boolean().refine((val) => val === true, {
        message: t('signUp.agreeTermsRequired'),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('signUp.passwordMismatch'),
      path: ['confirmPassword'],
    })
    .refine((data) => {
      if (!codeSent) return true
      return data.verificationCode && data.verificationCode.length === 6
    }, {
      message: t('signUp.codeInvalid'),
      path: ['verificationCode'],
    })

  const [isLoading, setIsLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [sendingCode, setSendingCode] = useState(false)

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((c) => c - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      verificationCode: '',
      agreeTerms: false,
    },
  })

  const emailValue = form.watch('email')

  async function handleSendCode() {
    const email = emailValue.trim()
    if (!email) {
      toast.error(t('signUp.emailRequired') || '请输入邮箱地址')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(t('signUp.emailInvalid') || '请输入有效的邮箱地址')
      return
    }
    setSendingCode(true)
    try {
      await authAPI.sendCode(email)
      setCodeSent(true)
      setCountdown(COUNTDOWN_SECONDS)
      toast.success(t('signUp.codeSent') || '验证码已发送到邮箱')
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        (t('signUp.sendCodeFailed') || '发送失败，请稍后重试')
      toast.error(msg)
    } finally {
      setSendingCode(false)
    }
  }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    alert('onSubmit called! ' + JSON.stringify({name: data.name, email: data.email, codeLen: data.verificationCode?.length}))
    setIsLoading(true)
    try {
      await register(
        data.name.trim(),
        data.email.trim(),
        data.password,
        data.verificationCode || ''
      )
      toast.success(`${t('signUp.success')} ${data.email}`)
      navigate('/', { replace: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('signUp.failed') || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const current = form.getValues('verificationCode') || ''
    const arr = current.split('')
    arr[index] = digit
    const newCode = arr.join('').slice(0, 6)
    form.setValue('verificationCode', newCode, { shouldValidate: true })

    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const current = form.getValues('verificationCode') || ''
    if (e.key === 'Backspace' && !current[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    form.setValue('verificationCode', pasted, { shouldValidate: true })
    const lastFilled = Math.min(pasted.length - 1, 5)
    codeInputRefs.current[lastFilled]?.focus()
  }

  const codeValue = form.watch('verificationCode') || ''

  return (
    <div className='container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:p-8 relative'>
        {/* 语言切换按钮 */}
        <div className='absolute top-4 right-4'>
          <Button
            variant='outline'
            size='sm'
            className='bg-background/80 text-foreground border-border'
            onClick={() => i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en' : 'zh')}
          >
            {i18n.language.startsWith('zh') ? 'English' : '中文'}
          </Button>
        </div>

        <div className='mb-4 flex items-center justify-center'>
          <h1 className='text-xl font-medium'>Beehive Agent</h1>
        </div>
        <Card className='max-w-sm gap-4'>
          <CardHeader>
            <CardTitle className='text-lg tracking-tight'>
              {t('signUp.title')}
            </CardTitle>
            <CardDescription>
              {t('signUp.alreadyAccount')}{' '}
              <Link
                to='/login'
                className='underline underline-offset-4 hover:text-primary'
              >
                {t('signUp.signIn')}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn('grid gap-3')}
              >
                {/* 住户名称 */}
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('signUp.name')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('signUp.namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 邮箱 + 发送验证码 */}
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('signUp.email')}</FormLabel>
                      <div className='flex gap-2'>
                        <FormControl>
                          <Input placeholder={t('signUp.emailPlaceholder')} {...field} />
                        </FormControl>
                        <Button
                          type='button'
                          variant='outline'
                          className='shrink-0 whitespace-nowrap'
                          disabled={sendingCode || countdown > 0}
                          onClick={handleSendCode}
                        >
                          {sendingCode
                            ? t('signUp.sendingCode')
                            : countdown > 0
                            ? `${t('signUp.resendAfter')}${countdown}s`
                            : t('signUp.sendCode')}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 6位验证码 */}
                {codeSent && (
                  <FormField
                    control={form.control}
                    name='verificationCode'
                    render={() => (
                      <FormItem>
                        <FormLabel>{t('signUp.verificationCode')}</FormLabel>
                        <FormControl>
                          <div className='flex gap-2' onPaste={handleCodePaste}>
                            {Array.from({ length: 6 }).map((_, i) => (
                              <Input
                                key={i}
                                ref={(el) => {
                                  codeInputRefs.current[i] = el
                                }}
                                type='text'
                                inputMode='numeric'
                                maxLength={1}
                                value={codeValue[i] || ''}
                                onChange={(e) => handleCodeChange(i, e.target.value)}
                                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                className='h-10 w-10 text-center text-lg font-bold'
                                autoFocus={i === 0}
                              />
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className='text-xs text-muted-foreground'>
                          {t('signUp.codeEmailNote')}
                        </p>
                      </FormItem>
                    )}
                  />
                )}

                {/* 密码 */}
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('signUp.password')}</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder={t('signUp.passwordPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 确认密码 */}
                <FormField
                  control={form.control}
                  name='confirmPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('signUp.confirmPassword')}</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder={t('signUp.passwordPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 服务条款同意 */}
                <FormField
                  control={form.control}
                  name='agreeTerms'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-start gap-2 space-y-0 pt-1'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel className='text-xs font-normal text-muted-foreground cursor-pointer'>
                          {t('signUp.agreeTerms')}{' '}
                          <a
                            href='/terms'
                            className='underline underline-offset-4 hover:text-primary'
                          >
                            {t('signUp.terms')}
                          </a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button className='mt-2' disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className='animate-spin' />
                  ) : (
                    <UserPlus />
                  )}
                  {t('signUp.createAccount')}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <p className='px-8 text-center text-sm text-muted-foreground'>
              {t('signUp.agree')}{' '}
              <a
                href='/terms'
                className='underline underline-offset-4 hover:text-primary'
              >
                {t('signUp.terms')}
              </a>{' '}
              and{' '}
              <a
                href='/privacy'
                className='underline underline-offset-4 hover:text-primary'
              >
                {t('signUp.privacy')}
              </a>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

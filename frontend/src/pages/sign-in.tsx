import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { authAPI } from '@/api/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SignInPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || undefined
  const { tenantLogin } = useAuth()

  const ALLOWED_REDIRECTS = ['/', '/dashboard', '/accounts', '/settings', '/automation', '/agents']
  const getSafeRedirect = (redirect: string | undefined): string => {
    if (redirect && ALLOWED_REDIRECTS.includes(redirect)) return redirect
    return '/'
  }

  const [downloads, setDownloads] = useState<Record<string, string>>({})
  const [sendingPwd, setSendingPwd] = useState(false)
  const [pwdSent, setPwdSent] = useState(false)

  useEffect(() => {
    fetch('https://api.github.com/repos/roymaste/beehive-releases/releases/latest')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.assets) return
        const map: Record<string, string> = {}
        for (const asset of data.assets) {
          const name = asset.name.toLowerCase()
          if (name.endsWith('.dmg')) map.macos = asset.browser_download_url
          else if (name.endsWith('.exe')) map.windows = asset.browser_download_url
          else if (name.endsWith('.deb') || name.includes('appimage')) map.linux = asset.browser_download_url
        }
        setDownloads(map)
      })
      .catch(() => {/* silent fail */})
  }, [])

  const formSchema = z.object({
    email: z.string().email(t('signIn.emailInvalid')),
    password: z
      .string()
      .min(1, t('signIn.passwordRequired'))
      .min(7, t('signIn.passwordMin')),
  })

  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      await tenantLogin(data.email, data.password)
      toast.success(`${t('signIn.welcome')}, ${data.email}!`)
      const targetPath = getSafeRedirect(redirectTo)
      navigate(targetPath, { replace: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetPassword = async () => {
    const account = form.getValues('email').trim()
    if (!account) {
      toast.error('请先输入注册邮箱')
      return
    }
    setSendingPwd(true)
    try {
      await authAPI.sendPassword(account)
      setPwdSent(true)
      toast.success('密码已发送到您的注册邮箱，请查收')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || '获取密码失败，请稍后重试'
      toast.error(msg)
    } finally {
      setSendingPwd(false)
    }
  }

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
            <CardTitle className='text-lg tracking-tight'>{t('signIn.title')}</CardTitle>
            <CardDescription>
              Enter your email and password below to log into{' '}
              <br className='max-sm:hidden' /> your account.{' '}
              {t('signIn.noAccount')}{' '}
              <Link
                to='/register'
                className='text-nowrap underline underline-offset-4 hover:text-primary'
              >
                {t('signIn.signUp')}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn('grid gap-3')}
              >
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('signIn.email')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('signIn.emailPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem className='relative'>
                      <FormLabel>{t('signIn.password')}</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder={t('signIn.passwordPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                      <Link
                        to='/forgot-password'
                        className='absolute inset-e-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
                      >
                        {t('signIn.forgotPassword')}
                      </Link>
                    </FormItem>
                  )}
                />
                <div className='flex gap-3 mt-2'>
                  <Button type="submit" className='flex-1' disabled={isLoading}>
                    {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
                    {t('signIn.signIn')}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={sendingPwd}
                    onClick={handleGetPassword}
                  >
                    {sendingPwd ? '发送中...' : '获取密码'}
                  </Button>
                </div>
              </form>
            </Form>

            {pwdSent && (
              <div className='mt-3 p-3 rounded-lg text-sm text-center flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M20 6L9 17l-5-5'/></svg>
                密码已发送到您的邮箱，请查收后登录
              </div>
            )}

            {/* 客户端下载区 */}
            <div className='mt-6 pt-5 border-t'>
              <p className='text-center mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                {t('common.downloadClient')}
              </p>
              <div className='flex gap-2'>
                {/* macOS */}
                {downloads.macos ? (
                  <a
                    href={downloads.macos}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border bg-muted/30 hover:bg-muted/50 transition-colors'
                  >
                    <div className='flex justify-center mb-1'>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' className='text-muted-foreground'>
                        <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.05.05-2.31.72-3.06 1.64-.67.81-1.26 2.11-1.1 3.11 1.19.09 2.4-.6 3.09-1.64z' />
                      </svg>
                    </div>
                    <div className='text-xs font-medium text-muted-foreground'>{t('common.macos')}</div>
                    <div className='text-[10px] mt-0.5 text-amber-600'>.dmg {t('common.download')}</div>
                  </a>
                ) : (
                  <div className='flex-1 py-2.5 px-2 rounded-xl text-center border bg-muted/30'>
                    <div className='flex justify-center mb-1'>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' className='text-muted-foreground'>
                        <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.05.05-2.31.72-3.06 1.64-.67.81-1.26 2.11-1.1 3.11 1.19.09 2.4-.6 3.09-1.64z' />
                      </svg>
                    </div>
                    <div className='text-xs font-medium text-muted-foreground'>{t('common.macos')}</div>
                    <div className='text-[10px] mt-0.5 text-muted-foreground/60'>{t('common.notPublished')}</div>
                  </div>
                )}

                {/* Linux */}
                {downloads.linux ? (
                  <a
                    href={downloads.linux}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 transition-colors border-amber-200 dark:border-amber-800'
                  >
                    <div className='flex justify-center mb-1'>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' className='text-amber-600'>
                        <path d='M12.5 2c-2.5 0-3.5.5-4.2 1.5-.7 1-1.3 2.5-1.3 4.5 0 1.5.3 2.5.8 3.2.5.7 1.2 1 2 1.2-.5.3-1 .8-1.3 1.5-.3.7-.5 1.5-.5 2.5 0 1.5.5 2.5 1.3 3.2.8.7 1.8 1 3 1s2.2-.3 3-1c.8-.7 1.3-1.7 1.3-3.2 0-1-.2-1.8-.5-2.5-.3-.7-.8-1.2-1.3-1.5.8-.2 1.5-.5 2-1.2.5-.7.8-1.7.8-3.2 0-2-.6-3.5-1.3-4.5-.7-1-1.7-1.5-4.2-1.5z' />
                      </svg>
                    </div>
                    <div className='text-xs font-semibold text-amber-600'>{t('common.linux')}</div>
                    <div className='text-[10px] mt-0.5 text-muted-foreground'>.deb / AppImage</div>
                  </a>
                ) : (
                  <div className='flex-1 py-2.5 px-2 rounded-xl text-center border bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'>
                    <div className='flex justify-center mb-1'>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' className='text-amber-600'>
                        <path d='M12.5 2c-2.5 0-3.5.5-4.2 1.5-.7 1-1.3 2.5-1.3 4.5 0 1.5.3 2.5.8 3.2.5.7 1.2 1 2 1.2-.5.3-1 .8-1.3 1.5-.3.7-.5 1.5-.5 2.5 0 1.5.5 2.5 1.3 3.2.8.7 1.8 1 3 1s2.2-.3 3-1c.8-.7 1.3-1.7 1.3-3.2 0-1-.2-1.8-.5-2.5-.3-.7-.8-1.2-1.3-1.5.8-.2 1.5-.5 2-1.2.5-.7.8-1.7.8-3.2 0-2-.6-3.5-1.3-4.5-.7-1-1.7-1.5-4.2-1.5z' />
                      </svg>
                    </div>
                    <div className='text-xs font-semibold text-amber-600'>{t('common.linux')}</div>
                    <div className='text-[10px] mt-0.5 text-muted-foreground/60'>{t('common.notPublished')}</div>
                  </div>
                )}

                {/* Windows */}
                {downloads.windows ? (
                  <a
                    href={downloads.windows}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex-1 py-2.5 px-2 rounded-xl text-center block no-underline border bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 transition-colors border-blue-200 dark:border-blue-800'
                  >
                    <div className='flex justify-center mb-1'>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' className='text-blue-600'>
                        <path d='M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13zM5.5 5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-13z' />
                        <path d='M10 8h4v4h-4zM8 10h4v4H8zM14 10h4v4h-4zM10 14h4v4h-4z' />
                      </svg>
                    </div>
                    <div className='text-xs font-semibold text-blue-600'>{t('common.windows')}</div>
                    <div className='text-[10px] mt-0.5 text-muted-foreground'>.exe {t('common.install')}</div>
                  </a>
                ) : (
                  <div className='flex-1 py-2.5 px-2 rounded-xl text-center border bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'>
                    <div className='flex justify-center mb-1'>
                      <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' className='text-blue-600'>
                        <path d='M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13zM5.5 5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-13z' />
                        <path d='M10 8h4v4h-4zM8 10h4v4H8zM14 10h4v4h-4zM10 14h4v4h-4z' />
                      </svg>
                    </div>
                    <div className='text-xs font-semibold text-blue-600'>{t('common.windows')}</div>
                    <div className='text-[10px] mt-0.5 text-muted-foreground/60'>{t('common.notPublished')}</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className='px-8 text-center text-sm text-muted-foreground'>
              {t('signIn.agree')}{' '}
              <a
                href='/terms'
                className='underline underline-offset-4 hover:text-primary'
              >
                {t('signIn.terms')}
              </a>{' '}
              and{' '}
              <a
                href='/privacy'
                className='underline underline-offset-4 hover:text-primary'
              >
                {t('signIn.privacy')}
              </a>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

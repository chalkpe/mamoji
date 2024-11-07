import { json, ActionFunctionArgs, MetaFunction } from '@remix-run/node'
import { Form, redirect, useActionData, useNavigation } from '@remix-run/react'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { prisma } from '~/db.server'
import { isMastodon } from '~/lib/mastodon'

export const meta: MetaFunction = () => {
  return [{ title: 'New Remix App' }, { name: 'description', content: 'Welcome to Remix!' }]
}

export default function Index() {
  const navigation = useNavigation()
  const actionData = useActionData<typeof action>()

  return (
    <>
      <h1 className="text-xl">서버 접속</h1>
      <Form className="flex flex-row gap-2 self-stretch" method="post">
        <Input type="text" name="url" placeholder="서버 주소" required />

        {navigation.state === 'submitting' ? (
          <Button disabled>
            <Loader2 className="animate-spin" />
          </Button>
        ) : (
          <Button type="submit">
            <LogIn />
          </Button>
        )}
      </Form>
      {actionData?.error && (
        <Alert>
          <AlertCircle />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}
    </>
  )
}

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData()
  const url = body.get('url')

  if (typeof url !== 'string') {
    return json({ error: '서버 주소를 입력해주세요.' }, { status: 400 })
  }

  const { error, name } = await isMastodon(url)
  if (error || !name) {
    return json({ error }, { status: 400 })
  }
    
  await prisma.server.upsert({
    where: { url },
    create: { url, name },
    update: { name },
  })
    
  return redirect(`/servers/${url}`)
}

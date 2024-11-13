import { MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'
import { Button } from '~/components/ui/button'

export const meta: MetaFunction = () => {
  return [{ title: 'New Remix App' }, { name: 'description', content: 'Welcome to Remix!' }]
}

export default function Index() {

  return (
    <Link to="/servers">
      <Button>서버 관리</Button>
    </Link>
  )
}

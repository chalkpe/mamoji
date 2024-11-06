import { useAtom } from 'jotai'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar'
import { serversAtom } from '~/store/servers'
import { NavLink, useNavigate } from '@remix-run/react'
import { Home, Loader2, Server, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { useState } from 'react'

export default function AppSidebar() {
  const navigate = useNavigate()
  const [servers, setServers] = useAtom(serversAtom)
  const [targetServer, setTargetServer] = useState<string>()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavLink to="/">
              {({ isActive }) => (
                <SidebarMenuButton isActive={isActive}>
                  <Home /> 홈
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>서버</SidebarGroupLabel>
          <SidebarGroupContent>
            {servers.map((server) => (
              <SidebarMenu key={server}>
                <SidebarMenuItem>
                  <NavLink to={`/servers/${server}`}>
                    {({ isActive, isPending }) => (
                      <SidebarMenuButton isActive={isActive}>
                        <Server />
                        <span>{server}</span>
                        {isPending ? (
                          <Loader2 className="ml-auto animate-spin" />
                        ) : (
                          <Trash2
                            className="ml-auto"
                            onClick={(event) => {
                              event.preventDefault()
                              setTargetServer(server)
                            }}
                          />
                        )}
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              </SidebarMenu>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <AlertDialog open={targetServer !== undefined} onOpenChange={() => setTargetServer(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{targetServer} 서버를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>관련 데이터가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTargetServer(undefined)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setServers((prev) => prev.filter((s) => s !== targetServer))
                setTargetServer(undefined)
                navigate('/')
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  )
}

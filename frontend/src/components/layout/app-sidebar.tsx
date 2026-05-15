import { useLayout } from '../../context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '../../components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'
import { useAuth } from '../../context/AuthContext'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { userName, userEmail } = useAuth()
  const realUser = {
    name: userName || '用户',
    email: userEmail || '',
    avatar: '/avatars/default.jpg',
  }
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={realUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

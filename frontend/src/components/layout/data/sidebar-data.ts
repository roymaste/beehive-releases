import {
  Activity,
  BarChart3,
  Bot,
  Cpu,
  CreditCard,
  FileEdit,
  Gift,
  Globe,
  Group,
  LayoutDashboard,
  MonitorSmartphone,
  Settings,
  Share2,
  Users,
  Webhook,
} from "lucide-react"
import { type SidebarData } from "../types"

export const sidebarData: SidebarData = {
  teams: [{ name: "蜂巢智能体", logo: Bot, plan: "Enterprise" }],
  navGroups: [
    {
      title: "管理",
      items: [
        { title: "仪表盘", url: "/", icon: LayoutDashboard },
        { title: "环境管理", url: "/profiles", icon: MonitorSmartphone },
        { title: "代理管理", url: "/proxies", icon: Globe },
        { title: "执行器", url: "/executors", icon: Cpu },
        { title: "账号列表", url: "/accounts", icon: Users },
      ],
    },
    {
      title: "运营",
      items: [
        { title: "AI工作流", url: "/ai-workflow", icon: FileEdit },
        { title: "自动化任务", url: "/automations", icon: Share2 },
        { title: "数据看板", url: "/analytics", icon: BarChart3 },
        { title: "监控", url: "/monitor", icon: Activity },
      ],
    },
    {
      title: "系统",
      items: [
        { title: "团队管理", url: "/team", icon: Group },
        { title: "系统设置", url: "/system", icon: Settings },
        { title: "会员订阅", url: "/billing", icon: CreditCard },
        { title: "通知管理", url: "/webhooks", icon: Webhook },
        { title: "推广返利", url: "/referrals", icon: Gift },
      ],
    },
  ],
}

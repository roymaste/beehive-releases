import {
  LayoutDashboard,
  Users,
  Settings,
  Share2,
  BarChart3,
  Zap,
  CreditCard,
  HelpCircle,
  Bot,
  FileEdit,
  Webhook,
  Gift,
} from "lucide-react"
import { type SidebarData } from "../types"

export const sidebarData: SidebarData = {
  teams: [{ name: "蜂巢智能体", logo: Bot, plan: "Enterprise" }],
  navGroups: [
    {
      title: "工作台",
      items: [
        { title: "仪表盘", url: "/", icon: LayoutDashboard },
      ],
    },
    {
      title: "账号管理",
      items: [
        { title: "账号列表", url: "/accounts", icon: Users },
      ],
    },
    {
      title: "内容运营",
      items: [
        { title: "AI工作流", url: "/ai-workflow", icon: FileEdit },
        { title: "定时任务", url: "/automations", icon: Share2 },
      ],
    },
    {
      title: "数据中心",
      items: [
        { title: "数据看板", url: "/analytics", icon: BarChart3 },
        { title: "监控", url: "/monitor", icon: HelpCircle },
      ],
    },
    {
      title: "自动运营",
      items: [
        { title: "智能互动", url: "/agent/auto-reply", icon: Zap },
      ],
    },
    {
      title: "设置",
      items: [
        { title: "系统设置", url: "/system", icon: Settings },
        { title: "会员订阅", url: "/billing", icon: CreditCard },
        { title: "通知管理", url: "/webhooks", icon: Webhook },
        { title: "推广返利", url: "/referrals", icon: Gift },
      ],
    },
  ],
}

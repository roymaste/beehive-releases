import {
  LayoutDashboard,
  Users,
  Settings,
  Globe,
  Share2,
  Timer,
  Zap,
  BarChart3,
  CreditCard,
  HelpCircle,
  Shield,
  Bot,
  Workflow,
  List,
  Repeat,
  ClipboardList,
  KeyRound,
} from "lucide-react"
import { type SidebarData } from "../types"

export const sidebarData: SidebarData = {
  user: { name: "管理员", email: "admin@hiveagent.com", avatar: "/avatars/default.jpg" },
  teams: [{ name: "蜂巢智能体", logo: Bot, plan: "Enterprise" }],
  navGroups: [
    {
      title: "概览",
      items: [
        { title: "Agent对话", url: "/", icon: Bot },
        { title: "仪表盘", url: "/dashboard", icon: LayoutDashboard },
        { title: "数据看板", url: "/analytics", icon: BarChart3 },
      ],
    },
    {
      title: "AI智能体",
      items: [
        { title: "Agent对话", url: "/agent/console", icon: Bot },
        { title: "Agent管理", url: "/agent/management", icon: List },
        { title: "智能互动", url: "/agent/auto-reply", icon: Repeat },
        { title: "Agent日志", url: "/agent/logs", icon: ClipboardList },
      ],
    },
    {
      title: "运营管理",
      items: [
        { title: "账号管理", url: "/accounts", icon: Users },
        { title: "网络出口", url: "/proxies", icon: Globe },
        { title: "内容管道", url: "/workflows", icon: Workflow },
        { title: "定时任务", url: "/schedules", icon: Timer },
        { title: "智能互动", url: "/auto-engage", icon: Zap },
      ],
    },
    {
      title: "内容管理",
      items: [
        { title: "内容发布", url: "/publish", icon: Share2 },
      ],
    },
    {
      title: "系统",
      items: [
        { title: "会员订阅", url: "/subscription", icon: CreditCard },
        { title: "安全设置", url: "/security", icon: Shield },
        { title: "系统设置", url: "/settings", icon: Settings },
        { title: "模型API", url: "/admin/model-keys", icon: KeyRound },
        { title: "帮助中心", url: "/help", icon: HelpCircle },
      ],
    },
  ],
}

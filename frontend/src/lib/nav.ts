import {
  BarChart3,
  Box,
  Code,
  Folder,
  Layers,
  MessageCircle,
  PieChart,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the topbar under the page title. */
  blurb: string;
  /** Members of the collapsible "OptiAI tools" group in the sidebar. */
  tool?: boolean;
}

/**
 * Sidebar order is deliberate: Chat and Projects are where work happens and
 * stay at the top level. The four read-and-configure tabs fold into the
 * "OptiAI tools" group so the rail opens short, and Providers / Connect /
 * Settings tail it as the plumbing.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/chat",
    label: "Chat",
    icon: MessageCircle,
    blurb: "Talk to your configured models",
  },
  {
    href: "/projects",
    label: "Projects",
    icon: Folder,
    blurb: "Persistent workspaces that carry context across chats",
  },
  {
    href: "/models",
    label: "Models",
    icon: Box,
    blurb: "Discover, compare and combine models",
    tool: true,
  },
  {
    href: "/usage",
    label: "Usage",
    icon: BarChart3,
    blurb: "Tokens, cost and request history",
    tool: true,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: PieChart,
    blurb: "What your usage means, and how to improve it",
    tool: true,
  },
  {
    href: "/skills",
    label: "Skills",
    icon: Sparkles,
    blurb: "The OptiAI skill and plugin library",
    tool: true,
  },
  {
    href: "/providers",
    label: "Providers",
    icon: Layers,
    blurb: "Connect accounts and control which models are available",
  },
  {
    href: "/connect",
    label: "Connect",
    icon: Code,
    blurb: "Point your CLI tools at OptiAI",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    blurb: "Defaults, appearance and system configuration",
  },
];

export const TOOL_ITEMS = NAV_ITEMS.filter((i) => i.tool);
export const TOP_ITEMS = NAV_ITEMS.filter((i) => !i.tool);

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}

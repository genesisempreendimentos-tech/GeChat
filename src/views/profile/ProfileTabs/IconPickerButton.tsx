import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  User,
  Image as ImageIcon,
  AtSign,
  Quote,
  Sparkles,
  Linkedin,
  Instagram,
  MessageCircle,
  Heart,
  Star,
  Home,
  Settings,
  Mail,
  Phone,
  Camera,
  Music,
  Bookmark,
  Bell,
  Calendar,
  MapPin,
  Briefcase,
  Award,
  Zap,
  Sun,
  Moon,
  Cloud,
  Flower2,
  Coffee,
  Utensils,
  Car,
  Plane,
  Ship,
  Bike,
  Gamepad2,
  Palette,
  Mic,
  Headphones,
  BookOpen,
  FileText,
  Code,
  Terminal,
  Cpu,
  Smartphone,
  Watch,
  Key,
  Lock,
  Shield,
  Flag,
  Trophy,
  Target,
  Compass,
  Navigation,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import type { ProfileFormData } from '../ProfileView';

export const PROFILE_ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'User', Icon: User },
  { name: 'Heart', Icon: Heart },
  { name: 'Star', Icon: Star },
  { name: 'Home', Icon: Home },
  { name: 'Settings', Icon: Settings },
  { name: 'Mail', Icon: Mail },
  { name: 'Phone', Icon: Phone },
  { name: 'Camera', Icon: Camera },
  { name: 'Music', Icon: Music },
  { name: 'Bookmark', Icon: Bookmark },
  { name: 'Bell', Icon: Bell },
  { name: 'Calendar', Icon: Calendar },
  { name: 'MapPin', Icon: MapPin },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'Award', Icon: Award },
  { name: 'Zap', Icon: Zap },
  { name: 'Sun', Icon: Sun },
  { name: 'Moon', Icon: Moon },
  { name: 'Cloud', Icon: Cloud },
  { name: 'Flower2', Icon: Flower2 },
  { name: 'Coffee', Icon: Coffee },
  { name: 'Utensils', Icon: Utensils },
  { name: 'Car', Icon: Car },
  { name: 'Plane', Icon: Plane },
  { name: 'Ship', Icon: Ship },
  { name: 'Bike', Icon: Bike },
  { name: 'Gamepad2', Icon: Gamepad2 },
  { name: 'Palette', Icon: Palette },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'Mic', Icon: Mic },
  { name: 'Headphones', Icon: Headphones },
  { name: 'BookOpen', Icon: BookOpen },
  { name: 'FileText', Icon: FileText },
  { name: 'Code', Icon: Code },
  { name: 'Terminal', Icon: Terminal },
  { name: 'Cpu', Icon: Cpu },
  { name: 'Smartphone', Icon: Smartphone },
  { name: 'Watch', Icon: Watch },
  { name: 'Key', Icon: Key },
  { name: 'Lock', Icon: Lock },
  { name: 'Shield', Icon: Shield },
  { name: 'Flag', Icon: Flag },
  { name: 'Trophy', Icon: Trophy },
  { name: 'Target', Icon: Target },
  { name: 'Compass', Icon: Compass },
  { name: 'Navigation', Icon: Navigation },
  { name: 'Globe', Icon: Globe },
  { name: 'Linkedin', Icon: Linkedin },
  { name: 'Instagram', Icon: Instagram },
  { name: 'MessageCircle', Icon: MessageCircle },
  { name: 'ImageIcon', Icon: ImageIcon },
  { name: 'Quote', Icon: Quote },
  { name: 'AtSign', Icon: AtSign },
];

export const ICON_MAP = Object.fromEntries(PROFILE_ICONS.map(({ name, Icon }) => [name, Icon])) as Record<string, LucideIcon>;

interface IconPickerButtonProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  iconMap: Record<string, LucideIcon>;
  profileIcons: { name: string; Icon: LucideIcon }[];
}

export function IconPickerButton({ formData, setFormData, iconMap, profileIcons }: IconPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = formData.icon ? iconMap[formData.icon] : Sparkles;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-lg border-input"
          aria-label="Escolher ícone"
        >
          {(SelectedIcon && <SelectedIcon className="h-4 w-4" />) || <Sparkles className="h-4 w-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[320px] p-4" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Escolher ícone</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-5 gap-1.5 max-h-[60vh] overflow-y-auto">
          {profileIcons.map(({ name, Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, icon: name }));
                setOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent hover:bg-accent hover:border-input transition-colors"
              title={name}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

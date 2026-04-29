import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Quick-browse chips on the Home tab (search/category resolution matches web CCTV focus). */
export const CCTV_HOME_BROWSE_TILES: {
  label: string;
  icon: MciName;
  iconBg: string;
  iconColor: string;
}[] = [
  { label: 'Wi-Fi CCTV', icon: 'wifi', iconBg: '#1e293b', iconColor: '#f8fafc' },
  { label: 'Power Over Ethernet', icon: 'ethernet', iconBg: '#064e3b', iconColor: '#ecfdf5' },
  { label: 'Smart Security Kits', icon: 'shield-home', iconBg: '#7c2d12', iconColor: '#ffedd5' },
  { label: 'Business Security', icon: 'domain', iconBg: '#eef2ff', iconColor: '#3730a3' },
  { label: 'Farm House Security', icon: 'pine-tree', iconBg: '#ecfccb', iconColor: '#3f6212' },
  { label: 'Hospital Security', icon: 'hospital-building', iconBg: '#e0f2fe', iconColor: '#0369a1' },
  { label: 'House Security', icon: 'home-outline', iconBg: '#fce7f3', iconColor: '#9d174d' },
  { label: 'School Security', icon: 'school-outline', iconBg: '#fef3c7', iconColor: '#b45309' },
  { label: 'Solar cameras', icon: 'white-balance-sunny', iconBg: '#fef9c3', iconColor: '#a16207' },
  { label: '4G outdoor', icon: 'broadcast', iconBg: '#f1f5f9', iconColor: '#0f172a' },
];

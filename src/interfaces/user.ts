export interface UserStats {
  owned: number;
  created: number;
  sold: number;
  totalVolume: string;
  floorValue: string;
}

export interface UserProfile {
  address: string;
  name: string;
  username: string;
  bio: string;
  avatar?: string;
  banner?: string;
  verified: boolean;
  joined: string;
  website?: string;
  twitter?: string;
  discord?: string;
  stats: UserStats;
}
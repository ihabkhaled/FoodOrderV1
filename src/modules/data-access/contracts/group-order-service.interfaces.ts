export interface CustomItemInput {
  name: string;
  description: string;
  category: string;
  unitPrice: number;
}

export interface MemberCustomItemPermissions {
  canCreateCustomItems: boolean;
  canSetCustomItemPrice: boolean;
}

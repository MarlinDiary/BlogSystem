export interface User {
  id: number;
  username: string;
  realName: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
  articleCount: number;
  commentCount: number;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
} 
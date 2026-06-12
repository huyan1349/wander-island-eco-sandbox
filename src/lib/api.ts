// Use Vite proxy in dev mode (relative path), or direct backend URL otherwise.
// The Vite proxy is configured in vite.config.ts to forward /api and /socket.io to localhost:3001.
// In production/preview mode, we connect directly to the backend.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('wander_token', token);
    } else {
      localStorage.removeItem('wander_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('wander_token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  }

  // Auth
  async register(username: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async login(username: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async getMe() {
    return this.request<{ user: any }>('/api/auth/me');
  }

  // Islands
  async getIslands() {
    return this.request<{ islands: any[] }>('/api/islands');
  }

  async getMyIslands() {
    return this.request<{ islands: any[] }>('/api/islands/my');
  }

  async getIsland(id: string) {
    return this.request<{ island: any }>(`/api/islands/${id}`);
  }

  async createIsland(name: string, isPublic: boolean = true, data: any = {}) {
    return this.request<{ island: any }>('/api/islands', {
      method: 'POST',
      body: JSON.stringify({ name, isPublic, data })
    });
  }

  async updateIsland(id: string, updates: { name?: string; isPublic?: boolean; data?: any }) {
    return this.request<{ island: any }>(`/api/islands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteIsland(id: string) {
    return this.request<{ success: boolean }>(`/api/islands/${id}`, {
      method: 'DELETE'
    });
  }

  // Friends
  async getFriends() {
    return this.request<{ friends: any[] }>('/api/friends');
  }

  async getFriendRequests() {
    return this.request<{ incoming: any[]; outgoing: any[] }>('/api/friends/requests');
  }

  async sendFriendRequest(userId: string) {
    return this.request<{ success: boolean }>('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async acceptFriendRequest(userId: string) {
    return this.request<{ success: boolean }>('/api/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async rejectFriendRequest(userId: string) {
    return this.request<{ success: boolean }>('/api/friends/reject', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async removeFriend(userId: string) {
    return this.request<{ success: boolean }>(`/api/friends/${userId}`, {
      method: 'DELETE'
    });
  }

  async searchUsers(query: string) {
    return this.request<{ users: any[] }>(`/api/friends/search/${encodeURIComponent(query)}`);
  }

  // Chat
  async getChatMessages(userId: string, limit: number = 50) {
    return this.request<{ messages: any[] }>(`/api/chat/${userId}?limit=${limit}`);
  }

  async sendMessage(toId: string, content: string) {
    return this.request<{ message: any }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ toId, content })
    });
  }

  async getUnreadCount() {
    return this.request<{ unread: any[] }>('/api/chat/unread/count');
  }

  // AI
  async generateEvent(data: any) {
    return this.request<{ narration: string }>('/api/generate-event', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Profile
  async updateProfile(updates: { username?: string; motto?: string; avatarFile?: File }) {
    const formData = new FormData();
    if (updates.username) formData.append('username', updates.username);
    if (updates.motto !== undefined) formData.append('motto', updates.motto);
    if (updates.avatarFile) formData.append('avatar', updates.avatarFile);

    const headers: Record<string, string> = {};
    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PUT',
      headers,
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    return data as { user: any };
  }

  // Mailbox
  async getMailbox() {
    return this.request<{ mails: any[] }>('/api/mailbox');
  }

  async sendMail(toId: string, subject: string, content: string, giftType?: string) {
    return this.request<{ mail: any }>('/api/mailbox', {
      method: 'POST',
      body: JSON.stringify({ toId, subject, content, giftType })
    });
  }

  async markMailRead(id: string) {
    return this.request<{ success: boolean }>(`/api/mailbox/${id}/read`, { method: 'PUT' });
  }

  async getUnreadMailCount() {
    return this.request<{ count: number }>('/api/mailbox/unread');
  }

  async deleteMail(id: string) {
    return this.request<{ success: boolean }>(`/api/mailbox/${id}`, { method: 'DELETE' });
  }

  // Visitors
  async getVisitors(islandId: string) {
    return this.request<{ visitors: any[]; totalVisitors: number }>(`/api/visitors/${islandId}`);
  }

  async leaveVisitorLog(islandId: string, message: string, rating: number) {
    return this.request<{ visitor: any }>('/api/visitors', {
      method: 'POST',
      body: JSON.stringify({ islandId, message, rating })
    });
  }

  // Bottles
  async throwBottle(content: string, mood: string) {
    return this.request<{ success: boolean; id: string; bottle: any }>('/api/bottles', {
      method: 'POST',
      body: JSON.stringify({ content, mood })
    });
  }

  async fishBottle() {
    return this.request<{ bottle: any | null }>('/api/bottles/fish');
  }

  async replyBottle(id: string, reply: string) {
    return this.request<{ success: boolean }>(`/api/bottles/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply })
    });
  }

  async getSentBottles() {
    return this.request<{ bottles: any[] }>('/api/bottles/sent');
  }

  // Stats
  async getStats() {
    return this.request<{ userCount: number; islandCount: number; onlineCount: number }>('/api/stats');
  }
}

export const api = new ApiClient();
export { API_BASE };

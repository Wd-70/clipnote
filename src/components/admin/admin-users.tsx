'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Search, MoreHorizontal, Pencil, Coins, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminPagination } from './admin-pagination';
import { AdminUserEditDialog } from './admin-user-edit-dialog';
import { AdminPointsDialog } from './admin-points-dialog';
import { AdminDeleteUserDialog } from './admin-delete-user-dialog';

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  image: string;
  points: number;
  role: string;
  createdAt: string;
  projectCount: number;
}

export function AdminUsers() {
  const t = useTranslations('admin');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

  // Dialog states
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [pointsUser, setPointsUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      if (data.data) {
        setUsers(data.data.users);
        setPagination(data.data.pagination);
      }
    } catch {
      toast.error(t('users.updateFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, t]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleEditSave = async (userId: string, data: { name?: string; role?: string }) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
    });
    if (!res.ok) throw new Error();
    toast.success(t('users.updated'));
    fetchUsers();
  };

  const handlePointsSave = async (userId: string, amount: number, reason: string) => {
    const res = await fetch(`/api/admin/users/${userId}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason }),
    });
    if (!res.ok) {
      const data = await res.json();
      if (data.error?.includes('negative')) {
        toast.error(t('points.negativeError'));
      } else {
        toast.error(t('points.failed'));
      }
      throw new Error();
    }
    toast.success(amount > 0 ? t('points.added') : t('points.subtracted'));
    fetchUsers();
  };

  const handleDeleteConfirm = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      if (data.error?.includes('yourself')) {
        toast.error(t('users.cannotDeleteSelf'));
      } else {
        toast.error(t('users.deleteFailed'));
      }
      throw new Error();
    }
    toast.success(t('users.deleted'));
    fetchUsers();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('users.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('users.filterRole')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('users.allRoles')}</SelectItem>
            <SelectItem value="FREE">FREE</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('users.noUsers')}
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.email')}</TableHead>
                  <TableHead>{t('users.name')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead className="text-right">{t('users.points')}</TableHead>
                  <TableHead className="text-right">{t('users.projects')}</TableHead>
                  <TableHead>{t('users.joinedAt')}</TableHead>
                  <TableHead className="w-[50px]">{t('users.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {user.email}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {user.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === 'ADMIN' ? 'destructive' :
                          user.role === 'PRO' ? 'default' :
                          'secondary'
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.points.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.projectCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('users.editUser')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPointsUser(user)}>
                            <Coins className="h-4 w-4 mr-2" />
                            {t('users.editPoints')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteUser(user)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('users.deleteUser')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Dialogs */}
      <AdminUserEditDialog
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        onSave={handleEditSave}
      />
      <AdminPointsDialog
        user={pointsUser}
        open={!!pointsUser}
        onOpenChange={(open) => !open && setPointsUser(null)}
        onSave={handlePointsSave}
      />
      <AdminDeleteUserDialog
        user={deleteUser}
        open={!!deleteUser}
        onOpenChange={(open) => !open && setDeleteUser(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

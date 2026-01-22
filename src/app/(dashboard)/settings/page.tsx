import { Suspense } from "react";
import { User, Bell, Shield, Palette } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function SettingsContent() {
  // TODO: Fetch real user settings from API
  const userEmail = "dev@clipnote.local";
  const userName = "Development User";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">설정</h1>
        <p className="text-muted-foreground mt-2">
          계정 정보와 앱 설정을 관리하세요.
        </p>
      </div>

      <Separator className="my-6" />

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            계정 정보
          </CardTitle>
          <CardDescription>프로필 정보를 수정하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" value={userEmail} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" type="text" defaultValue={userName} placeholder="이름을 입력하세요" />
          </div>
          <Button>프로필 업데이트</Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            알림 설정
          </CardTitle>
          <CardDescription>알림 수신 방법을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">이메일 알림</Label>
              <p className="text-sm text-muted-foreground">
                AI 분석 완료 시 이메일 알림을 받습니다
              </p>
            </div>
            <input type="checkbox" id="email-notifications" defaultChecked className="w-4 h-4" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing">마케팅 수신</Label>
              <p className="text-sm text-muted-foreground">
                새로운 기능 및 이벤트 소식을 받습니다
              </p>
            </div>
            <input type="checkbox" id="marketing" className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            테마 설정
          </CardTitle>
          <CardDescription>앱 테마를 변경하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">다크 모드</Label>
              <p className="text-sm text-muted-foreground">
                어두운 테마로 전환합니다
              </p>
            </div>
            <input type="checkbox" id="dark-mode" className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            개인정보 보호
          </CardTitle>
          <CardDescription>개인정보 및 보안 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">데이터 내보내기</h4>
              <p className="text-sm text-muted-foreground mb-3">
                모든 프로젝트 데이터를 JSON 형식으로 내보냅니다
              </p>
              <Button variant="outline">데이터 내보내기</Button>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 text-red-600 dark:text-red-400">계정 삭제</h4>
              <p className="text-sm text-muted-foreground mb-3">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다
              </p>
              <Button variant="destructive">계정 삭제</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Development Info */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">개발 모드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs text-muted-foreground font-mono">
            <p>사용자 ID: dev-user-id</p>
            <p>이메일: {userEmail}</p>
            <p>환경: Development</p>
            <p>데이터베이스: JSON-DB (.dev-db/)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-96 flex items-center justify-center">설정을 불러오는 중...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

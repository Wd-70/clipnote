import Link from 'next/link';
import { Github, Twitter, Youtube, Scissors } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1 rounded-md">
                <Scissors size={14} />
              </div>
              <span className="font-bold text-lg">ClipNote</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              영상 편집을 더 쉽고 빠르게.<br />
              텍스트로 편집하는 새로운 경험.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
                <span className="sr-only">YouTube</span>
              </Link>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="font-semibold mb-4 text-sm">제품</h3>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#features" className="hover:text-primary transition-colors">기능 소개</Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-primary transition-colors">요금제</Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-primary transition-colors">업데이트</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm">지원</h3>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/docs" className="hover:text-primary transition-colors">문서</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors">문의하기</Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-primary transition-colors">서비스 상태</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-sm">법적 고지</h3>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">이용약관</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">개인정보처리방침</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {currentYear} ClipNote. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <span className="text-red-500">♥</span> in Seoul
          </p>
        </div>
      </div>
    </footer>
  );
}
